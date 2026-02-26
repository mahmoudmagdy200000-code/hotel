import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/';

const http = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth token
http.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const selectedBranchId = localStorage.getItem('selectedBranchId');
        if (selectedBranchId) {
            config.headers['X-Branch-Id'] = selectedBranchId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
http.interceptors.response.use(
    (response) => response,
    (error) => {
        const isHead404 = error.config?.method === 'head' && error.response?.status === 404;

        if (error.response?.status === 401) {
            console.warn('Unauthorized - 401');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else if (!isHead404 && error.response) {
            // Log other API errors to console for debugging, except expected HEAD 404s
            console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} ${error.response.status}`, error.response.data);
        }

        return Promise.reject(error);
    }
);

export default http;
