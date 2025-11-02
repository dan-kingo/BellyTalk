import axios from 'axios';
const api = axios.create({
  baseURL: "https://bellytalk.onrender.com",
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
   if (error.response?.status === 401) {
  // wait a moment to ensure rehydration is not happening
  setTimeout(() => {
    if (!localStorage.getItem('access_token')) {
      window.location.href = '/login';
    }
  },500);
}
    return Promise.reject(error);
  }
);

export default api;
