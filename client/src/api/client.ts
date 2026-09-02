import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3335/api/v1';
const cleanBase = rawBaseURL.replace(/\/+$/, '');
const baseURL = cleanBase.includes('/api/v1')
  ? cleanBase
  : cleanBase.includes('/api')
    ? `${cleanBase}/v1`
    : `${cleanBase}/api/v1`;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});
