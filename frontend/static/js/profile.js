// ==========================================
// PROFILE MANAGEMENT
// ==========================================

// Убеждаемся, что AppStorage и утилиты доступны
window.AppStorage = window.AppStorage || {
  set: function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("localStorage set error:", e);
      return false;
    }
  },
  get: function (key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("localStorage get error:", e);
      return null;
    }
  },
  remove: function (key) {
    localStorage.removeItem(key);
  },
  clear: function () {
    localStorage.clear();
  }
};

window.DateUtils = window.DateUtils || {
  formatDate: function (dateString) {
    try {
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      return new Date(dateString).toLocaleDateString('ru-RU', options);
    } catch (e) {
      return dateString;
    }
  },
  formatTime: function (timeString) {
    return timeString ? timeString.substring(0, 5) : '';
  }
};

document.addEventListener('DOMContentLoaded', function () {
  console.log("👤 Profile.js initialized");
  
  if (!checkProfileAccess()) return;
  
  initProfile();
  loadProfileData();
});

function checkProfileAccess() {
  const user = AppStorage.get('user');
  
  if (!user) {
    showNotification('Необходима авторизация', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
    return false;
  }
  
  return true;
}

function initProfile() {
  initProfileNavigation();
  initProfileForms();
  initAvatarUpload();
  initStatistics();
  initLogoutButton();
}

function initLogoutButton() {
  const logoutBtn = document.querySelector('a[href="#"].btn-outline');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      logout();
    });
  }
}

function logout() {
  if (confirm('Вы уверены, что хотите выйти?')) {
    AppStorage.remove('authToken');
    AppStorage.remove('user');
    showNotification('Вы вышли из системы', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  }
}

// ==========================================
// PROFILE NAVIGATION
// ==========================================
function initProfileNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.profile-section');

  if (navItems.length > 0 && sections.length > 0) {
    navItems[0].classList.add('active');
    sections[0].classList.add('active');
  }

  navItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();

      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(section => section.classList.remove('active'));

      this.classList.add('active');

      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        targetSection.classList.add('active');
        loadSectionData(targetId);
      }
    });
  });
}

function loadSectionData(sectionId) {
  switch (sectionId) {
    case 'trips':
      loadUserTrips();
      break;
    case 'bookings':
      loadDriverBookings();
      break;
    case 'reviews':
      loadUserReviews();
      break;
    case 'car':
      loadCarInfo();
      break;
  }
}

// ==========================================
// PROFILE FORMS
// ==========================================
function initProfileForms() {
  const forms = document.querySelectorAll('.profile-form');

  forms.forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      saveProfileSection(this);
    });

    // Live validation
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', function () {
        validateProfileField(this);
      });
    });
  });
}

function validateProfileField(field) {
  if (field.hasAttribute('required') && !field.value.trim()) {
    showFieldError(field, 'Поле обязательно для заполнения');
    return false;
  }

  // Email validation
  if (field.type === 'email' && field.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value)) {
      showFieldError(field, 'Введите корректный email');
      return false;
    }
  }

  // Phone validation
  if (field.name === 'phone' && field.value) {
    const phoneRegex = /^[+]?[0-9-]{10,}$/;
    if (!phoneRegex.test(field.value.replace(/\s/g, ''))) {
      showFieldError(field, 'Введите корректный номер телефона');
      return false;
    }
  }

  clearFieldError(field);
  return true;
}

// ==========================================
// LOAD PROFILE DATA (РЕАЛЬНЫЙ API)
// ==========================================
async function loadProfileData() {
  try {
    console.log("📡 Загрузка профиля...");
    
    const profile = await window.apiClient.getProfile();
    
    console.log("✅ Профиль загружен:", profile);

    AppStorage.set('user', {
      id: profile.id,
      name: profile.fullName || profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      rating: profile.rating,
      reviewsCount: profile.reviewsCount || profile.reviewscount,
    });

    fillFormData('personal', {
      fullName: profile.fullName || profile.name,
      email: profile.email,
      phone: profile.phone,
    });

    fillFormData('car', {
      carBrand: profile.carBrand || profile.carbrand,
      carModel: profile.carModel || profile.carmodel,
      carYear: profile.carYear || profile.caryear,
      carColor: profile.carColor || profile.carcolor,
      carNumber: profile.carNumber || profile.carnumber,
    });

    updateProfileDisplay(profile);
  } catch (e) {
    console.error("❌ Ошибка загрузки профиля:", e);
    showNotification(e.message || 'Не удалось загрузить профиль', 'error');
    
    const user = AppStorage.get('user');
    if (user) {
      fillFormData('personal', {
        fullName: user.name,
        email: user.email,
        phone: user.phone,
      });
      updateProfileDisplay(user);
    }
  }
}

function fillFormData(sectionId, data) {
  const form = document.querySelector(`#${sectionId} .profile-form`);
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const fieldName = input.id || input.name;
    if (data[fieldName] !== undefined && data[fieldName] !== null) {
      input.value = data[fieldName];
    }
  });
}

function updateProfileDisplay(user) {
  console.log("🖼️ Обновление отображения профиля:", user);

  const profileName = document.querySelector('.profile-info h1');
  if (profileName) {
    profileName.textContent = user.name || user.fullName;
  }

  const ratingElement = document.querySelector('.profile-rating');
  if (ratingElement) {
    const rating = user.rating || 0;
    const reviewsCount = user.reviewsCount || user.reviewscount || 0;
    ratingElement.textContent = `⭐ ${rating} (${reviewsCount} отзывов)`;
  }

  const roleElement = document.querySelector('.profile-role');
  if (roleElement) {
    roleElement.textContent = user.role === 'driver' ? '🚗 Водитель' : '👤 Пассажир';
  }

  const avatarElement = document.querySelector('.profile-avatar img');
  if (avatarElement && user.avatar) {
    avatarElement.src = user.avatar;
  }
}

// ==========================================
// SAVE PROFILE SECTION (РЕАЛЬНЫЙ API)
// ==========================================
async function saveProfileSection(form) {
  const sectionId = form.closest('.profile-section').id;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  if (!validateProfileSection(sectionId, data)) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ Сохранение...';
  submitBtn.disabled = true;

  try {
    console.log("📡 Сохранение секции:", sectionId, data);
    
    const currentProfile = await window.apiClient.getProfile();
    
    const updateData = {
      fullName: data.fullName || currentProfile.fullName || currentProfile.full_name,
      phone: data.phone || currentProfile.phone,
      carBrand: data.carBrand || currentProfile.carBrand || currentProfile.carbrand || '',
      carModel: data.carModel || currentProfile.carModel || currentProfile.carmodel || '',
      carYear: data.carYear ? parseInt(data.carYear, 10) : (currentProfile.carYear || currentProfile.caryear || 0),
      carColor: data.carColor || currentProfile.carColor || currentProfile.carcolor || '',
      carNumber: data.carNumber || currentProfile.carNumber || currentProfile.carnumber || '',
    };

    console.log("📤 Отправка данных:", updateData);

    await window.apiClient.updateProfile(updateData);

    console.log("✅ Профиль обновлён");

    const user = AppStorage.get('user');
    user.name = updateData.fullName;
    user.phone = updateData.phone;
    AppStorage.set('user', user);

    await loadProfileData();

    showNotification('Данные успешно сохранены!', 'success');
  } catch (error) {
    console.error("❌ Ошибка сохранения:", error);
    showNotification(error.message || 'Не удалось сохранить изменения', 'error');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function validateProfileSection(sectionId, data) {
  switch (sectionId) {
    case 'personal':
      if (!data.fullName?.trim()) {
        showNotification('Введите полное имя', 'error');
        return false;
      }
      if (!data.email?.trim()) {
        showNotification('Введите email', 'error');
        return false;
      }
      break;
    case 'car':
      if (!data.carBrand?.trim()) {
        showNotification('Введите марку автомобиля', 'error');
        return false;
      }
      if (!data.carModel?.trim()) {
        showNotification('Введите модель автомобиля', 'error');
        return false;
      }
      break;
  }
  return true;
}

// ==========================================
// AVATAR UPLOAD С СОХРАНЕНИЕМ
// ==========================================
function initAvatarUpload() {
  const editButton = document.querySelector('.btn-edit');
  const avatarImg = document.querySelector('.profile-avatar img');

  if (editButton && avatarImg) {
    // Загружаем сохранённый аватар
    const user = AppStorage.get('user');
    if (user && user.id) {
      window.AvatarStorage.getAvatar(user.id).then(avatarData => {
        if (avatarData) {
          avatarImg.src = avatarData;
          console.log('✅ Аватар загружен из IndexedDB');
        }
      });
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    editButton.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', async function (e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showNotification('Размер файла не должен превышать 5MB', 'error');
          return;
        }

        if (!file.type.startsWith('image/')) {
          showNotification('Выберите изображение', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
          const avatarData = e.target.result;
          avatarImg.src = avatarData;

          const user = AppStorage.get('user');
          if (user) {
            // Сохраняем в IndexedDB
            await window.AvatarStorage.saveAvatar(user.id, avatarData);
            
            // Обновляем в localStorage (для быстрого доступа)
            user.avatar = avatarData;
            AppStorage.set('user', user);
            
            showNotification('Аватар обновлён', 'success');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
}


// ==========================================
// USER TRIPS С УПРАВЛЕНИЕМ
// ==========================================
async function loadUserTrips() {
  try {
    console.log("📡 Загрузка поездок пользователя...");
    
    const trips = await window.apiClient.getMyTrips();
    
    console.log("✅ Поездки загружены:", trips);
    
    const currentUser = AppStorage.get('user');
    console.log("👤 Текущий пользователь:", currentUser);
    
    const tripsContainer = document.querySelector('#trips .trips-list');
    if (tripsContainer) {
      if (!trips || trips.length === 0) {
        tripsContainer.innerHTML = '<p class="no-data">У вас пока нет поездок</p>';
      } else {
        tripsContainer.innerHTML = trips.map(trip => {
          const isConfirmed = trip.status === 'confirmed';
          const hasDriverId = trip.driverId !== undefined && trip.driverId !== null;
          const isNotOwnTrip = currentUser && trip.driverId !== currentUser.id;
          const isDriver = currentUser && trip.driverId === currentUser.id;
          
          const showReviewButton = isConfirmed && hasDriverId && isNotOwnTrip;
          const showCancelButton = isDriver && (trip.status === 'active' || trip.status === 'pending');
          const showCompleteButton = isDriver && trip.status === 'active';
          
          console.log('🔍 Trip analysis:', {
            tripId: trip.id,
            status: trip.status,
            isDriver: isDriver,
            showCancel: showCancelButton,
            showComplete: showCompleteButton,
            showReview: showReviewButton
          });
          
          return `
          <div class="trip-card">
            <div class="trip-info">
              <h3>${trip.fromCity} → ${trip.toCity}</h3>
              <p>📅 ${DateUtils.formatDate(trip.tripDate)}, ⏰ ${DateUtils.formatTime(trip.tripTime)}</p>
              <p class="trip-status ${trip.status}">${getStatusText(trip.status)}</p>
              ${trip.seats ? `<p>💺 Мест: ${trip.availableSeats}/${trip.seats}</p>` : ''}
            </div>
            <div class="trip-actions">
              <button class="btn-outline" onclick="viewTrip(${trip.id})">Подробнее</button>
              
              ${showCompleteButton ? `
                <button class="btn-success" onclick="completeTrip(${trip.id})" title="Завершить поездку">
                  ✅ Завершить
                </button>
              ` : ''}
              
              ${showCancelButton ? `
                <button class="btn-danger" onclick="cancelTrip(${trip.id})" title="Отменить поездку">
                  ❌ Отменить
                </button>
              ` : ''}
              
              ${showReviewButton ? `
                <button class="btn-primary" onclick="openReviewModal(${trip.id}, ${trip.driverId})" title="Оставить отзыв о водителе">
                  ⭐ Оставить отзыв
                </button>
              ` : ''}
            </div>
          </div>
        `}).join('');
      }
    }
  } catch (e) {
    console.error("❌ Ошибка загрузки поездок:", e);
    showNotification(e.message || 'Не удалось загрузить поездки', 'error');
  }
}


function getStatusText(status) {
  const statusMap = {
    'completed': '✅ Завершена',
    'confirmed': '✅ Подтверждена',
    'pending': '⏳ Ожидает подтверждения',
    'cancelled': '❌ Отменена',
    'active': '🚗 Активна',
  };
  return statusMap[status] || status;
}

function viewTrip(tripId) {
  window.location.href = `trip-details.html?id=${tripId}`;
}

// ==========================================
// DRIVER BOOKINGS (заявки водителя)
// ==========================================
async function loadDriverBookings() {
  try {
    console.log("📡 Загрузка заявок на бронирование...");
    
    const bookings = await window.apiClient.getDriverBookings();
    
    console.log("✅ Заявки загружены:", bookings);
    
    const bookingsContainer = document.querySelector('#bookings .bookings-list');
    if (bookingsContainer) {
      if (!bookings || bookings.length === 0) {
        bookingsContainer.innerHTML = '<p class="no-data">Нет заявок на бронирование</p>';
      } else {
        bookingsContainer.innerHTML = bookings.map(booking => {
          const canRate = booking.status === 'confirmed' && !booking.hasReview;
          
          return `
          <div class="booking-card ${booking.status}">
            <div class="booking-info">
              <h3>${booking.fromCity} → ${booking.toCity}</h3>
              <p>📅 ${DateUtils.formatDate(booking.tripDate)}, ${DateUtils.formatTime(booking.tripTime)}</p>
              <p>👤 Пассажир: <strong>${booking.passengerName}</strong></p>
              <p>📞 ${booking.passengerPhone}</p>
              <p>💺 Мест: ${booking.seatsBooked} | 💰 ${booking.totalPrice} ₽</p>
              <p class="booking-status ${booking.status}">${getBookingStatusText(booking.status)}</p>
            </div>
            <div class="booking-actions">
              ${booking.status === 'pending' ? `
                <button class="btn-primary" onclick="confirmBooking(${booking.id})">
                  ✅ Подтвердить
                </button>
                <button class="btn-outline" onclick="rejectBooking(${booking.id})">
                  ❌ Отклонить
                </button>
              ` : ''}
              ${canRate ? `
                <button class="btn-primary" onclick="openPassengerRatingModal(${booking.id}, ${booking.passengerId}, '${booking.passengerName}')" title="Оценить пассажира">
                  ⭐ Оценить пассажира
                </button>
              ` : ''}
            </div>
          </div>
        `}).join('');
      }
    }
  } catch (e) {
    console.error("❌ Ошибка загрузки заявок:", e);
    showNotification(e.message || 'Не удалось загрузить заявки', 'error');
  }
}


function getBookingStatusText(status) {
  const statusMap = {
    'pending': '⏳ Ожидает подтверждения',
    'confirmed': '✅ Подтверждено',
    'cancelled': '❌ Отклонено'
  };
  return statusMap[status] || status;
}

async function confirmBooking(bookingId) {
  if (!confirm('Подтвердить бронирование?')) return;

  try {
    await window.apiClient.updateBookingStatus(bookingId, 'confirmed');
    showNotification('Бронирование подтверждено!', 'success');
    loadDriverBookings();
  } catch (e) {
    console.error('❌ Ошибка подтверждения:', e);
    showNotification(e.message || 'Ошибка подтверждения', 'error');
  }
}

async function rejectBooking(bookingId) {
  if (!confirm('Отклонить бронирование?')) return;

  try {
    await window.apiClient.updateBookingStatus(bookingId, 'cancelled');
    showNotification('Бронирование отклонено', 'success');
    loadDriverBookings();
  } catch (e) {
    console.error('❌ Ошибка отклонения:', e);
    showNotification(e.message || 'Ошибка отклонения', 'error');
  }
}

// ==========================================
// USER REVIEWS
// ==========================================
async function loadUserReviews() {
  try {
    console.log("📝 Загрузка отзывов...");
    
    const reviews = await window.apiClient.getMyReviews();
    
    console.log("✅ Отзывы загружены:", reviews);
    
    const reviewsContainer = document.querySelector('#reviews');
    
    if (!reviews || reviews.length === 0) {
      reviewsContainer.innerHTML = '<h2>Отзывы обо мне</h2><p class="no-data">У вас пока нет отзывов</p>';
    } else {
      reviewsContainer.innerHTML = `
        <h2>Отзывы обо мне</h2>
        <div class="reviews-list">
          ${reviews.map(review => `
            <div class="review-card">
              <div class="review-header">
                <div class="review-author">
                  <div class="review-avatar">${review.avatar ? `<img src="${review.avatar}" alt="${review.authorName}">` : '👤'}</div>
                  <div>
                    <strong>${review.authorName}</strong>
                    <p class="review-trip">${review.fromCity} → ${review.toCity} (${DateUtils.formatDate(review.tripDate)})</p>
                  </div>
                </div>
                <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
              </div>
              ${review.comment ? `<p class="review-comment">${review.comment}</p>` : ''}
              <p class="review-date">${DateUtils.formatDate(review.createdAt)}</p>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (e) {
    console.error("❌ Ошибка загрузки отзывов:", e);
    const reviewsContainer = document.querySelector('#reviews');
    if (reviewsContainer) {
      reviewsContainer.innerHTML = '<h2>Отзывы обо мне</h2><p class="no-data">Не удалось загрузить отзывы</p>';
    }
  }
}

// ==========================================
// REVIEW MODAL С УЛУЧШЕННЫМИ ЗВЁЗДАМИ
// ==========================================
async function openReviewModal(tripId, driverId) {
  console.log('🔍 openReviewModal вызвана:', { tripId, driverId });
  
  const modal = document.createElement('div');
  modal.className = 'review-modal';
  modal.innerHTML = `
    <div class="review-modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="review-modal-content">
      <button class="review-modal-close" onclick="this.closest('.review-modal').remove()">×</button>
      <h2>⭐ Оставить отзыв о поездке</h2>
      <form id="reviewForm">
        <div class="form-group">
          <label>Оценка водителя *</label>
          <div class="rating-input">
            <input type="radio" name="rating" value="5" id="star5" required>
            <label for="star5" title="Отлично">⭐</label>
            <input type="radio" name="rating" value="4" id="star4">
            <label for="star4" title="Хорошо">⭐</label>
            <input type="radio" name="rating" value="3" id="star3">
            <label for="star3" title="Нормально">⭐</label>
            <input type="radio" name="rating" value="2" id="star2">
            <label for="star2" title="Плохо">⭐</label>
            <input type="radio" name="rating" value="1" id="star1">
            <label for="star1" title="Ужасно">⭐</label>
          </div>
          <div class="rating-display" id="ratingDisplay">Выберите оценку</div>
        </div>
        <div class="form-group">
          <label for="reviewComment">Комментарий (необязательно)</label>
          <textarea id="reviewComment" name="comment" rows="4" placeholder="Расскажите о поездке..."></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Отправить отзыв</button>
          <button type="button" class="btn-outline" onclick="this.closest('.review-modal').remove()">Отмена</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Интерактивность звёзд
  const ratingInputs = modal.querySelectorAll('input[name="rating"]');
  const ratingDisplay = modal.querySelector('#ratingDisplay');
  const ratingTexts = {
    '5': '⭐⭐⭐⭐⭐ Отлично!',
    '4': '⭐⭐⭐⭐ Хорошо',
    '3': '⭐⭐⭐ Нормально',
    '2': '⭐⭐ Плохо',
    '1': '⭐ Ужасно'
  };

  ratingInputs.forEach(input => {
    input.addEventListener('change', function() {
      ratingDisplay.textContent = ratingTexts[this.value];
      ratingDisplay.classList.add('active');
    });
  });

  const form = modal.querySelector('#reviewForm');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const rating = parseInt(form.rating.value);
    const comment = form.reviewComment.value.trim();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Отправка...';

    try {
      await window.apiClient.createReview({
        tripId: tripId,
        targetId: driverId,
        rating: rating,
        comment: comment
      });

      showNotification('Спасибо за отзыв!', 'success');
      modal.remove();
      loadUserTrips();
    } catch (error) {
      console.error('❌ Ошибка создания отзыва:', error);
      showNotification(error.message || 'Ошибка создания отзыва', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить отзыв';
    }
  });
}


// ==========================================
// CAR INFO
// ==========================================
function loadCarInfo() {
  loadProfileData();
  console.log("🚗 Информация об автомобиле загружена");
}

// ==========================================
// STATISTICS
// ==========================================
function initStatistics() {
  console.log("📊 Статистика инициализирована");
}

// ==========================================
// ERROR DISPLAY
// ==========================================
function showFieldError(field, message) {
  clearFieldError(field);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    color: #e74c3c;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  `;
  field.style.borderColor = '#e74c3c';
  field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
  const errorDiv = field.parentNode.querySelector('.field-error');
  if (errorDiv) errorDiv.remove();
  field.style.borderColor = '';
}

// Экспортируем в глобальную область
window.viewTrip = viewTrip;
window.confirmBooking = confirmBooking;
window.rejectBooking = rejectBooking;
window.openReviewModal = openReviewModal;
// ==========================================
// УПРАВЛЕНИЕ ПОЕЗДКАМИ
// ==========================================
async function cancelTrip(tripId) {
  if (!confirm('Вы уверены, что хотите отменить эту поездку? Все бронирования будут отменены.')) {
    return;
  }

  try {
    await window.apiClient.cancelTrip(tripId);
    showNotification('Поездка отменена', 'success');
    loadUserTrips();
  } catch (error) {
    console.error('❌ Ошибка отмены поездки:', error);
    showNotification(error.message || 'Не удалось отменить поездку', 'error');
  }
}

async function completeTrip(tripId) {
  if (!confirm('Завершить поездку? После этого пассажиры смогут оставить отзывы.')) {
    return;
  }

  try {
    await window.apiClient.completeTrip(tripId);
    showNotification('Поездка завершена! 🎉', 'success');
    loadUserTrips();
    
    // Показываем возможность оценить пассажиров
    setTimeout(() => {
      if (confirm('Хотите оценить пассажиров этой поездки?')) {
        loadDriverBookings(); // Переключаемся на вкладку заявок
      }
    }, 1500);
  } catch (error) {
    console.error('❌ Ошибка завершения поездки:', error);
    showNotification(error.message || 'Не удалось завершить поездку', 'error');
  }
}

window.cancelTrip = cancelTrip;
window.completeTrip = completeTrip;
// ==========================================
// ОЦЕНКА ПАССАЖИРА ВОДИТЕЛЕМ
// ==========================================
async function openPassengerRatingModal(bookingId, passengerId, passengerName) {
  console.log('🔍 openPassengerRatingModal вызвана:', { bookingId, passengerId, passengerName });
  
  const modal = document.createElement('div');
  modal.className = 'review-modal';
  modal.innerHTML = `
    <div class="review-modal-overlay" onclick="this.parentElement.remove()"></div>
    <div class="review-modal-content">
      <button class="review-modal-close" onclick="this.closest('.review-modal').remove()">×</button>
      <h2>⭐ Оценить пассажира</h2>
      <p style="color: #7f8c8d; margin-bottom: 1.5rem;">Пассажир: <strong>${passengerName}</strong></p>
      <form id="passengerRatingForm">
        <div class="form-group">
          <label>Оценка *</label>
          <div class="rating-input">
            <input type="radio" name="rating" value="5" id="pstar5" required>
            <label for="pstar5" title="Отлично">⭐</label>
            <input type="radio" name="rating" value="4" id="pstar4">
            <label for="pstar4" title="Хорошо">⭐</label>
            <input type="radio" name="rating" value="3" id="pstar3">
            <label for="pstar3" title="Нормально">⭐</label>
            <input type="radio" name="rating" value="2" id="pstar2">
            <label for="pstar2" title="Плохо">⭐</label>
            <input type="radio" name="rating" value="1" id="pstar1">
            <label for="pstar1" title="Ужасно">⭐</label>
          </div>
          <div class="rating-display" id="passengerRatingDisplay">Выберите оценку</div>
        </div>
        <div class="form-group">
          <label for="passengerComment">Комментарий (необязательно)</label>
          <textarea id="passengerComment" name="comment" rows="4" placeholder="Как вёл себя пассажир?"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Оценить</button>
          <button type="button" class="btn-outline" onclick="this.closest('.review-modal').remove()">Отмена</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Интерактивность звёзд
  const ratingInputs = modal.querySelectorAll('input[name="rating"]');
  const ratingDisplay = modal.querySelector('#passengerRatingDisplay');
  const ratingTexts = {
    '5': '⭐⭐⭐⭐⭐ Отлично!',
    '4': '⭐⭐⭐⭐ Хорошо',
    '3': '⭐⭐⭐ Нормально',
    '2': '⭐⭐ Плохо',
    '1': '⭐ Ужасно'
  };

  ratingInputs.forEach(input => {
    input.addEventListener('change', function() {
      ratingDisplay.textContent = ratingTexts[this.value];
      ratingDisplay.classList.add('active');
    });
  });

  const form = modal.querySelector('#passengerRatingForm');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const rating = parseInt(form.rating.value);
    const comment = form.passengerComment.value.trim();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Отправка...';

    try {
      await window.apiClient.ratePassenger(bookingId, rating, comment);

      showNotification('Пассажир оценён!', 'success');
      modal.remove();
      loadDriverBookings(); // Обновляем список заявок
    } catch (error) {
      console.error('❌ Ошибка оценки пассажира:', error);
      showNotification(error.message || 'Ошибка оценки пассажира', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Оценить';
    }
  });
}

window.openPassengerRatingModal = openPassengerRatingModal;

console.log("✅ Profile.js loaded");
