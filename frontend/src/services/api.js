import axios from 'axios';

const API_URL = 'http://127.0.0.1:8001/api/'; // Use your port 8001

export const getAnnouncements = () => axios.get(`${API_URL}announcements/`);