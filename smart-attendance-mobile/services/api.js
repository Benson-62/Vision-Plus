import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Centralised configurable URL (Requirement 4)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-production-backend.com';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            SecureStore.deleteItemAsync('token');
        }
        return Promise.reject(error);
    }
);

export default api;
