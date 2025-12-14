package handlers

import (
	"database/sql"
	"hermes-carpooling/database"
	"hermes-carpooling/models"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)


// CreateBooking создает новое бронирование со статусом pending
func CreateBooking(c *gin.Context) {
	userID, _ := c.Get("userID")

	var bookingReq models.BookingCreate
	if err := c.ShouldBindJSON(&bookingReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем доступность мест и цену поездки
	var availableSeats int
	var price int
	err := database.DB.QueryRow(`
		SELECT available_seats, price 
		FROM trips 
		WHERE id = $1 AND status = 'active'
	`, bookingReq.TripID).Scan(&availableSeats, &price)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found or not active"})
		return
	}

	if availableSeats < bookingReq.SeatsBooked {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not enough available seats"})
		return
	}

	totalPrice := price * bookingReq.SeatsBooked

	// Создаем бронирование со статусом pending (ожидает подтверждения водителя)
	var bookingID int
	err = database.DB.QueryRow(`
		INSERT INTO bookings (trip_id, passenger_id, seats_booked, total_price, status)
		VALUES ($1, $2, $3, $4, 'pending')
		RETURNING id
	`, bookingReq.TripID, userID, bookingReq.SeatsBooked, totalPrice).Scan(&bookingID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booking"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Booking created successfully",
		"bookingId":  bookingID,
		"totalPrice": totalPrice,
		"status":     "pending",
	})
}

// GetMyBookings получает список бронирований пользователя (для пассажиров)
func GetMyBookings(c *gin.Context) {
	userID, _ := c.Get("userID")

	rows, err := database.DB.Query(`
		SELECT b.id, b.trip_id, b.seats_booked, b.total_price, b.status, b.created_at,
			   t.from_city, t.to_city, t.trip_date, t.trip_time,
			   u.full_name as driver_name
		FROM bookings b
		JOIN trips t ON b.trip_id = t.id
		JOIN users u ON t.driver_id = u.id
		WHERE b.passenger_id = $1
		ORDER BY b.created_at DESC
	`, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get bookings"})
		return
	}
	defer rows.Close()

	var bookings []gin.H
	for rows.Next() {
		var (
			id          int
			tripID      int
			seatsBooked int
			totalPrice  int
			status      string
			createdAt   time.Time
			fromCity    string
			toCity      string
			tripDate    time.Time
			tripTime    string
			driverName  string
		)

		err := rows.Scan(&id, &tripID, &seatsBooked, &totalPrice, &status, &createdAt,
			&fromCity, &toCity, &tripDate, &tripTime, &driverName)
		if err != nil {
			continue
		}

		bookings = append(bookings, gin.H{
			"id":          id,
			"tripId":      tripID,
			"seatsBooked": seatsBooked,
			"totalPrice":  totalPrice,
			"status":      status,
			"createdAt":   createdAt,
			"fromCity":    fromCity,
			"toCity":      toCity,
			"tripDate":    tripDate.Format("2006-01-02"),
			"tripTime":    tripTime,
			"driverName":  driverName,
		})
	}

	c.JSON(http.StatusOK, bookings)
}

// GetDriverBookings — получить заявки на бронирование по поездкам водителя
func GetDriverBookings(c *gin.Context) {
	userID, _ := c.Get("userID")

	rows, err := database.DB.Query(`
		SELECT b.id, b.trip_id, b.seats_booked, b.total_price, b.status, b.created_at,
		       t.from_city, t.to_city, t.trip_date, t.trip_time,
		       u.full_name as passenger_name, u.phone as passenger_phone
		FROM bookings b
		JOIN trips t ON b.trip_id = t.id
		JOIN users u ON b.passenger_id = u.id
		WHERE t.driver_id = $1
		ORDER BY 
			CASE b.status 
				WHEN 'pending' THEN 1 
				WHEN 'confirmed' THEN 2 
				ELSE 3 
			END,
			b.created_at DESC
	`, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get bookings"})
		return
	}
	defer rows.Close()

	var bookings []gin.H
	for rows.Next() {
		var (
			id             int
			tripID         int
			seatsBooked    int
			totalPrice     int
			status         string
			createdAt      time.Time
			fromCity       string
			toCity         string
			tripDate       time.Time
			tripTime       string
			passengerName  string
			passengerPhone string
		)

		err := rows.Scan(&id, &tripID, &seatsBooked, &totalPrice, &status, &createdAt,
			&fromCity, &toCity, &tripDate, &tripTime, &passengerName, &passengerPhone)
		if err != nil {
			continue
		}

		bookings = append(bookings, gin.H{
			"id":             id,
			"tripId":         tripID,
			"seatsBooked":    seatsBooked,
			"totalPrice":     totalPrice,
			"status":         status,
			"createdAt":      createdAt,
			"fromCity":       fromCity,
			"toCity":         toCity,
			"tripDate":       tripDate.Format("2006-01-02"),
			"tripTime":       tripTime,
			"passengerName":  passengerName,
			"passengerPhone": passengerPhone,
		})
	}

	c.JSON(http.StatusOK, bookings)
}

// UpdateBookingStatus — подтвердить или отклонить бронирование
func UpdateBookingStatus(c *gin.Context) {
	userID, _ := c.Get("userID")
	bookingID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=confirmed cancelled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем, что водитель владеет этой поездкой
	var driverID int
	var tripID int
	var seatsBooked int
	var currentStatus string
	err := database.DB.QueryRow(`
		SELECT t.driver_id, b.trip_id, b.seats_booked, b.status
		FROM bookings b
		JOIN trips t ON b.trip_id = t.id
		WHERE b.id = $1
	`, bookingID).Scan(&driverID, &tripID, &seatsBooked, &currentStatus)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	if driverID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not the driver of this trip"})
		return
	}

	// Нельзя изменить уже обработанное бронирование
	if currentStatus != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Booking already processed"})
		return
	}

	// Обновляем статус бронирования
	_, err = database.DB.Exec(`
		UPDATE bookings 
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`, req.Status, bookingID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update booking"})
		return
	}

	// Если подтверждено — уменьшаем available_seats
	if req.Status == "confirmed" {
		_, err = database.DB.Exec(`
			UPDATE trips 
			SET available_seats = available_seats - $1
			WHERE id = $2 AND available_seats >= $1
		`, seatsBooked, tripID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update seats"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Booking status updated",
		"status":  req.Status,
	})
}
// RatePassenger - водитель оценивает пассажира
func RatePassenger(c *gin.Context) {
	bookingID := c.Param("id")
	userID, _ := c.Get("userID")

	var input struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Проверяем, что текущий пользователь - водитель этой поездки
	var driverID int
	var passengerID int
	var tripID int
	var bookingStatus string
	
	err := database.DB.QueryRow(`
		SELECT b.passenger_id, t.driver_id, b.trip_id, b.status
		FROM bookings b
		JOIN trips t ON b.trip_id = t.id
		WHERE b.id = $1
	`, bookingID).Scan(&passengerID, &driverID, &tripID, &bookingStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get booking"})
		}
		return
	}

	if driverID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not the driver of this trip"})
		return
	}

	if bookingStatus != "confirmed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only rate confirmed bookings"})
		return
	}

	// Проверяем, не оценивали ли уже этого пассажира
	var existingReview int
	err = database.DB.QueryRow(`
		SELECT COUNT(*) FROM reviews 
		WHERE trip_id = $1 AND author_id = $2 AND target_id = $3
	`, tripID, userID.(int), passengerID).Scan(&existingReview)

	if err == nil && existingReview > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You have already rated this passenger"})
		return
	}

	// Создаём отзыв
	var reviewID int
	err = database.DB.QueryRow(`
		INSERT INTO reviews (trip_id, author_id, target_id, rating, comment, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id
	`, tripID, userID.(int), passengerID, input.Rating, input.Comment).Scan(&reviewID)

	if err != nil {
		log.Println("❌ Ошибка создания отзыва:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	// Обновляем рейтинг пассажира
	_, err = database.DB.Exec(`
		UPDATE users SET 
			rating = (SELECT AVG(rating) FROM reviews WHERE target_id = $1),
			reviews_count = (SELECT COUNT(*) FROM reviews WHERE target_id = $1)
		WHERE id = $1
	`, passengerID)

	if err != nil {
		log.Println("⚠️ Предупреждение: не удалось обновить рейтинг пассажира:", err)
	}

	log.Println("✅ Пассажир оценён:", passengerID)
	c.JSON(http.StatusOK, gin.H{
		"message": "Passenger rated successfully",
		"reviewId": reviewID,
	})
}
