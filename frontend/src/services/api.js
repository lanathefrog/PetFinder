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

// Globally handle 401 Unauthorized responses: clear local tokens and notify the app
API.interceptors.response.use(
    (response) => response,
    (error) => {
        try {
            const status = error?.response?.status;
            if (status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_id');
                // let app react (will set token state to null)
                window.dispatchEvent(new CustomEvent('unauthorized'));
            }
        } catch (e) {
            // ignore
        }
        return Promise.reject(error);
    }
);

export const getAnnouncements = (params = {}) => API.get('announcements/', { params });
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

export const startDirectConversation = (userId) =>
    API.post("chat/start_direct/", { user_id: userId });

export const getConversationMessages = (conversationId, params = {}) =>
    API.get(`chat/conversations/${conversationId}/messages/`, { params });

export const sendChatMessageHttp = (conversationId, text) =>
    API.post("chat/messages/", { conversation_id: conversationId, text });

export const markConversationRead = (conversationId) =>
    API.post(`chat/conversations/${conversationId}/read/`);

// Comments
export const getComments = (announcementId, params = {}) =>
    API.get(`announcements/${announcementId}/comments/`, { params });

export const createComment = (announcementId, data) =>
    API.post(`announcements/${announcementId}/comments/`, data);

export const deleteComment = (commentId) =>
    API.delete(`comments/${commentId}/`);
export const updateComment = (commentId, data) =>
    API.patch(`comments/${commentId}/`, data);


export const toggleCommentReaction = (commentId, kind) =>
    API.post(`comments/${commentId}/reactions/`, { kind });

// Users
export const getUser = (userId) => API.get(`users/${userId}/`);
export const contactAnnouncementOwner = (announcementId) => API.post(`announcements/${announcementId}/contact_owner/`);
