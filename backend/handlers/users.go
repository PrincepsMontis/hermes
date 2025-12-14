package handlers

import (
    "fmt"
    "net/http"
    "path/filepath"
    "time"
    
    "hermes-carpooling/database"
    "hermes-carpooling/models"
    
    "github.com/gin-gonic/gin"
)

func GetProfile(c *gin.Context) {
    userID := c.GetInt("userID")
    
    var user models.User
    var avatarURL string
    
    err := database.DB.QueryRow(`
        SELECT id, full_name, email, phone, role, COALESCE(avatar_url, ''), rating, reviews_count,
               COALESCE(car_brand, ''), COALESCE(car_model, ''), COALESCE(car_year, 0), 
               COALESCE(car_color, ''), COALESCE(car_number, ''),
               created_at, updated_at
        FROM users WHERE id = $1
    `, userID).Scan(
        &user.ID, &user.FullName, &user.Email, &user.Phone, &user.Role, &avatarURL,
        &user.Rating, &user.ReviewsCount, &user.CarBrand, &user.CarModel, &user.CarYear,
        &user.CarColor, &user.CarNumber, &user.CreatedAt, &user.UpdatedAt,
    )
    
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }
    
    // ДОБАВЛЯЕМ TIMESTAMP К АВАТАРКЕ ДЛЯ ОЧИСТКИ КЭША
    if avatarURL != "" {
        avatarURL = fmt.Sprintf("%s?t=%d", avatarURL, time.Now().Unix())
    }
    
    // Возвращаем JSON с обновлённой аватаркой
    c.JSON(http.StatusOK, gin.H{
        "id":           user.ID,
        "fullName":     user.FullName,
        "email":        user.Email,
        "phone":        user.Phone,
        "role":         user.Role,
        "avatarUrl":    avatarURL,
        "rating":       user.Rating,
        "reviewsCount": user.ReviewsCount,
        "carBrand":     user.CarBrand,
        "carModel":     user.CarModel,
        "carYear":      user.CarYear,
        "carColor":     user.CarColor,
        "carNumber":    user.CarNumber,
        "isVerified":   false,
        "createdAt":    user.CreatedAt,
        "updatedAt":    user.UpdatedAt,
    })
}

func UpdateProfile(c *gin.Context) {
    userID := c.GetInt("userID")
    
    var updateData struct {
        FullName  string  `json:"fullName"`
        Phone     string  `json:"phone"`
        CarBrand  *string `json:"carBrand"`
        CarModel  *string `json:"carModel"`
        CarYear   *int    `json:"carYear"`
        CarColor  *string `json:"carColor"`
        CarNumber *string `json:"carNumber"`
    }
    
    if err := c.ShouldBindJSON(&updateData); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    _, err := database.DB.Exec(`
        UPDATE users 
        SET full_name = $1, phone = $2, car_brand = $3, car_model = $4, 
            car_year = $5, car_color = $6, car_number = $7, updated_at = NOW()
        WHERE id = $8
    `, updateData.FullName, updateData.Phone, updateData.CarBrand, updateData.CarModel,
       updateData.CarYear, updateData.CarColor, updateData.CarNumber, userID)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}
// Загрузка аватарки
func UploadAvatar(c *gin.Context) {
    userID := c.GetInt("userID")
    
    file, err := c.FormFile("avatar")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
        return
    }
    
    // Проверяем размер (макс 5MB)
    if file.Size > 5*1024*1024 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 5MB)"})
        return
    }
    
    // Генерируем уникальное имя файла
    ext := filepath.Ext(file.Filename)
    filename := fmt.Sprintf("avatar_%d_%d%s", userID, time.Now().Unix(), ext)
    savePath := filepath.Join("uploads", "avatars", filename)
    
    // Сохраняем файл
    if err := c.SaveUploadedFile(file, savePath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
        return
    }
    
    // Обновляем БД
    avatarURL := fmt.Sprintf("/uploads/avatars/%s", filename)
    _, err = database.DB.Exec(`UPDATE users SET avatar_url = $1 WHERE id = $2`, avatarURL, userID)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "message": "Avatar uploaded successfully",
        "avatarUrl": avatarURL,
    })
}