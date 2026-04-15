import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = Cookies.get('gc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('gc_token');
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (email: string, password: string, displayName: string) =>
    api.post('/auth/register', { email, password, displayName }),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (userId: string, code: string) => api.post('/auth/verify-email', { userId, code }),
  resendCode: (userId: string) => api.post('/auth/resend-code', { userId }),
};

// Profiles
export const profileAPI = {
  getAll: (params?: Record<string, string>) => api.get('/profiles', { params }),
  getOne: (userId: string) => api.get(`/profiles/${userId}`),
  update: (data: Record<string, unknown>) => api.put('/profiles/me', data),
  uploadPhotos: (formData: FormData) => api.post('/profiles/me/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto: (photoId: string) => api.delete(`/profiles/me/photos/${photoId}`),
  like: (userId: string) => api.post(`/profiles/${userId}/like`),
  unlike: (userId: string) => api.delete(`/profiles/${userId}/like`),
};

// Messages
export const messageAPI = {
  getConversations: () => api.get('/messages'),
  getConversation: (userId: string) => api.get(`/messages/${userId}`),
  send: (userId: string, content: string) => api.post(`/messages/${userId}`, { content }),
  markRead: (userId: string) => api.put(`/messages/${userId}/read`),
};

// Payments
export const paymentAPI = {
  getPlans: () => api.get('/payments/plans'),
  createInvoice: (tier: string) => api.post('/payments/invoice', { tier }),
  getStatus: (invoiceId: string) => api.get(`/payments/status/${invoiceId}`),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getCompanions: () => api.get('/admin/companions'),
  createCompanion: (data: Record<string, unknown>) => api.post('/admin/companions', data),
  publishCompanion: (userId: string, isPublished: boolean) => api.patch(`/admin/companions/${userId}/publish`, { isPublished }),
  getMembers: () => api.get('/admin/members'),
  setUserActive: (userId: string, isActive: boolean) => api.patch(`/admin/users/${userId}/active`, { isActive }),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
};
