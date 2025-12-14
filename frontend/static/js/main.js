'use strict';
// ==========================================
// AVATAR STORAGE (IndexedDB для сохранения аватара)
// ==========================================
const AvatarStorage = {
  dbName: 'HermesDB',
  storeName: 'avatars',
  version: 1,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  },

  async saveAvatar(userId, avatarData) {
    try {
      const db = await this.init();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.put(avatarData, `user_${userId}`);
      console.log('✅ Аватар сохранён в IndexedDB');
    } catch (error) {
      console.error('❌ Ошибка сохранения аватара:', error);
    }
  },

  async getAvatar(userId) {
    try {
      const db = await this.init();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      return new Promise((resolve, reject) => {
        const request = store.get(`user_${userId}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Ошибка загрузки аватара:', error);
      return null;
    }
  },

  async removeAvatar(userId) {
    try {
      const db = await this.init();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.delete(`user_${userId}`);
      console.log('✅ Аватар удалён из IndexedDB');
    } catch (error) {
      console.error('❌ Ошибка удаления аватара:', error);
    }
  }
};

window.AvatarStorage = AvatarStorage;



// ==========================================
// SHARED STORAGE
// ==========================================
if (!window.AppStorage) {
  window.AppStorage = {
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        console.log('📦 AppStorage.set:', key, value);
        return true;
      } catch (e) {
        console.error('localStorage set error:', e);
        return false;
      }
    },
    get: function (key) {
      try {
        const item = localStorage.getItem(key);
        const result = item ? JSON.parse(item) : null;
        console.log('📦 AppStorage.get:', key, result);
        return result;
      } catch (e) {
        console.error('localStorage get error:', e);
        return null;
      }
    },
    remove: function (key) {
      localStorage.removeItem(key);
      console.log('📦 AppStorage.remove:', key);
    },
    clear: function () {
      localStorage.clear();
      console.log('📦 AppStorage.clear');
    }
  };
}

// ==========================================
// DATE UTILITIES
// ==========================================
window.DateUtils = {
  formatDate: function (dateString) {
    try {
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      return new Date(dateString).toLocaleDateString('ru-RU', options);
    } catch (e) {
      console.error('Date format error:', e);
      return dateString;
    }
  },
  
  formatTime: function (timeString) {
    if (!timeString) return '';
    
    // Если уже в формате HH:MM
    if (typeof timeString === 'string') {
      // Убираем секунды если есть (HH:MM:SS -> HH:MM)
      return timeString.substring(0, 5);
    }
    
    // Если это объект времени
    try {
      const time = new Date(timeString);
      return time.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return timeString;
    }
  },
  
  isFutureDate: function (dateString) {
    try {
      return new Date(dateString) > new Date();
    } catch (e) {
      return false;
    }
  },
  
  getDaysDifference: function (dateString) {
    try {
      const diff = new Date(dateString) - new Date();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 0;
    }
  }
};

// ==========================================
// NOTIFICATIONS
// ==========================================
window.showNotification = function (message, type = 'info', duration = 5000) {
  let container = document.querySelector('.notifications-container');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'notifications-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }

  // Добавляем стили если их нет
  if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
      .notification {
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        margin-bottom: 10px;
        border-left: 4px solid #3498db;
        animation: slideInRight 0.3s ease;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      .notification-success {
        border-left-color: #27ae60;
        background: #f0fff4;
      }
      
      .notification-error {
        border-left-color: #e74c3c;
        background: #fdf2f2;
      }
      
      .notification-warning {
        border-left-color: #f39c12;
        background: #fff3cd;
      }
      
      .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .notification-message {
        flex: 1;
        font-size: 14px;
      }
      
      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #7f8c8d;
        margin-left: 10px;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .notification-close:hover {
        color: #34495e;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close" title="Закрыть">×</button>
    </div>
  `;

  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', function() {
    notification.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  });

  container.appendChild(notification);

  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  return notification;
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Main.js initialized');
  initApp();
});

function initApp() {
  checkAuthStatus();
  initNavigation();
  initForms();
  initCheckboxes();
  console.log('✅ App initialized');
}

// ==========================================
// AUTH STATUS CHECK
// ==========================================
function checkAuthStatus() {
  const token = AppStorage.get('authToken');
  const user = AppStorage.get('user');

  if (token && user) {
    try {
      updateUIForAuthUser(user);
      console.log('✅ Пользователь авторизован:', user.name);
    } catch (e) {
      console.error('Auth UI error:', e);
      clearAuthData();
    }
  } else {
    updateUIForGuest();
  }
}

function updateUIForAuthUser(user) {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const loginLink = navLinks.querySelector('a[href="login.html"]');
  const registerLink = navLinks.querySelector('a[href="register.html"]');

  if (loginLink) {
    loginLink.textContent = user.name;
    loginLink.href = 'profile.html';
    loginLink.classList.remove('btn-outline');
  }

  if (registerLink) {
    registerLink.textContent = 'Выйти';
    registerLink.href = '#';
    registerLink.classList.add('btn-outline');
    registerLink.addEventListener('click', function (e) {
      e.preventDefault();
      logout();
    });
  }

  const welcomeElement = document.querySelector('.welcome-message');
  if (welcomeElement) {
    welcomeElement.textContent = `Добро пожаловать, ${user.name}!`;
  }
}

function updateUIForGuest() {
  console.log('👤 Гость');
}

window.logout = function() {
  if (confirm('Вы уверены, что хотите выйти?')) {
    clearAuthData();
    showNotification('Вы вышли из системы', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
  }
};

function clearAuthData() {
  AppStorage.remove('authToken');
  AppStorage.remove('user');
  AppStorage.remove('userTrips');
  AppStorage.remove('lastLoginEmail');
}

// ==========================================
// NAVIGATION
// ==========================================
function initNavigation() {
  highlightCurrentPage();
}

function highlightCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a[href]');

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ==========================================
// FORMS VALIDATION
// ==========================================
function initForms() {
  const forms = document.querySelectorAll('form:not([data-no-validation])');

  forms.forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (validateForm(this)) {
        handleFormSubmit(this);
      }
    });
  });

  initLiveValidation();
}

function initLiveValidation() {
  const inputs = document.querySelectorAll('input[required], textarea[required]');

  inputs.forEach(input => {
    input.addEventListener('blur', function () {
      validateField(this);
    });

    input.addEventListener('input', function () {
      clearError(this);
    });
  });
}

function validateField(field) {
  const value = field.value.trim();

  if (field.hasAttribute('required') && !value) {
    showFieldError(field, 'Поле обязательно для заполнения');
    return false;
  }

  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showFieldError(field, 'Введите корректный email');
      return false;
    }
  }

  if (field.type === 'tel' && value) {
    const phoneRegex = /^[+]?[0-9-]{10,}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      showFieldError(field, 'Введите корректный номер телефона');
      return false;
    }
  }

  clearFieldError(field);
  return true;
}

function validateForm(form) {
  const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
  let isValid = true;

  inputs.forEach(input => {
    if (!validateField(input)) {
      isValid = false;
    }
  });

  return isValid;
}

function showFieldError(field, message) {
  clearFieldError(field);

  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    color: #e74c3c;
    font-size: 0.8rem;
    margin-top: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #fdf2f2;
    border-radius: 4px;
    border-left: 3px solid #e74c3c;
  `;

  field.style.borderColor = '#e74c3c';
  field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
  const errorDiv = field.parentNode.querySelector('.field-error');
  if (errorDiv) errorDiv.remove();
  field.style.borderColor = '';
}

function clearError(field) {
  clearFieldError(field);
}

function handleFormSubmit(form) {
  console.log('📝 Form submitted:', form.id);

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ Отправка...';
  submitBtn.disabled = true;

  setTimeout(() => {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    showNotification('Форма успешно отправлена!', 'success');
  }, 1500);
}

// ==========================================
// CHECKBOXES
// ==========================================
function initCheckboxes() {
  const checkboxes = document.querySelectorAll('.checkbox-hidden');

  checkboxes.forEach(checkbox => {
    const checkmark = checkbox.nextElementSibling;
    if (!checkmark || !checkmark.classList.contains('checkmark')) return;

    const container = checkbox.closest('.checkbox-container') || checkbox.closest('.checkbox-label');

    if (container) {
      container.addEventListener('click', function (e) {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          updateCheckboxAppearance(checkbox, checkmark);

          const event = new Event('change', { bubbles: true });
          checkbox.dispatchEvent(event);
        }
      });
    }

    checkbox.addEventListener('change', function () {
      updateCheckboxAppearance(this, checkmark);
    });

    updateCheckboxAppearance(checkbox, checkmark);
  });
}

function updateCheckboxAppearance(checkbox, checkmark) {
  if (checkbox.checked) {
    checkmark.style.backgroundColor = '#3498db';
    checkmark.style.borderColor = '#3498db';
    checkmark.innerHTML = '✓';
    checkmark.style.color = 'white';
    checkmark.style.fontWeight = 'bold';
    checkmark.style.display = 'flex';
    checkmark.style.alignItems = 'center';
    checkmark.style.justifyContent = 'center';
    checkmark.style.fontSize = '14px';
  } else {
    checkmark.style.backgroundColor = '';
    checkmark.style.borderColor = '#bdc3c7';
    checkmark.innerHTML = '';
  }
}
// ==========================================
// CREATE TRIP HANDLER
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  const createTripForm = document.getElementById('createTripForm');
  if (createTripForm) {
    console.log('📋 Create trip form found');
    
    createTripForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('📝 Create trip form submitted');

      const formData = new FormData(this);
      const tripData = {
        fromCity: formData.get('fromCity'),
        toCity: formData.get('toCity'),
        tripDate: formData.get('tripDate'),
        tripTime: formData.get('tripTime'),
        seats: parseInt(formData.get('seats')),
        price: parseInt(formData.get('price')),
        description: formData.get('description') || '',
        noSmoking: formData.get('noSmoking') === 'on',
        animalsAllowed: formData.get('animalsAllowed') === 'on',
        musicAllowed: formData.get('musicAllowed') === 'on'
      };

      console.log('📤 Trip data:', tripData);

      // Валидация
      if (!tripData.fromCity || !tripData.toCity) {
        showNotification('Укажите город отправления и прибытия', 'error');
        return;
      }

      if (!tripData.tripDate || !tripData.tripTime) {
        showNotification('Укажите дату и время поездки', 'error');
        return;
      }

      if (tripData.seats < 1 || tripData.seats > 8) {
        showNotification('Количество мест должно быть от 1 до 8', 'error');
        return;
      }

      if (tripData.price < 0) {
        showNotification('Цена не может быть отрицательной', 'error');
        return;
      }

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Создание...';

      try {
        console.log('📡 Отправка запроса на создание поездки...');
        const response = await window.apiClient.createTrip(tripData);
        console.log('✅ Поездка создана:', response);

        showNotification('Поездка успешно создана!', 'success');
        this.reset();

        // Перенаправляем в профиль
        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 1500);
      } catch (error) {
        console.error('❌ Ошибка создания поездки:', error);
        showNotification(error.message || 'Не удалось создать поездку', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
});

console.log('✅ Main.js loaded');
