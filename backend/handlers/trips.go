package handlers

import (
	"database/sql"
	"hermes-carpooling/database"
	"hermes-carpooling/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateTrip создает новую поездку
func CreateTrip(c *gin.Context) {
	var req struct {
		FromCity        string `json:"fromCity" binding:"required"`
		ToCity          string `json:"toCity" binding:"required"`
		TripDate        string `json:"tripDate" binding:"required"`
		TripTime        string `json:"tripTime" binding:"required"`
		Seats           int    `json:"seats" binding:"required"`
		Price           int    `json:"price" binding:"required"`
		Description     string `json:"description"`
		NoSmoking       bool   `json:"noSmoking"`
		AnimalsAllowed  bool   `json:"animalsAllowed"`
		MusicAllowed    bool   `json:"musicAllowed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Println("❌ Ошибка валидации:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var userRole string
	err := database.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)
	if err != nil {
		log.Println("❌ Ошибка проверки роли:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify user role"})
		return
	}

	if userRole != "driver" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only drivers can create trips"})
		return
	}

	tripDate, err := time.Parse("2006-01-02", req.TripDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	var tripID int
	err = database.DB.QueryRow(`
		INSERT INTO trips (driver_id, from_city, to_city, trip_date, trip_time, seats, available_seats, 
			price, description, no_smoking, animals_allowed, music_allowed, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, 'active', NOW())
		RETURNING id
	`, userID, req.FromCity, req.ToCity, tripDate, req.TripTime, req.Seats, req.Price,
		req.Description, req.NoSmoking, req.AnimalsAllowed, req.MusicAllowed).Scan(&tripID)

	if err != nil {
		log.Println("❌ Ошибка создания поездки:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trip"})
		return
	}

	log.Println("✅ Поездка создана с ID:", tripID)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Trip created successfully",
		"tripId":  tripID,
	})
}

// SearchTrips ищет поездки по параметрам
func SearchTrips(c *gin.Context) {
	fromCity := c.Query("from")
	toCity := c.Query("to")
	date := c.Query("date")

	log.Printf("🔍 Поиск поездок: from=%s, to=%s, date=%s", fromCity, toCity, date)

	// Базовый запрос
	query := `
		SELECT 
			t.id, t.from_city, t.to_city, t.trip_date, t.trip_time,
			t.seats, t.available_seats, t.price, t.description,
			t.driver_id, t.status, t.created_at,
			u.full_name as driver_name,
			COALESCE(u.car_brand, '') as car_brand,
			COALESCE(u.car_model, '') as car_model,
			COALESCE(u.car_color, '') as car_color,
			COALESCE(u.car_number, '') as car_number,
			COALESCE(u.rating, 0) as driver_rating
		FROM trips t
		JOIN users u ON t.driver_id = u.id
		WHERE t.status = 'active' AND t.available_seats > 0
	`

	args := []interface{}{}
	argCount := 1

	// Фильтр по городу отправления (обязательный для поиска)
	if fromCity != "" {
		query += " AND LOWER(t.from_city) LIKE LOWER($" + strconv.Itoa(argCount) + ")"
		args = append(args, "%"+fromCity+"%")
		argCount++
	}

	// Фильтр по городу прибытия (обязательный для поиска)
	if toCity != "" {
		query += " AND LOWER(t.to_city) LIKE LOWER($" + strconv.Itoa(argCount) + ")"
		args = append(args, "%"+toCity+"%")
		argCount++
	}

	// Фильтр по дате (необязательный)
	if date != "" {
		query += " AND t.trip_date = $" + strconv.Itoa(argCount)
		args = append(args, date)
		argCount++
	}

	query += " ORDER BY t.trip_date ASC, t.trip_time ASC"

	log.Printf("📊 SQL: %s", query)
	log.Printf("📊 Args: %v", args)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Println("❌ Ошибка поиска поездок:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search trips"})
		return
	}
	defer rows.Close()

	var trips []map[string]interface{}
	for rows.Next() {
		var trip models.Trip
		var driverName, carBrand, carModel, carColor, carNumber string
		var driverRating float64

		err := rows.Scan(
			&trip.ID, &trip.FromCity, &trip.ToCity, &trip.TripDate, &trip.TripTime,
			&trip.Seats, &trip.AvailableSeats, &trip.Price, &trip.Description,
			&trip.DriverID, &trip.Status, &trip.CreatedAt,
			&driverName, &carBrand, &carModel, &carColor, &carNumber, &driverRating,
		)
		if err != nil {
			log.Println("❌ Ошибка сканирования поездки:", err)
			continue
		}

		trips = append(trips, map[string]interface{}{
			"id":             trip.ID,
			"fromCity":       trip.FromCity,
			"toCity":         trip.ToCity,
			"tripDate":       trip.TripDate,
			"tripTime":       trip.TripTime,
			"seats":          trip.Seats,
			"availableSeats": trip.AvailableSeats,
			"price":          trip.Price,
			"description":    trip.Description,
			"driverId":       trip.DriverID,
			"driverName":     driverName,
			"carBrand":       carBrand,
			"carModel":       carModel,
			"carColor":       carColor,
			"carNumber":      carNumber,
			"driverRating":   driverRating,
			"status":         trip.Status,
		})
	}

	log.Printf("✅ Найдено поездок: %d", len(trips))
	c.JSON(http.StatusOK, trips)
}


// GetTrip получает информацию о конкретной поездке
func GetTrip(c *gin.Context) {
	tripID := c.Param("id")

	var trip models.Trip
	var phone sql.NullString
	var duration sql.NullString

	err := database.DB.QueryRow(`
		SELECT 
			t.id, t.driver_id, t.from_city, t.to_city, t.trip_date,
			TO_CHAR(t.trip_time, 'HH24:MI') as trip_time,
			t.price, t.seats, t.available_seats, t.description, t.duration,
			t.no_smoking, t.animals_allowed, t.music_allowed, t.status,
			u.full_name as driver_name, u.rating as driver_rating, u.phone,
			CONCAT(u.car_brand, ' ', u.car_model) as driver_car
		FROM trips t
		JOIN users u ON t.driver_id = u.id
		WHERE t.id = $1
	`, tripID).Scan(
		&trip.ID, &trip.DriverID, &trip.FromCity, &trip.ToCity, &trip.TripDate, &trip.TripTime,
		&trip.Price, &trip.Seats, &trip.AvailableSeats, &trip.Description, &duration,
		&trip.NoSmoking, &trip.AnimalsAllowed, &trip.MusicAllowed, &trip.Status,
		&trip.DriverName, &trip.DriverRating, &phone, &trip.DriverCar,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		} else {
			log.Println("❌ GetTrip ошибка:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get trip"})
		}
		return
	}

	if duration.Valid {
		trip.Duration = duration.String
	}

	if phone.Valid {
		trip.Phone = phone.String
	}

	c.JSON(http.StatusOK, trip)
}

// GetMyTrips получает поездки текущего пользователя
func GetMyTrips(c *gin.Context) {
	userID, _ := c.Get("userID")

	var userRole string
	database.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)

	var query string
	if userRole == "driver" {
		query = `
			SELECT 
				t.id, t.from_city, t.to_city, t.trip_date,
				TO_CHAR(t.trip_time, 'HH24:MI') as trip_time,
				t.price, t.seats, t.available_seats, t.status, t.driver_id
			FROM trips t
			WHERE t.driver_id = $1
			ORDER BY t.trip_date DESC, t.trip_time DESC
		`
	} else {
		query = `
			SELECT 
				t.id, t.from_city, t.to_city, t.trip_date,
				TO_CHAR(t.trip_time, 'HH24:MI') as trip_time,
				t.price, b.seats_booked, b.status as booking_status, 
				t.status as trip_status, t.driver_id
			FROM bookings b
			JOIN trips t ON b.trip_id = t.id
			WHERE b.passenger_id = $1
			ORDER BY t.trip_date DESC, t.trip_time DESC
		`
	}

	rows, err := database.DB.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get trips"})
		return
	}
	defer rows.Close()

	var result []gin.H

	for rows.Next() {
		if userRole == "driver" {
			var (
				id             int
				fromCity       string
				toCity         string
				tripDate       time.Time
				tripTime       string
				price          int
				seats          int
				availableSeats int
				status         string
				driverID       int
			)

			err := rows.Scan(&id, &fromCity, &toCity, &tripDate, &tripTime,
				&price, &seats, &availableSeats, &status, &driverID)
			if err != nil {
				continue
			}

			result = append(result, gin.H{
				"id":             id,
				"fromCity":       fromCity,
				"toCity":         toCity,
				"tripDate":       tripDate,
				"tripTime":       tripTime,
				"price":          price,
				"seats":          seats,
				"availableSeats": availableSeats,
				"status":         status,
				"driverId":       driverID,
			})
		} else {
			var (
				id            int
				fromCity      string
				toCity        string
				tripDate      time.Time
				tripTime      string
				price         int
				seatsBooked   int
				bookingStatus string
				tripStatus    string
				driverID      int
			)

			err := rows.Scan(&id, &fromCity, &toCity, &tripDate, &tripTime, 
				&price, &seatsBooked, &bookingStatus, &tripStatus, &driverID)
			if err != nil {
				continue
			}

			// Используем booking_status для отображения, но добавляем trip_status
			result = append(result, gin.H{
				"id":            id,
				"fromCity":      fromCity,
				"toCity":        toCity,
				"tripDate":      tripDate,
				"tripTime":      tripTime,
				"price":         price,
				"seatsBooked":   seatsBooked,
				"status":        bookingStatus, // Статус бронирования
				"tripStatus":    tripStatus,     // Статус поездки
				"driverId":      driverID,
			})
		}
	}

	c.JSON(http.StatusOK, result)
}
// CancelTrip отменяет поездку
func CancelTrip(c *gin.Context) {
	tripID := c.Param("id")
	userID, _ := c.Get("userID")

	// Проверяем, что пользователь - владелец поездки
	var driverID int
	var status string
	err := database.DB.QueryRow("SELECT driver_id, status FROM trips WHERE id = $1", tripID).Scan(&driverID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get trip"})
		}
		return
	}

	if driverID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not the owner of this trip"})
		return
	}

	if status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Trip is already cancelled"})
		return
	}

	if status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel completed trip"})
		return
	}

	// Отменяем поездку
	_, err = database.DB.Exec("UPDATE trips SET status = 'cancelled' WHERE id = $1", tripID)
	if err != nil {
		log.Println("❌ Ошибка отмены поездки:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel trip"})
		return
	}

	// Отменяем все бронирования
	_, err = database.DB.Exec("UPDATE bookings SET status = 'cancelled' WHERE trip_id = $1 AND status = 'pending'", tripID)
	if err != nil {
		log.Println("⚠️ Предупреждение: не удалось отменить бронирования:", err)
	}

	log.Println("✅ Поездка отменена:", tripID)
	c.JSON(http.StatusOK, gin.H{"message": "Trip cancelled successfully"})
}

// CompleteTrip завершает поездку
func CompleteTrip(c *gin.Context) {
	tripID := c.Param("id")
	userID, _ := c.Get("userID")

	// Проверяем, что пользователь - владелец поездки
	var driverID int
	var status string
	err := database.DB.QueryRow("SELECT driver_id, status FROM trips WHERE id = $1", tripID).Scan(&driverID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get trip"})
		}
		return
	}

	if driverID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not the owner of this trip"})
		return
	}

	if status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot complete cancelled trip"})
		return
	}

	if status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Trip is already completed"})
		return
	}

	// Завершаем поездку
	_, err = database.DB.Exec("UPDATE trips SET status = 'completed' WHERE id = $1", tripID)
	if err != nil {
		log.Println("❌ Ошибка завершения поездки:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete trip"})
		return
	}

	log.Println("✅ Поездка завершена:", tripID)
	c.JSON(http.StatusOK, gin.H{"message": "Trip completed successfully"})
}

