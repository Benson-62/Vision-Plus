import axios from 'axios';

// 1. Replace localhost API URLs with environment variable-based API URL.
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_URL,
});

// Make sure to send cookies with requests
api.defaults.withCredentials = true;

// Request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Flag to prevent infinite loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if 401 and not already retrying (skip if the endpoint itself is auth/login or auth/refresh-token)
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !originalRequest.url.includes('/auth/refresh-token')) {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to get new token
                const refreshResponse = await api.post('/auth/refresh-token');
                const newToken = refreshResponse.data.access_token;

                localStorage.setItem('token', newToken);
                api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
                originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

                processQueue(null, newToken);
                return api(originalRequest);
            } catch (err) {
                // Refresh failed
                processQueue(err, null);
                localStorage.clear();
                window.location.href = '/';
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        // Just standard 401 and we failed
        if (error.response?.status === 401 && originalRequest.url.includes('/auth/refresh-token')) {
            localStorage.clear();
            window.location.href = '/';
        }

        return Promise.reject(error);
    }
);

export default api;
