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
export const getAnnouncement = (id) => API.get(`announcements/${id}/`);
export const getMyAnnouncements = () => API.get('announcements/me/');
export const createAnnouncement = (data) => API.post('announcements/', data);
export const deleteAnnouncement = (id) => API.delete(`announcements/${id}/`);
export const updateAnnouncement = (id, data) =>
    API.patch(`announcements/${id}/`, data);
export const saveAnnouncement = (id) => API.post(`announcements/${id}/save/`);
export const unsaveAnnouncement = (id) => API.delete(`announcements/${id}/save/`);
export const getMySavedAnnouncements = () => API.get("users/me/saved/");
export const getNotifications = () => API.get("notifications/");
export const markNotificationsRead = (ids = []) =>
    API.post("notifications/read/", { ids });

export const getChatConversations = (params = {}) =>
    API.get("chat/conversations/", { params });

export const startChatConversation = (announcementId) =>
    API.post("chat/start/", { announcement_id: announcementId });

export const getConversationMessages = (conversationId, params = {}) =>
    API.get(`chat/conversations/${conversationId}/messages/`, { params });

export const sendChatMessageHttp = (conversationId, text) =>
    API.post("chat/messages/", { conversation_id: conversationId, text });

export const markConversationRead = (conversationId) =>
    API.post(`chat/conversations/${conversationId}/read/`);
