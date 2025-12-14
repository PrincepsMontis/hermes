package handlers

import (
    "net/http"
    "time"
    
    "hermes-carpooling/config"
    "hermes-carpooling/database"
    "hermes-carpooling/models"
    
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v4"
)

func Register(c *gin.Context) {
    var userReq models.UserRegister
    
    if err := c.ShouldBindJSON(&userReq); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Хешируем пароль
    if err := userReq.HashPassword(); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
        return
    }
    
    // Определяем роль
    role := "passenger"
    if userReq.IsDriver {
        role = "driver"
    }
    
    // Сохраняем пользователя в БД
    var userID int
    err := database.DB.QueryRow(`
        INSERT INTO users (full_name, email, phone, password_hash, role) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id
    `, userReq.FullName, userReq.Email, userReq.Phone, userReq.Password, role).Scan(&userID)
    
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "User already exists"})
        return
    }
    
    // Генерируем JWT токен
    cfg := config.Load()
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "email":   userReq.Email,
        "role":    role,
        "exp":     time.Now().Add(time.Hour * 24).Unix(),
    })
    
    tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{
        "message": "User registered successfully",
        "token":   tokenString,
        "user": gin.H{
            "id":    userID,
            "name":  userReq.FullName,
            "email": userReq.Email,
            "role":  role,
        },
    })
}

func Login(c *gin.Context) {
    var loginReq models.UserLogin
    
    if err := c.ShouldBindJSON(&loginReq); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Ищем пользователя в БД
    var user models.User
    err := database.DB.QueryRow(`
        SELECT id, full_name, email, password_hash, role, rating, reviews_count 
        FROM users WHERE email = $1
    `, loginReq.Email).Scan(
        &user.ID, &user.FullName, &user.Email, &user.PasswordHash, 
        &user.Role, &user.Rating, &user.ReviewsCount,
    )
    
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
        return
    }
    
    // Проверяем пароль
    if !user.CheckPassword(loginReq.Password) {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
        return
    }
    
    // Генерируем JWT токен
    cfg := config.Load()
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": user.ID,
        "email":   user.Email,
        "role":    user.Role,
        "exp":     time.Now().Add(time.Hour * 24).Unix(),
    })
    
    tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "message": "Login successful",
        "token":   tokenString,
        "user": gin.H{
            "id":           user.ID,
            "name":         user.FullName,
            "email":        user.Email,
            "role":         user.Role,
            "rating":       user.Rating,
            "reviewsCount": user.ReviewsCount,
        },
    })
}