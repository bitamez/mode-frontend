
import client from './client';

const authAPI = {
    // Register a new user
    signup: (userData) => {
        return client.post('/auth/signup', userData);
    },

    // Login user
    login: (credentials) => {
        return client.post('/auth/login', credentials);
    },

    // Get user profile
    getProfile: (userId) => {
        return client.get(`/auth/profile/${userId}`);
    },

    // Check if email exists
    checkEmail: (email) => {
        return client.get(`/auth/check-email/${encodeURIComponent(email)}`);
    },

    // Check if username exists
    checkUsername: (username) => {
        return client.get(`/auth/check-username/${encodeURIComponent(username)}`);
    }
};

export default authAPI;
