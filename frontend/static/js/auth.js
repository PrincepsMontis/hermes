// ==========================================
// SHARED UTILITIES (если main.js не загружен)
// ==========================================
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

window.showNotification = window.showNotification || function (message, type = 'info', duration = 5000) {
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
      .notification-success { border-left-color: #27ae60; background: #f0fff4; }
      .notification-error { border-left-color: #e74c3c; background: #fdf2f2; }
      .notification-warning { border-left-color: #f39c12; background: #fff3cd; }
      .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .notification-message { flex: 1; font-size: 14px; margin-right: 10px; }
      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #7f8c8d;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .notification-close:hover { color: #34495e; }
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .slideOut { animation: slideInRight 0.3s ease reverse; }
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
  closeBtn.addEventListener('click', function () {
    notification.classList.add('slideOut');
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 300);
  });

  container.appendChild(notification);

  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('slideOut');
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  return notification;
};

// ==========================================
// AUTH SYSTEM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
  console.log("🔐 Auth.js initialized");
  initAuthSystem();
});

function initAuthSystem() {
  console.log("🚀 Инициализация системы авторизации...");

  try {
    const user = AppStorage.get('user');
    if (user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
      showNotification('Вы уже авторизованы', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
      return;
    }
  } catch (e) {
    console.error("Auth check error:", e);
  }

  initAuthForms();
  prefillFormData();
  initCheckboxes();
}

function initAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    console.log("📝 Login form found");
    loginForm.addEventListener('submit', handleLogin);
    initPasswordToggle(loginForm);
  }

  if (registerForm) {
    console.log("📝 Register form found");
    registerForm.addEventListener('submit', handleRegister);
    initPasswordToggle(registerForm);
    initPasswordValidation();
  }
}

function initPasswordToggle(form) {
  const toggleButtons = form.querySelectorAll('.password-toggle');
  toggleButtons.forEach(button => {
    button.addEventListener('click', function () {
      const input = this.parentNode.querySelector('input');
      if (!input) return;

      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      this.textContent = type === 'password' ? '👁️' : '🙈';
    });
  });
}

function initPasswordValidation() {
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');

  if (passwordInput && confirmInput) {
    passwordInput.addEventListener('input', function () {
      validatePasswordMatch(passwordInput, confirmInput);
    });
    confirmInput.addEventListener('input', () => validatePasswordMatch(passwordInput, confirmInput));
  }
}

function validatePasswordMatch(password, confirmPassword) {
  if (password.value !== confirmPassword.value && confirmPassword.value.length > 0) {
    showError(confirmPassword, 'Пароли не совпадают');
    return false;
  } else {
    clearError(confirmPassword);
    return true;
  }
}

function prefillFormData() {
  try {
    const savedEmail = localStorage.getItem('lastLoginEmail');
    if (savedEmail) {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.value = savedEmail;
        console.log("✅ Предзаполнен email:", savedEmail);
      }
    }
  } catch (e) {
    console.log("Не удалось предзаполнить email", e);
  }
}

// ==========================================
// LOGIN HANDLER (РЕАЛЬНЫЙ API)
// ==========================================
async function handleLogin(e) {
  e.preventDefault();
  console.log("🔐 Попытка входа...");

  const formData = new FormData(e.target);
  const credentials = {
    email: formData.get('email').trim(),
    password: formData.get('password'),
  };

  if (!validateLoginForm(credentials)) return;

  // Сохраняем email для автозаполнения
  try {
    localStorage.setItem('lastLoginEmail', credentials.email);
  } catch (e) {
    console.log("Не удалось сохранить email", e);
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (!submitBtn) return;

  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ Вход...';
  submitBtn.disabled = true;

  try {
    console.log("📡 Отправка запроса на сервер...");
    
    // РЕАЛЬНЫЙ API ВЫЗОВ
    const result = await window.apiClient.login(credentials);
    
    // Сохраняем токен в apiClient
    window.apiClient.setToken(result.token);
    
    // Сохраняем данные пользователя
    AppStorage.set('authToken', result.token);
    AppStorage.set('user', result.user);

    showNotification(`Добро пожаловать, ${result.user.name}!`, 'success');
    console.log("✅ Успешный вход:", result.user);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (error) {
    console.error("❌ Ошибка входа:", error);
    showNotification(error.message || 'Неверный email или пароль', 'error');
    resetSubmitButton(submitBtn, originalText);
  }
}

// ==========================================
// REGISTER HANDLER (РЕАЛЬНЫЙ API)
// ==========================================
async function handleRegister(e) {
  e.preventDefault();
  console.log("📝 Попытка регистрации...");

  const formData = new FormData(e.target);
  const userData = {
    fullName: formData.get('fullName').trim(),
    email: formData.get('email').trim(),
    phone: formData.get('phone').trim(),
    password: formData.get('password'),
    isDriver: document.getElementById('isDriver') ? document.getElementById('isDriver').checked : false,
  };

  if (!validateRegisterForm(userData)) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (!submitBtn) return;

  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ Регистрация...';
  submitBtn.disabled = true;

  try {
    console.log("📡 Отправка данных регистрации...");
    
    // РЕАЛЬНЫЙ API ВЫЗОВ
    const result = await window.apiClient.register(userData);
    
    // Сохраняем токен в apiClient
    window.apiClient.setToken(result.token);
    
    // Сохраняем данные пользователя
    AppStorage.set('authToken', result.token);
    AppStorage.set('user', result.user);

    showNotification('Регистрация успешна! Добро пожаловать!', 'success');
    console.log("✅ Успешная регистрация:", result.user);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (error) {
    console.error("❌ Ошибка регистрации:", error);
    showNotification(error.message || 'Ошибка регистрации. Попробуйте другой email.', 'error');
    resetSubmitButton(submitBtn, originalText);
  }
}

// ==========================================
// VALIDATION
// ==========================================
function validateLoginForm(credentials) {
  if (!credentials.email) {
    showNotification('Введите email', 'error');
    return false;
  }
  if (!credentials.email.includes('@')) {
    showNotification('Введите корректный email адрес', 'error');
    return false;
  }
  if (!credentials.password) {
    showNotification('Введите пароль', 'error');
    return false;
  }
  return true;
}

function validateRegisterForm(userData) {
  if (!userData.fullName || userData.fullName.trim().length < 2) {
    showNotification('Введите полное имя (минимум 2 символа)', 'error');
    return false;
  }
  if (!userData.email || !userData.email.includes('@')) {
    showNotification('Введите корректный email адрес', 'error');
    return false;
  }
  if (!userData.phone || userData.phone.replace(/\D/g, '').length < 10) {
    showNotification('Введите корректный номер телефона', 'error');
    return false;
  }
  if (!userData.password || userData.password.length < 6) {
    showNotification('Пароль должен быть не менее 6 символов', 'error');
    return false;
  }

  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  if (passwordInput && confirmInput) {
    if (passwordInput.value !== confirmInput.value) {
      showNotification('Пароли не совпадают', 'error');
      return false;
    }
  }

  return true;
}

function resetSubmitButton(submitBtn, originalText) {
  submitBtn.textContent = originalText;
  submitBtn.disabled = false;
}

// ==========================================
// ERROR DISPLAY
// ==========================================
function showError(input, message) {
  clearError(input);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
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
  input.classList.add('error');
  input.parentNode.appendChild(errorDiv);
}

function clearError(input) {
  const errorDiv = input.parentNode.querySelector('.error-message');
  if (errorDiv) errorDiv.remove();
  input.classList.remove('error');
}

// ==========================================
// CHECKBOXES
// ==========================================
function initCheckboxes() {
  const checkboxes = document.querySelectorAll('.checkbox-hidden');
  checkboxes.forEach(checkbox => {
    const checkmark = checkbox.nextElementSibling;
    if (!checkmark || !checkmark.classList.contains('checkmark')) return;

    updateCheckboxAppearance(checkbox, checkmark);

    const container = checkbox.closest('.checkbox-container') || checkbox.closest('.checkbox-label');
    if (container) {
      container.addEventListener('click', function (e) {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          updateCheckboxAppearance(checkbox, checkmark);
        }
      });
    }

    checkbox.addEventListener('change', function () {
      updateCheckboxAppearance(this, checkmark);
    });
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

console.log("✅ Auth.js loaded");
