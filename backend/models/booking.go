package models

import "time"

type Booking struct {
    ID            int       `json:"id" db:"id"`
    TripID        int       `json:"tripId" db:"trip_id"`
    PassengerID   int       `json:"passengerId" db:"passenger_id"`
    SeatsBooked   int       `json:"seatsBooked" db:"seats_booked"`
    TotalPrice    int       `json:"totalPrice" db:"total_price"`
    Status        string    `json:"status" db:"status"`
    CreatedAt     time.Time `json:"createdAt" db:"created_at"`
    UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
    
    // Joined fields
    DriverName    string    `json:"driverName" db:"driver_name"`
    FromCity      string    `json:"fromCity" db:"from_city"`
    ToCity        string    `json:"toCity" db:"to_city"`
    TripDate      time.Time `json:"tripDate" db:"trip_date"`
    TripTime      string    `json:"tripTime" db:"trip_time"`
}

type BookingCreate struct {
    TripID      int `json:"tripId" binding:"required"`
    SeatsBooked int `json:"seatsBooked" binding:"required,min=1,max=8"`
}