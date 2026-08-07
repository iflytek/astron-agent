package app

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tenant/config"
	"tenant/internal/handler"
	"tenant/tools/generator"

	"github.com/gin-gonic/gin"
)

func Run() error {
	rand.New(rand.NewSource(time.Now().UnixNano()))
	configPath := flag.String("config", "./config/config.toml", "config file path")
	flag.Parse()
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("config load failed: %s\n", err)
		return err
	}
	err = initLog(cfg)
	if err != nil {
		return err
	}
	return runHttpServer(cfg)
}

func runHttpServer(cfg *config.Config) error {
	r := gin.New()
	gin.SetMode(gin.ReleaseMode)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})
	err := handler.InitRouter(r, cfg)
	if err != nil {
		log.Fatalf("init router failed: %s\n", err)
		return err
	}
	srv := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", generator.IP, cfg.Server.Port),
		Handler: r,
	}

	// start server
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server start failed: %s\n", err)
		}
	}()
	log.Printf("HTTP server has been started: %d", cfg.Server.Port)
	//  clean shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("server is shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server shutdown failed: %s\n", err)
	}
	log.Println("server has been gracefully shutdown")
	return nil
}

func initLog(cfg *config.Config) error {
	if len(cfg.Log.LogFile) == 0 {
		cfg.Log.LogFile = "./logs/app.log"
	}
	file, err := os.OpenFile(cfg.Log.LogFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		log.Fatalf("open log file failed: %v", err)
		return err
	}
	log.SetOutput(file)
	log.SetPrefix("[MyApp] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	return nil
}
