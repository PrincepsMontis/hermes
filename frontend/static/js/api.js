// ==========================================
// API CLIENT
// ==========================================

class ApiClient {
    constructor() {
        this.baseURL = '/api/v1';
        this.token = window.AppStorage ? AppStorage.get('authToken') : null;
        console.log('🔐 ApiClient token on init:', this.token);
    }

    setToken(token) {
        this.token = token;
        if (window.AppStorage) {
            AppStorage.set('authToken', token);
        }
        console.log('🔐 ApiClient setToken:', this.token);
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        };

        if (options.body) {
            config.body = options.body;
        }

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        console.log('📡 API request:', url, config);

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const error = await response.json();
                    errorMessage = error.error || error.message || errorMessage;
                } catch (_) {
                }
                throw new Error(errorMessage);
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // ==========================================
    // AUTH METHODS
    // ==========================================

    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (data && data.token) {
            this.setToken(data.token);
            if (window.AppStorage && data.user) {
                AppStorage.set('user', data.user);
            }
        }

        return data;
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    // ==========================================
    // USER METHODS
    // ==========================================

    async getProfile() {
        return this.request('/users/profile');
    }

    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    // ==========================================
    // TRIP METHODS
    // ==========================================

    async searchTrips(params) {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key]) {
                queryParams.append(key, params[key]);
            }
        });

        const qs = queryParams.toString();
        const endpoint = qs ? `/trips/search?${qs}` : '/trips/search';
        return this.request(endpoint);
    }

    async getTrip(id) {
        return this.request(`/trips/${id}`);
    }

    async getTripById(id) {
        return this.getTrip(id);
    }

    async createTrip(tripData) {
        return this.request('/trips', {
            method: 'POST',
            body: JSON.stringify(tripData),
        });
    }

    async getMyTrips() {
        return this.request('/trips/my-trips');
    }

    async deleteTrip(id) {
        return this.request(`/trips/${id}`, {
            method: 'DELETE',
        });
    }

    async cancelTrip(id) {
        return this.request(`/trips/${id}/cancel`, {
            method: 'PATCH',
        });
    }

    async completeTrip(id) {
        return this.request(`/trips/${id}/complete`, {
            method: 'PATCH',
        });
    }


    // ==========================================
    // BOOKING METHODS
    // ==========================================

    async createBooking(bookingData) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    }

    async getMyBookings() {
        return this.request('/bookings/my-bookings');
    }

    async getDriverBookings() {
        return this.request('/bookings/driver');
    }

    async updateBookingStatus(bookingId, status) {
        return this.request(`/bookings/${bookingId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

        async ratePassenger(bookingId, rating, comment) {
        return this.request(`/bookings/${bookingId}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating, comment }),
        });
    }


    // ==========================================
    // REVIEW METHODS
    // ==========================================

    async createReview(reviewData) {
        return this.request('/reviews', {
            method: 'POST',
            body: JSON.stringify(reviewData),
        });
    }

    async getUserReviews(userId) {
        return this.request(`/reviews/user/${userId}`);
    }

    async getMyReviews() {
        return this.request('/reviews/my-reviews');
    }

    async createPassengerReview(reviewData) {
        return this.request('/reviews/passenger', {
            method: 'POST',
            body: JSON.stringify(reviewData),
        });
    }

}

// Глобальный экземпляр API клиента
window.apiClient = new ApiClient();
console.log('✅ API Client initialized');
