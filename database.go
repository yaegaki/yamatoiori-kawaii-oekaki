package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/appengine/memcache"
)

const pictureCollectionName = "Pictures"

type tagCacheEntry struct {
	Time     time.Time
	Pictures []*Picture
}

type tagCacheKeys struct {
	// 新しいデータが存在するときにセットされるキー
	expireKey string
	// データをいれておくためのキー
	entryKey string
}

// RegisterPicture PictureをFirestoreに保存する
func RegisterPicture(ctx context.Context, client *firestore.Client, pic Picture) (string, error) {
	docRef, _, err := client.Collection(pictureCollectionName).Add(ctx, pic)
	if err != nil {
		return "", err
	}

	expireCache(ctx, pic.Tag)

	return docRef.ID, nil
}

// DeletePicture 削除する
func DeletePicture(ctx context.Context, client *firestore.Client, id string, signatureHash string) (Picture, error) {
	var pic Picture
	docRef := client.Collection(pictureCollectionName).Doc(id)
	doc, err := docRef.Get(ctx)
	if err != nil {
		return pic, err
	}

	err = doc.DataTo(&pic)
	if err != nil {
		return pic, err
	}

	if pic.SignatureHash != signatureHash {
		return pic, errors.New("invalid signatureHash")
	}

	_, err = docRef.Delete(ctx)
	if err != nil {
		return pic, err
	}

	// 削除があった場合はキャッシュをドロップする
	// もったいないけどそんなに頻繁に起こるわけでもないと思う
	cacheKeys := make([]string, 0, 2)
	cacheKeys = append(cacheKeys, getTagCacheKey(pic.Tag).entryKey)
	if pic.Tag != "" {
		cacheKeys = append(cacheKeys, getTagCacheKey("").entryKey)
	}
	memcache.DeleteMulti(ctx, cacheKeys)

	pic.ID = id
	log.Printf("%#v is deleted.", pic.ID)

	return pic, nil
}

func expireCache(ctx context.Context, tag string) {
	// 登録してからキャッシュを削除する
	// 逆順だと投稿がキャッシュにのらない可能性がほんの少しだけ高い
	// 全体のキャッシュとそのタグのキャッシュを削除
	cacheExpireItems := make([]*memcache.Item, 0, 2)
	cacheExpireItems = append(cacheExpireItems, createTagCacheExpireItem(""))
	if tag != "" {
		cacheExpireItems = append(cacheExpireItems, createTagCacheExpireItem(tag))
	}
	memcache.SetMulti(ctx, cacheExpireItems)
}

func createTagCacheExpireItem(tag string) *memcache.Item {
	return &memcache.Item{
		Key: getTagCacheKey(tag).expireKey,
		// データはなんでもよい
		Value: []byte{0},
		// 1日キャッシュしておく(データのキャッシュも1日なので消えても問題ない)
		Expiration: time.Duration(24) * time.Hour,
	}
}

func getTagCacheKey(tag string) tagCacheKeys {
	return tagCacheKeys{
		expireKey: "tag-expire-" + tag,
		entryKey:  "tag-entry-" + tag,
	}
}

// GetRecentlyPicturesWithCache 指定されたタグの最近の絵をcount件取得する
// tagを空文字列にするとすべてのタグから計算する
// キャッシュがあればそれを使用する
// 検索結果はキャッシュされる
func GetRecentlyPicturesWithCache(ctx context.Context, client *firestore.Client, tag string, count int) ([]*Picture, error) {
	cacheKey := getTagCacheKey(tag)

	var pics []*Picture
	cacheExpired := false
	now := time.Now()

	if itemMap, err := memcache.GetMulti(ctx, []string{cacheKey.expireKey, cacheKey.entryKey}); err == nil {
		if entryItem, ok := itemMap[cacheKey.entryKey]; ok {
			var cacheEntry tagCacheEntry
			// アンマーシャルできなかった場合はキャッシュ削除
			if err := json.Unmarshal(entryItem.Value, &cacheEntry); err != nil {
				log.Println(err)
				memcache.Delete(ctx, cacheKey.entryKey)
			} else {
				pics = cacheEntry.Pictures

				if _, ok := itemMap[cacheKey.expireKey]; ok {
					cacheExpired = true
				} else if now.Sub(cacheEntry.Time) >= time.Duration(10)*time.Minute {
					// 十分以上たっている場合は新しいデータ取得
					cacheExpired = true
				}
			}
		}
	}

	// キャッシュが最新ではない
	if pics == nil || cacheExpired {
		var endAt time.Time
		if len(pics) == 0 {
			endAt = time.Time{}
		} else {
			endAt = pics[0].PostedAt
		}

		recentlyPics, err := GetRecentlyPictures(ctx, client, tag, count, endAt)
		if err != nil {
			return nil, err
		}

		existsMap := make(map[string]bool, count)
		resultPics := make([]*Picture, 0, count)
		for _, p := range recentlyPics {
			if len(resultPics) >= count {
				break
			}

			if _, ok := existsMap[p.ID]; ok {
				continue
			}

			existsMap[p.ID] = true
			resultPics = append(resultPics, p)
		}

		for _, p := range pics {
			if len(resultPics) >= count {
				break
			}

			if _, ok := existsMap[p.ID]; ok {
				continue
			}

			existsMap[p.ID] = true
			resultPics = append(resultPics, p)
		}

		pics = resultPics

		cacheEntry := tagCacheEntry{
			Time:     now,
			Pictures: pics,
		}

		bytes, err := json.Marshal(cacheEntry)
		// マーシャルできないのはおかしい
		// この値はキャッシュするときに使用するだけなので無視しても問題ないが、
		// 結局レスポンスするときにもマーシャルするはずなのでエラー扱いにしておく
		if err != nil {
			return nil, err
		}

		item := memcache.Item{
			Key:        cacheKey.entryKey,
			Value:      bytes,
			Expiration: time.Duration(24) * time.Hour,
		}
		memcache.Set(ctx, &item)
		if cacheExpired {
			memcache.Delete(ctx, cacheKey.expireKey)
		}
	}

	return pics, nil
}

// GetRecentlyPictures 指定されたタグの最近のPictureをcount件取得する
// tagを空文字列にするとすべてのタグから計算する
func GetRecentlyPictures(ctx context.Context, client *firestore.Client, tag string, count int, endAt time.Time) ([]*Picture, error) {
	log.Printf("GetRecentlyPictures tag:%#v endAt:%v", tag, endAt)

	q := client.Collection(pictureCollectionName).
		OrderBy("postedAt", firestore.Desc).
		EndAt(endAt).
		Limit(count)

	if tag != "" {
		q = q.Where("tag", "==", tag)
	}

	pics, err := getPictures(ctx, q)
	if err != nil {
		return nil, err
	}

	log.Printf("GetRecentlyPictures read:(%#v)", len(pics))
	return pics, nil
}

// GetPicturesByAuthor 投稿者から絵を検索する
func GetPicturesByAuthor(ctx context.Context, client *firestore.Client, author string) ([]*Picture, error) {
	q := client.Collection(pictureCollectionName).
		Where("author", "==", author).
		OrderBy("postedAt", firestore.Desc).
		Limit(100)

	return getPictures(ctx, q)
}

func getPictures(ctx context.Context, q firestore.Query) ([]*Picture, error) {
	iter := q.Documents(ctx)
	docs, err := iter.GetAll()
	if err != nil {
		return nil, err
	}

	pictures := make([]*Picture, 0, len(docs))
	for _, doc := range docs {
		var pic Picture
		err := doc.DataTo(&pic)
		// 単体のデータでエラーの場合は無視
		if err != nil {
			log.Printf("doc.DataTo Error")
			log.Print(err)
			continue
		}
		pic.ID = doc.Ref.ID

		pictures = append(pictures, &pic)
	}

	return pictures, nil
}

// GetPicture 指定されたIdのPictureを取得する
func GetPicture(ctx context.Context, client *firestore.Client, id string) (Picture, error) {
	doc, err := client.Collection(pictureCollectionName).Doc(id).Get(ctx)
	if err != nil {
		return Picture{}, err
	}

	var pic Picture
	err = doc.DataTo(&pic)
	// 単体のデータでエラーの場合は無視
	if err != nil {
		log.Printf("doc.DataTo Error")
		log.Print(err)
		return Picture{}, err
	}
	pic.ID = id

	return pic, nil
}
