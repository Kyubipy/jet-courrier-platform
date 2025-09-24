import axios from 'axios';

const API_URL = 'https://jet-courrier-api.onrender.com';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (userData) => api.post('/api/auth/register/client', userData),
};

export const orderAPI = {
  create: (orderData) => api.post('/api/orders/create', orderData),
  getClientOrders: (clientId) => api.get(`/api/orders/client/${clientId}`),
  getOrderDetails: (orderId) => api.get(`/api/orders/${orderId}`),
};

export const matchingAPI = {
  findDelivery: (coordinates) => api.post('/api/matching/find-delivery', coordinates),
};