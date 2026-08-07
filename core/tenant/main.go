package main

import (
	"log"

	"tenant/app"
)

func main() {
	err := app.Run()
	if err != nil {
		log.Fatalf("server start failed: %s\n", err)
	}
}
