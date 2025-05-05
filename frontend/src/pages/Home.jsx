import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeaderboard, cloneLoop } from '../api/public';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PublicLoopCard from '../components/loops/PublicLoopCard';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(0);
  const [allLoops, setAllLoops] = useState([]);
  const limit = 20; // Increased limit for infinite scroll
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loaderRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);

  // Only fetch leaderboard data if user is authenticated
  const { data: loops, isLoading, error, isFetching } = useQuery({
    queryKey: ['leaderboard', page],
    queryFn: () => getLeaderboard(page * limit, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isAuthenticated, // Only run query if user is authenticated
    keepPreviousData: true,
  });

  // Update allLoops when new data is fetched
  useEffect(() => {
    if (loops) {
      console.log('Loops data received in Home:', loops);

      // Check for reaction_counts in each loop
      if (loops.length > 0) {
        loops.forEach((loop, index) => {
          console.log(`Loop ${index} reaction_counts:`, loop.reaction_counts);
        });
      }

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

  // Infinite scroll implementation
  const handleObserver = useCallback((entries) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isFetching && isAuthenticated) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isFetching, isAuthenticated]);

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

  const handleClone = async (loopId) => {
    if (!isAuthenticated) {
      // Redirect to login
      navigate('/login');
      return;
    }

    // Validate loopId
    if (!loopId || loopId === 'undefined') {
      console.error('Invalid loop ID:', loopId);
      alert('Error: Cannot clone loop with invalid ID');
      return;
    }

    try {
      console.log('Cloning loop with ID:', loopId);

      // Make the API call
      const result = await cloneLoop(loopId);
      console.log('Clone result:', result);

      // Validate the result
      if (!result || (!result.id && !result._id)) {
        throw new Error('Invalid response: Missing loop ID in response');
      }

      // Show success message
      alert('Loop cloned successfully! Check your dashboard.');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leaderboard']);

      return true;
    } catch (error) {
      console.error('Error cloning loop:', error);

      // Handle different types of errors
      if (error.name === 'TypeError' && error.message.includes('Cannot read properties of undefined')) {
        console.error('API response is undefined or invalid');
        alert('Error: Server returned an invalid response. Please try again later.');
      } else if (error.response?.status === 404) {
        alert('Error: Loop not found or not available for cloning.');
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        alert('Error: You are not authorized to clone this loop. Please log in again.');
      } else {
        alert(`Error: ${error.message || 'Failed to clone loop'}`);
      }

      return false;
    }
  };

  // Content for unauthenticated users
  const renderUnauthenticatedContent = () => (
    <>
      {/* Hero Section */}
      <section className="py-12 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Build Micro-Habits with <span className="text-primary-600 dark:text-primary-400">Visual Progress</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          LoopList helps you track daily habits and build streaks with optional public accountability.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">Log In</Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <div className="text-4xl mb-4 text-primary-600 dark:text-primary-400">🔄</div>
            <h3 className="text-xl font-semibold mb-2">Create Loops</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Define micro-habits with flexible frequency options: daily, specific days, or custom patterns.
            </p>
          </Card>

          <Card>
            <div className="text-4xl mb-4 text-primary-600 dark:text-primary-400">🔥</div>
            <h3 className="text-xl font-semibold mb-2">Build Streaks</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Track your progress visually and maintain your streak. Don't break the chain!
            </p>
          </Card>

          <Card>
            <div className="text-4xl mb-4 text-primary-600 dark:text-primary-400">🌎</div>
            <h3 className="text-xl font-semibold mb-2">Share Publicly</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Optionally make your loops public for accountability and to inspire others.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 text-center">
        <Card className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Build Better Habits?</h2>
          <p className="mb-6 text-white/90">
            Join thousands of users who are building consistent habits with LoopList.
          </p>

          <Link to="/signup">
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600">
              Sign Up for Free
            </Button>
          </Link>
        </Card>
      </section>
    </>
  );

  // Content for authenticated users - Public Loop Boards
  const renderAuthenticatedContent = () => {
    if (isLoading && page === 0) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (error && page === 0) {
      return (
        <Card className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          <h3 className="text-lg font-semibold mb-2">Error Loading Public Loops</h3>
          <p>{error.message || 'An error occurred while loading public loops.'}</p>
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

    const publicLoops = allLoops || [];

    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Public Loop Boards</h1>
          <Link to="/loops/create">
            <Button size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Loop
            </Button>
          </Link>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Check out what others are working on. Get inspired, cheer them on with emoji reactions, or clone a loop to try it yourself!
        </p>

        {publicLoops.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold mb-2">No Public Loops Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Be the first to create a public loop and inspire others!
            </p>
            <Link to="/loops/create">
              <Button>Create a Public Loop</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-0">
            {/* Loop Feed - Instagram-like scrollable feed */}
            <div className="max-w-2xl mx-auto">
              {publicLoops.map((loop) => (
                <PublicLoopCard
                  key={loop.id || loop._id}
                  loop={loop}
                  onClone={handleClone}
                />
              ))}

              {/* Loading indicator for infinite scroll */}
              {hasMore && (
                <div ref={loaderRef} className="flex justify-center py-4">
                  {isFetching && (
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                  )}
                </div>
              )}

              {/* End of content message */}
              {!hasMore && publicLoops.length > 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>You've reached the end of the feed</p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {isAuthenticated ? renderAuthenticatedContent() : renderUnauthenticatedContent()}
    </div>
  );
};

export default Home;
