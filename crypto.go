package main

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/pbkdf2"
)

// GenerateSHA256 keyをSHA256でハッシュ化したhex文字列を返す
func GenerateSHA256(key string) string {
	a := sha256.Sum256([]byte(key))
	return hex.EncodeToString(a[:])
}

// GenerateHash keyをハッシュ化したhex文字列を返す
func GenerateHash(key string) string {
	signatureHashSalt := []byte("ioioioioioioio")
	return hex.EncodeToString(pbkdf2.Key([]byte(key), signatureHashSalt, 1024, 32, sha256.New))
}
