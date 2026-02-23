import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8001/api/'
});

// 🔥 ДОДАЄМО ТОКЕН В КОЖЕН ЗАПИТ
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getAnnouncements = () => API.get('announcements/');
export const getMyAnnouncements = () => API.get('announcements/me/');
export const createAnnouncement = (data) => API.post('announcements/', data);
export const deleteAnnouncement = (id) => API.delete(`announcements/${id}/`);
export const updateAnnouncement = (id, data) =>
    API.patch(`announcements/${id}/`, data);
