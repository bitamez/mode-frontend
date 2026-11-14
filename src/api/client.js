
import axios from 'axios';

const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('API URL:', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

// Attach saved login token to every API request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth-token');

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Handle API errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('API Error:', error.response.data);

            // Do not automatically delete the login token here.
            // Authentication should be checked by the backend.
        } else if (error.request) {
            console.error('Network Error:', error.message);
        } else {
            console.error('Request Error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
export { api };
