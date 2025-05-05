import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoops, useCompleteLoop } from '../hooks/useLoops';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoopCard from '../components/loops/LoopCard';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeStatus, setActiveStatus] = useState('active');
  const { data: loops = [], isLoading, error } = useLoops(activeStatus);
  const completeLoopMutation = useCompleteLoop();

  // Enhanced debug logging
  console.log('Current user:', user);
  console.log('User ID:', user?.id);
  console.log('Active status:', activeStatus);
  console.log('Loops data:', loops);
  console.log('Is loading:', isLoading);
  console.log('Error:', error);

  // Check if loops array is empty
  if (loops.length === 0) {
    console.log('No loops found in the data');
  } else {
    console.log(`Found ${loops.length} loops`);
    loops.forEach((loop, index) => {
      console.log(`Loop ${index + 1}:`, loop);
      console.log(`Loop ${index + 1} ID:`, loop.id || loop._id);
      console.log(`Loop ${index + 1} user_id:`, loop.user_id);
      console.log(`Loop ${index + 1} status:`, loop.status);
      console.log(`Loop ${index + 1} reaction_count:`, loop.reaction_count);
      console.log(`Loop ${index + 1} reaction_count type:`, typeof loop.reaction_count);
      console.log(`Loop ${index + 1} visibility:`, loop.visibility);
    });
  }

  const handleComplete = (loopId) => {
    try {
      // Ensure loopId is a valid string and not undefined or null
      if (!loopId) {
        console.error('Invalid loop ID: Loop ID is undefined or null');
        alert('Failed to complete loop: Invalid loop ID');
        return;
      }

      // Convert to string if it's not already
      const id = String(loopId);
      console.log(`Dashboard: Completing loop with ID: ${id}`);

      completeLoopMutation.mutate(
        { loopId: id },
        {
          onSuccess: (data) => {
            console.log('Loop completed successfully:', data);
            alert('Loop completed successfully!');
          },
          onError: (error) => {
            console.error('Error completing loop:', error);
            alert(error.response?.data?.detail || 'Failed to complete loop. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('Error in handleComplete:', error);
      alert(`Error completing loop: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
        <h3 className="text-lg font-semibold mb-2">Error Loading Loops</h3>
        <p>{error.message || 'An error occurred while loading your loops.'}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
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
          onClick={() => setActiveStatus('active')}
        >
          Active
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeStatus === 'completed'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveStatus('completed')}
        >
          Completed
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeStatus === 'archived'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveStatus('archived')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loops.map(loop => (
            <LoopCard
              key={loop.id}
              loop={loop}
              onComplete={handleComplete}
              showReactions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
