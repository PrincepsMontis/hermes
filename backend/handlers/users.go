package handlers

import (
    "net/http"
    
    "hermes-carpooling/database"
    "hermes-carpooling/models"
    
    "github.com/gin-gonic/gin"
)

func GetProfile(c *gin.Context) {
    userID := c.GetInt("userID")
    
    var user models.User
    err := database.DB.QueryRow(`
        SELECT id, full_name, email, phone, role, avatar_url, rating, reviews_count,
               car_brand, car_model, car_year, car_color, car_number,
               created_at, updated_at
        FROM users WHERE id = $1
    `, userID).Scan(
        &user.ID, &user.FullName, &user.Email, &user.Phone, &user.Role, &user.AvatarURL,
        &user.Rating, &user.ReviewsCount, &user.CarBrand, &user.CarModel, &user.CarYear,
        &user.CarColor, &user.CarNumber, &user.CreatedAt, &user.UpdatedAt,
    )
    
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }
    
    c.JSON(http.StatusOK, user)
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
            car_year = $5, car_color = $6, car_number = $7
        WHERE id = $8
    `, updateData.FullName, updateData.Phone, updateData.CarBrand, updateData.CarModel,
       updateData.CarYear, updateData.CarColor, updateData.CarNumber, userID)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}