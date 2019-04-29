package main

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"google.golang.org/appengine"
)

func main() {
	e := echo.New()

	e.GET("/p/:id", PicturePageHandler)
	e.POST("/api/post", echo.WrapHandler(http.HandlerFunc(PostHandleFunc)))
	e.POST("/api/delete", echo.WrapHandler(http.HandlerFunc(DeleteHandleFunc)))
	e.GET("/api/list", echo.WrapHandler(http.HandlerFunc(ListHandleFunc)))
	e.GET("/api/picture", echo.WrapHandler(http.HandlerFunc(PictureDetailHandleFunc)))

	http.Handle("/", e)

	appengine.Main()
}
