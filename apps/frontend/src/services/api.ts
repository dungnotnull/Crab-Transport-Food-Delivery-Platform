import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const getToken = () => sessionStorage.getItem('crab_access_token') || localStorage.getItem('crab_access_token');
const clearAuth = () => {
  sessionStorage.removeItem('crab_access_token');
  sessionStorage.removeItem('crab_user');
  localStorage.removeItem('crab_access_token');
  localStorage.removeItem('crab_user');
};

// Gắn Token tự động vào Header nếu có
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor chuẩn hóa response/error
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ -> xóa token
      clearAuth();
    }
    return Promise.reject(error);
  }
);
