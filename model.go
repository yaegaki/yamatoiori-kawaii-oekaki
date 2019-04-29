package main

import "time"

// Picture 画像を管理するためのモデル
type Picture struct {
	ID            string    `firestore:"-" json:"id"`
	Name          string    `firestore:"name" json:"name"`
	Tag           string    `firestore:"tag" json:"tag"`
	Answer        string    `firestore:"answer" json:"answer"`
	Author        string    `firestore:"author" json:"-"`
	SignatureHash string    `firestore:"signature" json:"-"`
	PostedAt      time.Time `firestore:"postedAt,serverTimestamp" json:"postedAt"`
}

// PictureResponse Pictureエンドポイントで結果を返すようのモデル
type PictureResponse struct {
	// AuthorをSHA256にかけたもの
	AuthorHash string   `json:"authorHash"`
	ID         string   `json:"id"`
	Picture    *Picture `json:"picture,omitempty"`
}
