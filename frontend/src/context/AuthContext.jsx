import { createContext, useState, useEffect } from 'react';
import { login as apiLogin, signup as apiSignup, getCurrentUser } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = await getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem('token', data.access_token);
      const userData = await getCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
      throw err;
    }
  };

  const signup = async (userData) => {
    setError(null);
    try {
      const data = await apiSignup(userData);
      localStorage.setItem('token', data.access_token);
      const user = await getCurrentUser();
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
