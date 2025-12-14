package handlers

import (
	"hermes-carpooling/database"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateReview — создать отзыв после завершения поездки
func CreateReview(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		TripID   int    `json:"tripId" binding:"required"`
		TargetID int    `json:"targetId" binding:"required"`
		Rating   int    `json:"rating" binding:"required,min=1,max=5"`
		Comment  string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, что пользователь участвовал в этой поездке
	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM bookings b
		JOIN trips t ON b.trip_id = t.id
		WHERE b.trip_id = $1 
		  AND (b.passenger_id = $2 OR t.driver_id = $2)
		  AND b.status = 'confirmed'
	`, req.TripID, userID).Scan(&count)

	if err != nil || count == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "You didn't participate in this trip"})
		return
	}

	// Проверяем, что отзыв ещё не оставлен
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM reviews 
		WHERE trip_id = $1 AND author_id = $2 AND target_id = $3
	`, req.TripID, userID, req.TargetID).Scan(&count)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check review"})
		return
	}

	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Review already exists"})
		return
	}

	// Создаём отзыв
	var reviewID int
	err = database.DB.QueryRow(`
		INSERT INTO reviews (trip_id, author_id, target_id, rating, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, req.TripID, userID, req.TargetID, req.Rating, req.Comment).Scan(&reviewID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	// Обновляем рейтинг пользователя
	_, err = database.DB.Exec(`
		UPDATE users SET 
			rating = (SELECT AVG(rating) FROM reviews WHERE target_id = $1),
			reviews_count = (SELECT COUNT(*) FROM reviews WHERE target_id = $1)
		WHERE id = $1
	`, req.TargetID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update rating"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Review created successfully",
		"reviewId": reviewID,
	})
}

// GetUserReviews — получить отзывы о пользователе
func GetUserReviews(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT r.id, r.rating, r.comment, r.created_at,
		       u.full_name as author_name, u.avatar_url,
		       t.from_city, t.to_city, t.trip_date
		FROM reviews r
		JOIN users u ON r.author_id = u.id
		JOIN trips t ON r.trip_id = t.id
		WHERE r.target_id = $1
		ORDER BY r.created_at DESC
	`, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reviews"})
		return
	}
	defer rows.Close()

	var reviews []gin.H
	for rows.Next() {
		var (
			id         int
			rating     int
			comment    string
			createdAt  time.Time
			authorName string
			avatarURL  *string
			fromCity   string
			toCity     string
			tripDate   time.Time
		)

		err := rows.Scan(&id, &rating, &comment, &createdAt,
			&authorName, &avatarURL, &fromCity, &toCity, &tripDate)
		if err != nil {
			continue
		}

		avatar := ""
		if avatarURL != nil {
			avatar = *avatarURL
		}

		reviews = append(reviews, gin.H{
			"id":         id,
			"rating":     rating,
			"comment":    comment,
			"createdAt":  createdAt,
			"authorName": authorName,
			"avatar":     avatar,
			"fromCity":   fromCity,
			"toCity":     toCity,
			"tripDate":   tripDate.Format("2006-01-02"),
		})
	}

	c.JSON(http.StatusOK, reviews)
}

// GetMyReviews — получить отзывы о текущем пользователе
func GetMyReviews(c *gin.Context) {
	userID, _ := c.Get("userID")
	c.Param("id")
	
	rows, err := database.DB.Query(`
		SELECT r.id, r.rating, r.comment, r.created_at,
		       u.full_name as author_name, u.avatar_url,
		       t.from_city, t.to_city, t.trip_date
		FROM reviews r
		JOIN users u ON r.author_id = u.id
		JOIN trips t ON r.trip_id = t.id
		WHERE r.target_id = $1
		ORDER BY r.created_at DESC
	`, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reviews"})
		return
	}
	defer rows.Close()

	var reviews []gin.H
	for rows.Next() {
		var (
			id         int
			rating     int
			comment    string
			createdAt  time.Time
			authorName string
			avatarURL  *string
			fromCity   string
			toCity     string
			tripDate   time.Time
		)

		err := rows.Scan(&id, &rating, &comment, &createdAt,
			&authorName, &avatarURL, &fromCity, &toCity, &tripDate)
		if err != nil {
			continue
		}

		avatar := ""
		if avatarURL != nil {
			avatar = *avatarURL
		}

		reviews = append(reviews, gin.H{
			"id":         id,
			"rating":     rating,
			"comment":    comment,
			"createdAt":  createdAt,
			"authorName": authorName,
			"avatar":     avatar,
			"fromCity":   fromCity,
			"toCity":     toCity,
			"tripDate":   tripDate.Format("2006-01-02"),
		})
	}

	c.JSON(http.StatusOK, reviews)
}
