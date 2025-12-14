// ==========================================
// TRIP DETAILS PAGE
// ==========================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🧾 Trip details page initialized');
    
    const tripId = getTripIdFromURL();
    
    if (!tripId) {
        renderError('ID поездки не указан. Вернитесь к поиску.');
        return;
    }

    try {
        const trip = await window.apiClient.getTrip(tripId);
        console.log('✅ Поездка загружена:', trip);
        renderTripDetails(trip);
    } catch (e) {
        console.error('❌ Ошибка загрузки поездки:', e);
        renderError(e.message);
    }
});

function getTripIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function renderError(message) {
    const container = document.getElementById('tripDetails');
    if (!container) return;
    
    container.innerHTML = `
        <div class="no-results">
            <h3>Ошибка</h3>
            <p>${message}</p>
            <a href="search-trips.html" class="btn-primary mt-2">Вернуться к поиску</a>
        </div>
    `;
}

function renderTripDetails(trip) {
    const container = document.getElementById('tripDetails');
    if (!container) return;

    const availableSeats = trip.availableSeats ?? trip.availableseats ?? 0;
    const seatsTotal = trip.seats ?? 0;
    const user = window.AppStorage ? AppStorage.get('user') : null;
    const isPassenger = user && user.role === 'passenger';
    const isDriver = user && user.role === 'driver';

    container.innerHTML = `
        <div class="trip-card">
            <div class="trip-header">
                <div class="trip-route">
                    <h1>${trip.fromCity} → ${trip.toCity}</h1>
                    <p>${DateUtils.formatDate(trip.tripDate)}, ${DateUtils.formatTime(trip.tripTime)}</p>
                </div>
                <div class="trip-price">
                    ${trip.price.toLocaleString('ru-RU')} ₽
                </div>
            </div>

            <div class="trip-details">
                <div class="trip-detail">
                    <span class="trip-detail-icon">📅</span>
                    <span>${DateUtils.formatDate(trip.tripDate)}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-icon">🕐</span>
                    <span>${DateUtils.formatTime(trip.tripTime)}</span>
                </div>
                <div class="trip-detail">
                    <span class="trip-detail-icon">💺</span>
                    <span>${availableSeats} из ${seatsTotal}</span>
                </div>
                ${trip.duration ? `
                <div class="trip-detail">
                    <span class="trip-detail-icon">⏱️</span>
                    <span>${trip.duration}</span>
                </div>
                ` : ''}
            </div>

            ${trip.description ? `
            <div class="trip-description">
                <h2>Описание</h2>
                <p>${trip.description}</p>
            </div>
            ` : ''}

            <div class="trip-conditions">
                ${trip.noSmoking ? '<span class="condition-tag">🚭 Не курю</span>' : ''}
                ${trip.animalsAllowed ? '<span class="condition-tag">🐕 Можно с питомцами</span>' : ''}
                ${trip.musicAllowed ? '<span class="condition-tag">🎵 Музыка в пути</span>' : ''}
            </div>

            <div class="trip-driver">
                <h2>Водитель</h2>
                <p><strong>${trip.driverName}</strong></p>
                ${trip.driverCar ? `<p>🚗 ${trip.driverCar}</p>` : ''}
                ${trip.phone ? `<p>📞 ${trip.phone}</p>` : ''}
                ${trip.driverRating ? `<p>⭐ Рейтинг: ${trip.driverRating.toFixed(1)}</p>` : ''}
            </div>

            <div class="trip-actions">
                ${isPassenger && availableSeats > 0 ? `
                    <button class="btn-primary" onclick="bookTrip(${trip.id})">
                        Забронировать место
                    </button>
                ` : !user ? `
                    <a href="login.html" class="btn-primary">Войдите для бронирования</a>
                ` : availableSeats === 0 ? `
                    <button class="btn-outline" disabled>Мест нет</button>
                ` : isDriver ? `
                    <button class="btn-outline" disabled>Водители не могут бронировать</button>
                ` : `
                    <button class="btn-outline" disabled>Только для пассажиров</button>
                `}
                <a href="search-trips.html" class="btn-outline">Назад к поиску</a>
            </div>
        </div>
    `;
}

// ==========================================
// BOOKING FUNCTION
// ==========================================

async function bookTrip(tripId) {
    if (!window.showNotification || !window.apiClient) {
        alert('Системная ошибка. Перезагрузите страницу.');
        return;
    }

    const user = window.AppStorage.get('user');
    if (!user) {
        window.showNotification('Войдите для бронирования', 'warning');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    if (user.role !== 'passenger') {
        window.showNotification('Бронировать могут только пассажиры', 'error');
        return;
    }

    if (!confirm('Забронировать 1 место в этой поездке?')) {
        return;
    }

    try {
        const result = await window.apiClient.createBooking({
            tripId: tripId,
            seatsBooked: 1
        });

        window.showNotification(
            `Заявка отправлена! Ожидайте подтверждения водителя.`, 
            'success'
        );
        
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);
    } catch (error) {
        console.error('❌ Ошибка бронирования:', error);
        window.showNotification(error.message || 'Ошибка бронирования', 'error');
    }
}
