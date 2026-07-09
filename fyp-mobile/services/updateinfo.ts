// utils/api.ts
import axios from 'axios';

const updateinfo = axios.create({
  baseURL: 'https://eventify-hub.onrender.com', // ⚠️ Replace with your actual local IP address
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
 
export default updateinfo;
