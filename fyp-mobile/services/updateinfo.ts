// utils/api.ts
import axios from 'axios';

const updateinfo = axios.create({
  baseURL: 'http://192.168.1.20:3000', // ⚠️ Replace with your actual local IP address
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
 
export default updateinfo;
