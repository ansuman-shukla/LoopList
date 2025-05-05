import axiosInstance from './axios';

export const login = async (email, password) => {
  const formData = new FormData();
  formData.append('username', email); // FastAPI OAuth2 expects 'username'
  formData.append('password', password);
  
  const response = await axiosInstance.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  return response.data;
};

export const signup = async (userData) => {
  const response = await axiosInstance.post('/auth/signup', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get('/users/me');
    return response.data;
  } catch (error) {
    return null;
  }
};
