package models

import (
    "time"
    "golang.org/x/crypto/bcrypt"
)

type User struct {
    ID           int       `json:"id" db:"id"`
    FullName     string    `json:"fullName" db:"full_name"`
    Email        string    `json:"email" db:"email"`
    Phone        string    `json:"phone" db:"phone"`
    PasswordHash string    `json:"-" db:"password_hash"`
    Role         string    `json:"role" db:"role"` // driver or passenger
    AvatarURL    *string   `json:"avatarUrl" db:"avatar_url"`
    Rating       float64   `json:"rating" db:"rating"`
    ReviewsCount int       `json:"reviewsCount" db:"reviews_count"`
    IsVerified   bool      `json:"isVerified" db:"is_verified"`
    CreatedAt    time.Time `json:"createdAt" db:"created_at"`
    UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
    
    // Driver specific fields
    CarBrand  *string `json:"carBrand" db:"car_brand"`
    CarModel  *string `json:"carModel" db:"car_model"`
    CarYear   *int    `json:"carYear" db:"car_year"`
    CarColor  *string `json:"carColor" db:"car_color"`
    CarNumber *string `json:"carNumber" db:"car_number"`
}

type UserRegister struct {
    FullName string `json:"fullName" binding:"required"`
    Email    string `json:"email" binding:"required,email"`
    Phone    string `json:"phone" binding:"required"`
    Password string `json:"password" binding:"required,min=6"`
    IsDriver bool   `json:"isDriver"`
}

type UserLogin struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

func (u *UserRegister) HashPassword() error {
    hashedBytes, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    u.Password = string(hashedBytes)
    return nil
}

func (u *User) CheckPassword(password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
    return err == nil
}