package models

import "time"

type Trip struct {
    ID             int       `json:"id" db:"id"`
    DriverID       int       `json:"driverId" db:"driver_id"`
    FromCity       string    `json:"fromCity" db:"from_city"`
    ToCity         string    `json:"toCity" db:"to_city"`
    TripDate       time.Time `json:"tripDate" db:"trip_date"`
    TripTime       string    `json:"tripTime" db:"trip_time"`
    Price          int       `json:"price" db:"price"`
    Seats          int       `json:"seats" db:"seats"`
    AvailableSeats int       `json:"availableSeats" db:"available_seats"`
    Description    string    `json:"description" db:"description"`
    Duration       string    `json:"duration" db:"duration"`

    // Conditions
    NoSmoking      bool `json:"noSmoking" db:"no_smoking"`
    AnimalsAllowed bool `json:"animalsAllowed" db:"animals_allowed"`
    MusicAllowed   bool `json:"musicAllowed" db:"music_allowed"`

    Status    string    `json:"status" db:"status"` // active, completed, cancelled
    CreatedAt time.Time `json:"createdAt" db:"created_at"`
    UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`

    // Joined fields
    DriverName   string  `json:"driverName" db:"driver_name"`
    DriverRating float64 `json:"driverRating" db:"driver_rating"`
    DriverCar    string  `json:"driverCar" db:"driver_car"`
    Phone        string  `json:"phone" db:"phone"`
}

type TripCreate struct {
    FromCity       string `json:"fromCity" binding:"required"`
    ToCity         string `json:"toCity" binding:"required"`
    TripDate       string `json:"tripDate" binding:"required"`
    TripTime       string `json:"tripTime" binding:"required"`
    Price          int    `json:"price" binding:"required,min=0"`
    Seats          int    `json:"seats" binding:"required,min=1,max=8"`
    Description    string `json:"description"`
    NoSmoking      bool   `json:"noSmoking"`
    AnimalsAllowed bool   `json:"animalsAllowed"`
    MusicAllowed   bool   `json:"musicAllowed"`
}

type TripSearch struct {
    FromCity string `form:"from"`
    ToCity   string `form:"to"`
    Date     string `form:"date"`
    Page     int    `form:"page" binding:"min=1"`
    Limit    int    `form:"limit" binding:"min=1,max=50"`
}
