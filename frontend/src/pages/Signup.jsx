import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SignupForm from '../components/auth/SignupForm';

const Signup = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Join LoopList</h1>
      <SignupForm />
    </div>
  );
};

export default Signup;
