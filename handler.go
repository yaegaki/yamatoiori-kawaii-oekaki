package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
	"unicode/utf8"

	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go"
	uuid "github.com/gofrs/uuid"
	"google.golang.org/appengine"
)

func writeError(w http.ResponseWriter, err error) {
	log.Println(err)
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, "Internal Server Error")
}

func writeBadRequest(w http.ResponseWriter) {
	w.WriteHeader(http.StatusBadRequest)
	fmt.Fprintf(w, "Bad Request")
}

// PostHandleFunc 絵を投稿するハンドラ
func PostHandleFunc(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeBadRequest(w)
		return
	}

	f, _, err := r.FormFile("file")
	if err == http.ErrMissingFile {
		writeBadRequest(w)
		return
	}

	tag := r.Form.Get("tag")
	if utf8.RuneCountInString(tag) >= 30 {
		log.Println("too long tag length.")
		writeBadRequest(w)
		return
	}
	answer := r.Form.Get("answer")
	if utf8.RuneCountInString(answer) >= 30 {
		log.Println("too long answer length.")
		writeBadRequest(w)
		return
	}
	author := r.Form.Get("author")
	if utf8.RuneCountInString(author) >= 40 {
		log.Println("too long author length.")
		writeBadRequest(w)
		return
	}
	signature := r.Form.Get("signature")
	if utf8.RuneCountInString(signature) >= 40 {
		log.Println("too long signature length.")
		writeBadRequest(w)
		return
	}
	signatureHash := GenerateHash(signature)

	log.Println(signatureHash)

	ctx := appengine.NewContext(r)

	client, err := storage.NewClient(ctx)
	if err != nil {
		writeError(w, err)
		return
	}

	bucketName := "yamatoiori-kawaii-oekaki.appspot.com"
	name := uuid.Must(uuid.NewV4()).String() + ".png"

	writer := client.Bucket(bucketName).Object(name).NewWriter(ctx)
	writer.ContentType = "image/png"
	if _, err := io.Copy(writer, f); err != nil {
		writeError(w, err)
		return
	}

	if err := writer.Close(); err != nil {
		writeError(w, err)
		return
	}

	conf := &firebase.Config{ProjectID: ProjectID}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		writeError(w, err)
		return
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		writeError(w, err)
		return
	}
	defer fs.Close()

	pic := Picture{
		Name:          name,
		Tag:           tag,
		Answer:        answer,
		Author:        author,
		SignatureHash: signatureHash,
	}
	id, err := RegisterPicture(ctx, fs, pic)
	if err != nil {
		writeError(w, err)
		return
	}

	log.Printf("posted id:%#v", id)
	fmt.Fprintf(w, "{\"id\":\"%s\"}", id)
}

// ListHandleFunc 最新の絵を取得するハンドラ
func ListHandleFunc(w http.ResponseWriter, r *http.Request) {
	ctx := appengine.NewContext(r)

	conf := &firebase.Config{ProjectID: ProjectID}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		writeError(w, err)
		return
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		writeError(w, err)
		return
	}
	defer fs.Close()

	urlQuery := r.URL.Query()

	// タグ
	tag := urlQuery.Get("t")

	// 最後に取得した絵のID
	recentID := urlQuery.Get("r")

	author := urlQuery.Get("a")

	var pics []*Picture

	// 最新100件取得
	if author == "" {
		const count = 100
		pics, err = GetRecentlyPicturesWithCache(ctx, fs, tag, count)
		if err != nil {
			writeError(w, err)
			return
		}

		// recentより以前に更新されたものとrecentをフィルタする
		filtered := make([]*Picture, 0, len(pics))
		// これ以前のものは無視する
		// recentが見つかるまではゼロ値
		endAt := time.Time{}
		for _, pic := range pics {
			if pic.PostedAt.Before(endAt) {
				continue
			}

			if pic.ID == recentID {
				endAt = pic.PostedAt
				continue
			}

			filtered = append(filtered, pic)
		}

		pics = filtered
	} else {
		// Authorによる取得
		pics, err = GetPicturesByAuthor(ctx, fs, author)
		if err != nil {
			writeError(w, err)
			return
		}
	}

	bytes, err := json.Marshal(pics)

	if err != nil {
		writeError(w, err)
		return
	}

	w.Write(bytes)
}

// PictureDetailHandleFunc 絵の情報を取得する
func PictureDetailHandleFunc(w http.ResponseWriter, r *http.Request) {
	ctx := appengine.NewContext(r)

	conf := &firebase.Config{ProjectID: ProjectID}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		writeError(w, err)
		return
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		writeError(w, err)
		return
	}
	defer fs.Close()

	urlQuery := r.URL.Query()
	id := urlQuery.Get("id")

	pic, err := GetPicture(ctx, fs, id)
	var res PictureResponse
	if err != nil {
		log.Println(err)
		// とりあえずnot found
		res = PictureResponse{
			AuthorHash: "",
			Picture:    nil,
		}
	} else {
		res = PictureResponse{
			AuthorHash: GenerateSHA256(pic.Author),
			Picture:    &pic,
		}
	}

	bytes, err := json.Marshal(res)

	if err != nil {
		writeError(w, err)
		return
	}

	w.Write(bytes)
}

// DeleteHandleFunc 投稿した絵を削除するハンドラ
func DeleteHandleFunc(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeBadRequest(w)
		return
	}
	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		writeError(w, err)
		return
	}

	ctx := appengine.NewContext(r)
	conf := &firebase.Config{ProjectID: ProjectID}
	app, err := firebase.NewApp(ctx, conf)
	if err != nil {
		writeError(w, err)
		return
	}

	fs, err := app.Firestore(ctx)
	if err != nil {
		writeError(w, err)
		return
	}
	defer fs.Close()

	id := r.Form.Get("id")
	signature := r.Form.Get("signature")
	signatureHash := GenerateHash(signature)
	pic, err := DeletePicture(ctx, fs, id, signatureHash)
	if err != nil {
		log.Println(err)
		// internal server error の可能性もあるけど面倒なのでbadrequest扱い
		writeBadRequest(w)
		return
	}

	storageClient, err := storage.NewClient(ctx)
	if err != nil {
		writeError(w, err)
		return
	}

	bucketName := "yamatoiori-kawaii-oekaki.appspot.com"
	err = storageClient.Bucket(bucketName).Object(pic.Name).Delete(ctx)
	if err != nil {
		// firestoreから削除できた時点で成功とする
		// cloudstorageから削除できなかった場合はログだけ残しておく
		log.Println(err)
	}

	fmt.Fprintf(w, "{\"result\":\"ok\"}")
}
