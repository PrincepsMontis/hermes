// ==========================================
// TRIPS MANAGEMENT
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚗 Trips.js initialized');

    // доступ проверяем только для создания/бронирования, поиск доступен всем
    if (!window.location.pathname.includes('search-trips')) {
        if (!checkTripsAccess()) return;
    }

    initTrips();
    loadInitialData();
});

function checkTripsAccess() {
    const user = AppStorage.get('user');
    if (!user) {
        showNotification('Для выполнения действия необходимо авторизоваться', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    return true;
}

function initTrips() {
    const searchForm = document.getElementById('searchForm');
    const bookingForm = document.querySelector('.booking-form');

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
        initSearchFilters();
        
        // ЗАГРУЖАЕМ ВСЕ ПОЕЗДКИ ПРИ ОТКРЫТИИ СТРАНИЦЫ
        loadAllTrips();
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBooking);
        initBookingForm && initBookingForm();
    }

    initMapIntegration();
}

// Загрузка всех активных поездок при открытии страницы
async function loadAllTrips() {
    showLoading('Загрузка доступных поездок...');
    
    try {
        console.log('🔍 Загрузка всех активных поездок...');
        
        // Пустые параметры = все поездки
        const trips = await window.apiClient.searchTrips({ from: '', to: '' });
        
        console.log('✅ Загружено поездок:', trips?.length || 0);
        
        displaySearchResults(trips || []);
        
        if (trips && trips.length > 0) {
            showNotification(`Доступно поездок: ${trips.length}`, 'success');
        }
    } catch (e) {
        console.error('❌ Ошибка загрузки поездок:', e);
        showNotification('Ошибка загрузки поездок', 'error');
        displaySearchResults([]);
    } finally {
        hideLoading();
    }
}
function loadInitialData() {
    // Начальная загрузка не нужна - поиск по запросу
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

function initSearchFilters() {
    const dateInput = document.getElementById('searchDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    initAutocomplete();
}

function initAutocomplete() {
    const popularCities = [
        'Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург',
        'Нижний Новгород', 'Самара', 'Омск', 'Челябинск', 'Уфа'
    ];

    const fromInput = document.getElementById('searchFrom');
    const toInput = document.getElementById('searchTo');

    [fromInput, toInput].forEach(input => {
        if (input) {
            input.addEventListener('input', function () {
                showCitySuggestions(this, popularCities);
            });
        }
    });
}

function showCitySuggestions(input, cities) {
    const value = input.value.toLowerCase();
    const filteredCities = cities.filter(city => city.toLowerCase().includes(value));
    if (filteredCities.length > 0 && value.length > 1) {
        console.log('Подсказки городов:', filteredCities);
    }
}

async function handleSearch(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const from = formData.get('from')?.trim();
    const to = formData.get('to')?.trim();
    const date = formData.get('date');

    // ОБЯЗАТЕЛЬНЫЕ ПОЛЯ: откуда и куда
    if (!from || !to) {
        showNotification('Укажите город отправления и город прибытия', 'error');
        return;
    }

    const searchParams = {
        from: from,
        to: to
    };

    // Дата необязательна
    if (date) {
        searchParams.date = date;
    }

    // Сохранение истории (если функция существует)
    // saveSearchHistory && saveSearchHistory(searchParams);
    
    await performSearch(searchParams);
}


async function performSearch(params) {
    showLoading('Поиск поездок...');

    try {
        console.log('🔍 Поиск с параметрами:', params);

        const trips = await window.apiClient.searchTrips(params);
        console.log('✅ Найдено поездок:', trips?.length || 0);

        displaySearchResults(trips || []);

        if (!trips || trips.length === 0) {
            showNotification('Поездки не найдены. Попробуйте изменить параметры поиска.', 'info');
        } else {
            showNotification(`Найдено поездок: ${trips.length}`, 'success');
        }
    } catch (e) {
        console.error('❌ Ошибка поиска:', e);
        showNotification(e.message || 'Ошибка поиска поездок', 'error');
        displaySearchResults([]);
    } finally {
        hideLoading();
    }
}

function displaySearchResults(trips) {
    const tripsList = document.getElementById('tripsList');
    if (!tripsList) return;

    if (!trips.length) {
        tripsList.innerHTML = `
            <div class="no-results">
                <h3>Поездок не найдено</h3>
                <p>Попробуйте изменить параметры поиска.</p>
                <button class="btn-primary" onclick="clearSearch()">Очистить фильтры</button>
            </div>
        `;
        return;
    }

    tripsList.innerHTML = trips.map(trip => createTripCard(trip)).join('');
}

function createTripCard(trip) {
    const date = DateUtils.formatDate(trip.tripDate);
    const time = DateUtils.formatTime(trip.tripTime);
    const availableSeats = trip.availableSeats ?? 0;
    const driverName = trip.driverName || 'Водитель';
    const carInfo = trip.carBrand && trip.carModel 
        ? `${trip.carBrand} ${trip.carModel}` 
        : 'Автомобиль не указан';

    return `
      <div class="trip-card" data-trip-id="${trip.id}">
        <div class="trip-header">
          <div class="trip-route">
            <h3>${trip.fromCity} → ${trip.toCity}</h3>
            <p>📅 ${date}, ⏰ ${time}</p>
          </div>
          <div class="trip-price">
            ${Number(trip.price).toLocaleString('ru-RU')} ₽
          </div>
        </div>

        <div class="trip-info">
          <p><strong>👤 Водитель:</strong> ${driverName} ${trip.driverRating ? `⭐ ${trip.driverRating.toFixed(1)}` : ''}</p>
          <p><strong>🚗 Автомобиль:</strong> ${carInfo}</p>
          <p><strong>💺 Мест доступно:</strong> ${availableSeats} из ${trip.seats}</p>
        </div>

        ${trip.description ? `
          <div class="trip-description">
            <p>${trip.description}</p>
          </div>
        ` : ''}

        <div class="trip-actions">
          <a href="trip-details.html?id=${trip.id}" class="btn-primary">Подробнее и забронировать</a>
        </div>
      </div>
    `;
}

function clearSearch() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.reset();
        const tripsList = document.getElementById('tripsList');
        if (tripsList) {
            tripsList.innerHTML = '<p class="no-trips">Введите параметры поиска</p>';
        }
    }
}

function showLoading(message = 'Загрузка...') {
    const tripsList = document.getElementById('tripsList');
    if (tripsList) {
        tripsList.innerHTML = `<p class="loading">⏳ ${message}</p>`;
    }
}

function hideLoading() {
    console.log('✅ Загрузка завершена');
}

function initMapIntegration() {
    console.log('🗺️ Map integration placeholder');
}

// Глобальные функции
window.clearSearch = clearSearch;

console.log('✅ Trips.js loaded');
