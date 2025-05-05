import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLoops, useCompleteLoop } from '../hooks/useLoops';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoopCard from '../components/loops/LoopCard';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeStatus, setActiveStatus] = useState('active');
  const [page, setPage] = useState(0);
  const [allLoops, setAllLoops] = useState([]);
  const limit = 12; // Number of loops to load per page
  const loaderRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);

  const { data: loops = [], isLoading, error, isFetching } = useLoops(activeStatus, page, limit);
  const completeLoopMutation = useCompleteLoop();

  // Enhanced debug logging
  console.log('Current user:', user);
  console.log('User ID:', user?.id);
  console.log('Active status:', activeStatus);
  console.log('Page:', page);
  console.log('Loops data:', loops);
  console.log('All loops:', allLoops);
  console.log('Is loading:', isLoading);
  console.log('Is fetching:', isFetching);
  console.log('Error:', error);
  console.log('Has more:', hasMore);

  // Update allLoops when new data is fetched
  useEffect(() => {
    if (loops) {
      if (loops.length < limit) {
        setHasMore(false);
      }

      if (page === 0) {
        setAllLoops(loops);
      } else {
        setAllLoops(prev => [...prev, ...loops]);
      }
    }
  }, [loops, page, limit]);

  // Reset pagination when status changes
  useEffect(() => {
    setPage(0);
    setAllLoops([]);
    setHasMore(true);
  }, [activeStatus]);

  // Infinite scroll implementation
  const handleObserver = useCallback((entries) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isFetching]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 0
    };

    const observer = new IntersectionObserver(handleObserver, option);

    if (loaderRef.current) observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [handleObserver]);

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

  if (isLoading && page === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && page === 0) {
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
      {allLoops.length === 0 && !isLoading ? (
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
            {allLoops.map(loop => (
              <LoopCard
                key={loop.id || loop._id}
                loop={loop}
                onComplete={handleComplete}
                showReactions={false}
              />
            ))}
          </div>

          {/* Loading indicator for infinite scroll */}
          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-8 mt-4">
              {isFetching && (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              )}
            </div>
          )}

          {/* End of content message */}
          {!hasMore && allLoops.length > 0 && (
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
