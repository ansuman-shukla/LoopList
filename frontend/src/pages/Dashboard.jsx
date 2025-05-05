import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoopCard from '../components/loops/LoopCard';
import axiosInstance from '../api/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState('active');
  const [loops, setLoops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Direct API call function
  const fetchLoops = async (status) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Directly fetching loops with status: ${status}`);

      // Add cache-busting parameter
      const timestamp = new Date().getTime();
      const response = await axiosInstance.get('/loops', {
        params: {
          status,
          skip: 0,
          limit: 50,  // Increased limit to get more loops at once
          _t: timestamp
        }
      });

      console.log('API response:', response.data);

      // Process the data to ensure each loop has an id property
      const processedData = response.data.map(loop => {
        const processedLoop = { ...loop };

        // If the loop has _id but no id, add id property
        if (loop._id && !loop.id) {
          processedLoop.id = loop._id;
        }

        // Ensure reaction_count is a number
        if (loop.reaction_count !== undefined) {
          processedLoop.reaction_count = Number(loop.reaction_count);
        } else {
          processedLoop.reaction_count = 0;
        }

        return processedLoop;
      });

      setLoops(processedData);
      return processedData;
    } catch (err) {
      console.error('Error fetching loops:', err);
      setError(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch loops when component mounts or status changes
  useEffect(() => {
    console.log('Dashboard mounted or status changed, fetching loops...');
    fetchLoops(activeStatus);

    // Set up an interval to refresh the data every 30 seconds
    const intervalId = setInterval(() => {
      console.log('Refreshing loops data...');
      fetchLoops(activeStatus);
    }, 30000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [activeStatus]);

  // Handle status change
  const handleStatusChange = (status) => {
    setActiveStatus(status);
  };

  // Handle loop completion
  const handleComplete = async (loopId) => {
    try {
      if (!loopId) {
        console.error('Invalid loop ID');
        alert('Failed to complete loop: Invalid loop ID');
        return;
      }

      const id = String(loopId);
      console.log(`Completing loop with ID: ${id}`);

      // Get today's date in ISO format
      const today = new Date().toISOString().split('T')[0];

      // Make the API call directly
      const response = await axiosInstance.post(`/loops/${id}/complete`, {
        completion_date: today
      });

      console.log('Loop completed successfully:', response.data);
      alert('Loop completed successfully!');

      // Refetch the loops to update the UI
      fetchLoops(activeStatus);
    } catch (error) {
      console.error('Error completing loop:', error);
      alert(error.response?.data?.detail || 'Failed to complete loop. Please try again.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
        <h3 className="text-lg font-semibold mb-2">Error Loading Loops</h3>
        <p>{error.message || 'An error occurred while loading your loops.'}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fetchLoops(activeStatus)}
        >
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user?.username || 'User'}!
          </p>
        </div>

        <Link to="/loops/create">
          <Button>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Loop
          </Button>
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-4 py-2 font-medium ${
            activeStatus === 'active'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleStatusChange('active')}
        >
          Active
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeStatus === 'completed'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleStatusChange('completed')}
        >
          Completed
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeStatus === 'archived'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => handleStatusChange('archived')}
        >
          Archived
        </button>
      </div>

      {/* Loops Grid */}
      {loops.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No Loops Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {activeStatus === 'active'
              ? "You don't have any active loops yet."
              : `You don't have any ${activeStatus} loops.`}
          </p>
          {activeStatus === 'active' && (
            <Link to="/loops/create">
              <Button>Create Your First Loop</Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loops.map(loop => (
              <LoopCard
                key={loop.id || loop._id}
                loop={loop}
                onComplete={handleComplete}
                showReactions={false}
              />
            ))}
          </div>

          {/* End of content message */}
          {loops.length > 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>You've reached the end of your loops</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
