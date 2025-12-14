CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('driver', 'passenger')),
    avatar_url VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.0,
    reviews_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Поля для водителей
    car_brand VARCHAR(50),
    car_model VARCHAR(50),
    car_year INTEGER,
    car_color VARCHAR(30),
    car_number VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    trip_date DATE NOT NULL,
    trip_time TIME NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    seats INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 8),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    description TEXT,
    duration VARCHAR(50),
    
    -- Условия поездки
    no_smoking BOOLEAN DEFAULT FALSE,
    animals_allowed BOOLEAN DEFAULT FALSE,
    music_allowed BOOLEAN DEFAULT FALSE,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_booked INTEGER NOT NULL CHECK (seats_booked BETWEEN 1 AND 8),
    total_price INTEGER NOT NULL CHECK (total_price >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(trip_id, passenger_id)
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для улучшения производительности
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_from_to_date ON trips(from_city, to_city, trip_date);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger_id ON bookings(passenger_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_reviews_target_id ON reviews(target_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE UNIQUE INDEX idx_reviews_unique_author_trip ON reviews(author_id, trip_id);
ALTER TABLE reviews ADD CONSTRAINT unique_review_per_trip UNIQUE (author_id, trip_id);