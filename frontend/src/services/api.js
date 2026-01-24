import axios from 'axios';

const API_URL = 'http://127.0.0.1:8001/api/';

// 1. Define this helper at the TOP so other functions can use it
const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            // 'Content-Type': 'multipart/form-data' // axios sets this automatically for FormData
        }
    };
};

export const getAnnouncements = () => axios.get(`${API_URL}announcements/`);

// 2. FIXED: Now we pass the auth headers as the 3rd argument
export const createAnnouncement = (data) => {
    return axios.post(`${API_URL}announcements/`, data, getAuthHeader());
};

export const getMyAnnouncements = () =>
    axios.get(`${API_URL}announcements/me/`, getAuthHeader());

export const deleteAnnouncement = (id) =>
    axios.delete(`${API_URL}announcements/${id}/`, getAuthHeader());