package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"

	firebase "firebase.google.com/go"
	"github.com/labstack/echo/v4"
	"google.golang.org/appengine"
)

const templateStr = `
<!doctype html><html lang="ja"><head><meta charset="utf-8"/><link rel="shortcut icon" href="/favicon.png" type="image/png"/><link rel="apple-touch-icon" sizes="256x256" href="/favicon.png"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,shrink-to-fit=no"/>
<!doctype html><html lang="ja"><head><meta charset="utf-8"/><link rel="shortcut icon" href="/favicon.png" type="image/png"/><link rel="apple-touch-icon" sizes="256x256" href="/favicon.png"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,shrink-to-fit=no"/>
<meta property="og:url" content="{{ .URL }}"/>
<meta property="og:title" content="{{ .Title }}"/>
<meta property="og:description" content="{{ .Description }}"/>
<meta property="og:image" content="{{ .ImageURL }}"/>
<meta property="og:site_name" content="諸説あるお絵描き"/>
<meta property="twitter:card" content="summary_large_image"/>
<meta name="theme-color" content="#f4a6ff"/>
<script>
window.INITIAL_STATE = {{ .InitialStateJSON }};
</script>
<link rel="manifest" href="/manifest.json"/>
<title>諸説あるお絵描き</title><link href="/static/css/main.3c7e3a1e.chunk.css" rel="stylesheet"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root" class="expand-height"></div><script>!function(l){function e(e){for(var r,t,n=e[0],o=e[1],u=e[2],f=0,i=[];f<n.length;f++)t=n[f],p[t]&&i.push(p[t][0]),p[t]=0;for(r in o)Object.prototype.hasOwnProperty.call(o,r)&&(l[r]=o[r]);for(s&&s(e);i.length;)i.shift()();return c.push.apply(c,u||[]),a()}function a(){for(var e,r=0;r<c.length;r++){for(var t=c[r],n=!0,o=1;o<t.length;o++){var u=t[o];0!==p[u]&&(n=!1)}n&&(c.splice(r--,1),e=f(f.s=t[0]))}return e}var t={},p={1:0},c=[];function f(e){if(t[e])return t[e].exports;var r=t[e]={i:e,l:!1,exports:{}};return l[e].call(r.exports,r,r.exports,f),r.l=!0,r.exports}f.m=l,f.c=t,f.d=function(e,r,t){f.o(e,r)||Object.defineProperty(e,r,{enumerable:!0,get:t})},f.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},f.t=function(r,e){if(1&e&&(r=f(r)),8&e)return r;if(4&e&&"object"==typeof r&&r&&r.__esModule)return r;var t=Object.create(null);if(f.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:r}),2&e&&"string"!=typeof r)for(var n in r)f.d(t,n,function(e){return r[e]}.bind(null,n));return t},f.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return f.d(r,"a",r),r},f.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},f.p="/";var r=window.webpackJsonp=window.webpackJsonp||[],n=r.push.bind(r);r.push=e,r=r.slice();for(var o=0;o<r.length;o++)e(r[o]);var s=n;a()}([])</script><script src="/static/js/2.700af4de.chunk.js"></script><script src="/static/js/main.75c198e2.chunk.js"></script></body></html>
`

// PicturePageHandler twitterカードを表示するために/p/だけはhtmlをgo側でレンダーする
func PicturePageHandler(c echo.Context) error {
	id := c.Param("id")
	t, err := template.New("page").Parse(templateStr)
	if err != nil {
		return err
	}

	appEngineCtx := appengine.NewContext(c.Request())

	conf := &firebase.Config{ProjectID: ProjectID}
	app, err := firebase.NewApp(appEngineCtx, conf)
	if err != nil {
		log.Println(err)
		return err
	}

	fs, err := app.Firestore(appEngineCtx)
	if err != nil {
		log.Println(err)
		return err
	}
	defer fs.Close()

	pic, err := GetPicture(appEngineCtx, fs, id)
	var res PictureResponse
	if err != nil {
		log.Println(err)
		// とりあえずnot found
		res = PictureResponse{
			AuthorHash: "",
			ID:         id,
			Picture:    nil,
		}
	} else {
		res = PictureResponse{
			AuthorHash: GenerateSHA256(pic.Author),
			ID:         id,
			Picture:    &pic,
		}
	}

	bytes, err := json.Marshal(res)
	if err != nil {
		log.Println(err)
		return err
	}

	var title string
	if pic.Answer != "" {
		title = fmt.Sprintf("%v|諸説あるお絵描き", pic.Answer)
	} else {
		title = "諸説あるお絵描き"
	}

	data := struct {
		URL              string
		ImageURL         string
		Title            string
		Description      string
		InitialStateJSON template.JS
	}{
		URL:              fmt.Sprintf("https://oekaki.yamatoiori-kawaii.live/p/%s", id),
		ImageURL:         fmt.Sprintf("https://storage.googleapis.com/yamatoiori-kawaii-oekaki.appspot.com/%s", pic.Name),
		Title:            title,
		Description:      "イオリンの絵描き歌用のお絵描き投稿サイトです。PC/スマートフォンから手軽に利用できます。",
		InitialStateJSON: template.JS(bytes),
	}

	w := c.Response()
	if err := t.Execute(w, data); err != nil {
		return err
	}

	return nil
}
