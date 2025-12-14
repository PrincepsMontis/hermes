// Управление поездками
class TripManager {
    constructor() {
        this.currentTrip = null;
    }

    async loadTrips(searchParams = {}) {
        try {
            const trips = await apiClient.searchTrips(searchParams);
            this.displayTrips(trips);
        } catch (error) {
            showNotification('Ошибка при загрузке поездок', 'error');
        }
    }

    displayTrips(trips) {
        const tripsList = document.getElementById('tripsList');
        if (!tripsList) return;

        if (trips.length === 0) {
            tripsList.innerHTML = `
                <div class="no-results">
                    <h3>😔 Поездки не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }

        tripsList.innerHTML = trips.map(trip => this.createTripCard(trip)).join('');
    }

    createTripCard(trip) {
        const tripDate = new Date(trip.tripDate);
        const formattedDate = tripDate.toLocaleDateString('ru-RU');
        const isFuture = tripDate > new Date();
        
        return `
            <div class="trip-card" data-trip-id="${trip.id}">
                <div class="trip-header">
                    <div class="trip-route">
                        <h3>${trip.fromCity} → ${trip.toCity}</h3>
                        <p>${formattedDate}, ${trip.tripTime}</p>
                    </div>
                    <div class="trip-price">${trip.price} ₽</div>
                </div>
                
                <div class="trip-details">
                    <div class="trip-detail">
                        <span class="trip-detail-icon">👥</span>
                        <span>${trip.availableSeats} из ${trip.seats} мест</span>
                    </div>
                    <div class="trip-detail">
                        <span class="trip-detail-icon">🚗</span>
                        <span>${trip.driverCar || 'Автомобиль'}</span>
                    </div>
                </div>
                
                <div class="trip-driver">
                    <div class="driver-info">
                        <h4>${trip.driverName}</h4>
                        <div class="driver-rating">⭐ ${trip.driverRating || 'Нет оценок'}</div>
                    </div>
                </div>
                
                <div class="trip-conditions">
                    ${trip.noSmoking ? '<span class="condition-tag">🚭 Не курю</span>' : ''}
                    ${trip.animalsAllowed ? '<span class="condition-tag">🐕 Можно с животными</span>' : ''}
                    ${trip.musicAllowed ? '<span class="condition-tag">🎵 Можно музыку</span>' : ''}
                </div>
                
                <div class="trip-actions">
                    <a href="trip-details.html?id=${trip.id}" class="btn-primary">Подробнее</a>
                    ${trip.availableSeats > 0 && isFuture ? `
                        <button class="btn-secondary" onclick="tripManager.quickBook(${trip.id})">Быстрое бронирование</button>
                    ` : `
                        <button class="btn-outline" disabled>${isFuture ? 'Нет мест' : 'Поездка завершена'}</button>
                    `}
                </div>
            </div>
        `;
    }

    async quickBook(tripId) {
        try {
            const bookingData = {
                tripId: tripId,
                seatsBooked: 1
            };
            
            const result = await apiClient.createBooking(bookingData);
            showNotification(`Место забронировано! Сумма: ${result.totalPrice} ₽`, 'success');
            
            // Обновляем список поездок
            this.loadTrips();
            
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async createTrip(tripData) {
        try {
            const result = await apiClient.createTrip(tripData);
            showNotification('Поездка успешно создана!', 'success');
            
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1500);
            
            return result;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }
}

// Глобальный экземпляр менеджера поездок
window.tripManager = new TripManager();