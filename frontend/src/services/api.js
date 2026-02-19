import axios from 'axios';

const API_URL = 'http://127.0.0.1:8001/api/';

// Допоміжна функція для отримання токена з пам'яті браузера
const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

// Отримання всіх оголошень (для головної сторінки)
export const getAnnouncements = () => axios.get(`${API_URL}announcements/`);

// Створення нового оголошення (Lost або Found)
export const createAnnouncement = (data) => {
    return axios.post(`${API_URL}announcements/`, data, getAuthHeader());
};

// Отримання тільки моїх оголошень (для Dashboard)
export const getMyAnnouncements = () => {
    return axios.get(`${API_URL}announcements/me/`, getAuthHeader());
};

// ВИДАЛЕННЯ оголошення
export const deleteAnnouncement = (id) => {
    return axios.delete(`${API_URL}announcements/${id}/`, getAuthHeader());
};

const api = {
    getAnnouncements: () => axios.get(`${API_URL}announcements/`),
    getMyAnnouncements: () => axios.get(`${API_URL}announcements/me/`, getAuthHeader()),
    createAnnouncement: (data) => axios.post(`${API_URL}announcements/`, data, {
        ...getAuthHeader(),
        headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'multipart/form-data'
        }
    }),
    deleteAnnouncement: (id) => axios.delete(`${API_URL}announcements/${id}/`, getAuthHeader()),
};


