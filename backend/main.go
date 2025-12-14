package main

import (
    "hermes-carpooling/config"
    "hermes-carpooling/database"
    "hermes-carpooling/handlers"
    "hermes-carpooling/middleware"
    "log"
    "os"
    "path/filepath"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
)

func main() {
    // Загрузка .env файла
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    // Загрузка конфигурации
    cfg := config.Load()

    // Инициализация базы данных
    if err := database.Init(cfg); err != nil {
        log.Fatal("Failed to initialize database:", err)
    }
    defer database.Close()

    // Создание роутера
    router := gin.Default()

    // CORS middleware
    router.Use(middleware.CORS())

    // Получаем путь к frontend
    currentDir, err := os.Getwd()
    if err != nil {
        log.Fatal("Failed to get current directory:", err)
    }

    // Путь к frontend (если запускаем из корня проекта)
    frontendPath := filepath.Join(currentDir, "frontend")
    staticPath := filepath.Join(frontendPath, "static")
    publicPath := filepath.Join(frontendPath, "public")
    uploadsPath := filepath.Join(currentDir, "uploads")

    log.Println("📁 Frontend path:", frontendPath)
    log.Println("📁 Static path:", staticPath)
    log.Println("📁 Public path:", publicPath)
    log.Println("📁 Uploads path:", uploadsPath)

    // Создаем папку для загрузок, если её нет
    avatarsPath := filepath.Join(uploadsPath, "avatars")
    if err := os.MkdirAll(avatarsPath, 0755); err != nil {
        log.Println("⚠️ Failed to create avatars folder:", err)
    } else {
        log.Println("✅ Avatars folder ready:", avatarsPath)
    }

    // Проверяем существование папок
    if _, err := os.Stat(staticPath); os.IsNotExist(err) {
        log.Println("⚠️ Static folder not found:", staticPath)
    }
    if _, err := os.Stat(publicPath); os.IsNotExist(err) {
        log.Println("⚠️ Public folder not found:", publicPath)
    }

    // Статические файлы
    router.Static("/static", staticPath)
    router.Static("/css", filepath.Join(staticPath, "css"))
    router.Static("/js", filepath.Join(staticPath, "js"))
    router.Static("/uploads", uploadsPath)  // ДОБАВЛЕНО: раздача загруженных файлов

    // HTML страницы
    router.StaticFile("/", filepath.Join(publicPath, "index.html"))
    router.StaticFile("/index.html", filepath.Join(publicPath, "index.html"))
    router.StaticFile("/login", filepath.Join(publicPath, "login.html"))
    router.StaticFile("/login.html", filepath.Join(publicPath, "login.html"))
    router.StaticFile("/register", filepath.Join(publicPath, "register.html"))
    router.StaticFile("/register.html", filepath.Join(publicPath, "register.html"))
    router.StaticFile("/profile", filepath.Join(publicPath, "profile.html"))
    router.StaticFile("/profile.html", filepath.Join(publicPath, "profile.html"))
    router.StaticFile("/search-trips", filepath.Join(publicPath, "search-trips.html"))
    router.StaticFile("/search-trips.html", filepath.Join(publicPath, "search-trips.html"))
    router.StaticFile("/create-trip", filepath.Join(publicPath, "create-trip.html"))
    router.StaticFile("/create-trip.html", filepath.Join(publicPath, "create-trip.html"))
    router.StaticFile("/trip-details", filepath.Join(publicPath, "trip-details.html"))
    router.StaticFile("/trip-details.html", filepath.Join(publicPath, "trip-details.html"))

    // API маршруты
    api := router.Group("/api/v1")
    {
        // Аутентификация
        auth := api.Group("/auth")
        {
            auth.POST("/register", handlers.Register)
            auth.POST("/login", handlers.Login)
        }

        // Пользователи (требуют авторизации)
        users := api.Group("/users")
        users.Use(middleware.AuthRequired())
        {
            users.GET("/profile", handlers.GetProfile)
            users.PUT("/profile", handlers.UpdateProfile)
            users.POST("/avatar", handlers.UploadAvatar)  // ДОБАВЛЕНО: загрузка аватарки
        }

        // Поездки
        trips := api.Group("/trips")
        {
            trips.GET("/search", handlers.SearchTrips)
            trips.GET("/:id", handlers.GetTrip)
        }

        // Поездки (требуют авторизации)
        tripsAuth := api.Group("/trips")
        tripsAuth.Use(middleware.AuthRequired())
        {
            tripsAuth.POST("", handlers.CreateTrip)
            tripsAuth.GET("/my-trips", handlers.GetMyTrips)
            tripsAuth.PATCH("/:id/cancel", handlers.CancelTrip)
            tripsAuth.PATCH("/:id/complete", handlers.CompleteTrip)
        }

        // Бронирования (требуют авторизации)
        bookings := api.Group("/bookings")
        bookings.Use(middleware.AuthRequired())
        {
            bookings.POST("", handlers.CreateBooking)
            bookings.GET("/my-bookings", handlers.GetMyBookings)
            bookings.GET("/driver", handlers.GetDriverBookings)
            bookings.PATCH("/:id/status", handlers.UpdateBookingStatus)
            bookings.POST("/:id/rate", handlers.RatePassenger)
        }

        // Отзывы (требуют авторизации)
        reviews := api.Group("/reviews")
        reviews.Use(middleware.AuthRequired())
        {
            reviews.POST("", handlers.CreateReview)
            reviews.GET("/user/:id", handlers.GetUserReviews)
            reviews.GET("/my-reviews", handlers.GetMyReviews)
            reviews.GET("/check/:tripId", handlers.CheckExistingReview)
            reviews.PUT("/:id", handlers.UpdateReview)
            reviews.GET("/my-written-reviews", handlers.GetMyWrittenReviews)
        }
    }

    // Исправляем порт
    port := cfg.ServerPort
    if port == "" {
        port = ":8080"
    }
    // Убираем двойные двоеточия
    port = strings.TrimPrefix(port, ":")
    if !strings.HasPrefix(port, ":") {
        port = ":" + port
    }

    log.Println("🚀 Server starting on port", port)
    if err := router.Run(port); err != nil {
        log.Fatal(err)
    }
}
