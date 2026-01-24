// src/services/api.js
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8001/api/';

export const getAnnouncements = () => axios.get(`${API_URL}announcements/`);

// Add this function:
export const createAnnouncement = (data) => axios.post(`${API_URL}announcements/`, data);
// Add a header with your token for private data
const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
});

export const getMyAnnouncements = () =>
    axios.get(`${API_URL}announcements/me/`, getAuthHeader());

export const deleteAnnouncement = (id) =>
    axios.delete(`${API_URL}announcements/${id}/`, getAuthHeader());