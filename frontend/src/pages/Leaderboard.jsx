import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getLeaderboard, reactToLoop, cloneLoop } from '../api/public';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const Leaderboard = () => {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(0);
  const [allLoops, setAllLoops] = useState([]);
  const limit = 10; // Fixed limit to match backend
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const loaderRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);

  const { data: loops, isLoading, error, isFetching } = useQuery({
    queryKey: ['leaderboard', page],
    queryFn: () => getLeaderboard(page * limit, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    keepPreviousData: true,
  });

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

  const handleReact = async (loopId) => {
    console.group('LEADERBOARD REACTION HANDLER');
    console.log('=== LEADERBOARD REACTION HANDLER START ===');
    console.log('Loop ID:', loopId);

    try {
      // Find the loop in the current data
      const loopToUpdate = allLoops.find(loop => (loop.id || loop._id) === loopId);

      if (!loopToUpdate) {
        console.error(`Loop with ID ${loopId} not found in current data`);
        console.groupEnd();
        return;
      }

      console.log('Found loop to update:', loopToUpdate);
      console.log('Current reaction_count:', loopToUpdate.reaction_count || 0);

      // Increment its reaction count locally
      const updatedLoops = allLoops.map(loop => {
        if ((loop.id || loop._id) === loopId) {
          const newCount = (Number(loop.reaction_count) || 0) + 1;
          console.log(`Incrementing local reaction count: ${loop.reaction_count || 0} -> ${newCount}`);
          return {
            ...loop,
            reaction_count: newCount
          };
        }
        return loop;
      });

      // Update the local state immediately for better UX
      console.log('Updating local state with incremented count');
      setAllLoops(updatedLoops);

      // Make the API call
      console.log(`Calling reactToLoop API with loopId: ${loopId}`);
      const result = await reactToLoop(loopId);
      console.log('Reaction API result:', result);

      // Process the API result
      let apiCount;
      if (typeof result === 'number') {
        apiCount = result;
        console.log(`API returned numeric reaction count: ${apiCount}`);

        // If API returns 0 but we just reacted, use 1 instead
        if (apiCount === 0) {
          console.log('API returned 0 for a reaction we just added, using 1 instead');
          apiCount = 1;
        }
      } else if (result && typeof result === 'object' && result['❤️‍🔥'] !== undefined) {
        apiCount = result['❤️‍🔥'];
        console.log(`API returned object with reaction count: ${apiCount}`);

        // If API returns 0 but we just reacted, use 1 instead
        if (apiCount === 0) {
          console.log('API returned 0 for a reaction we just added, using 1 instead');
          apiCount = 1;
        }
      } else {
        // Fallback to the incremented count
        const loopToUpdate = allLoops.find(loop => (loop.id || loop._id) === loopId);
        apiCount = ((loopToUpdate?.reaction_count || 0) + 1);
        console.log(`Could not determine API count, using incremented count: ${apiCount}`);
      }

      console.log(`Final reaction count to use: ${apiCount}`);

      // Update the local state with the final API count
      console.log(`Updating local state with final API count: ${apiCount}`);
      setAllLoops(prevLoops =>
        prevLoops.map(loop =>
          (loop.id || loop._id) === loopId ? {...loop, reaction_count: apiCount} : loop
        )
      );

      // Refetch the leaderboard after a short delay
      console.log('Setting timeout to refetch leaderboard data');
      setTimeout(() => {
        console.log('Refetching leaderboard data');
        queryClient.invalidateQueries(['leaderboard']);

        // After refetching, verify the count is correct
        setTimeout(() => {
          const currentLoop = allLoops.find(loop => (loop.id || loop._id) === loopId);
          if (currentLoop) {
            console.log(`Current reaction count after refetch: ${currentLoop.reaction_count || 0}`);

            // Only update if the API count is greater than 0 and different from current
            if (currentLoop.reaction_count !== apiCount && apiCount > 0) {
              console.log(`Count mismatch after refetch, updating to API count: ${apiCount}`);
              setAllLoops(prevLoops =>
                prevLoops.map(loop =>
                  (loop.id || loop._id) === loopId ? {...loop, reaction_count: apiCount} : loop
                )
              );
            } else if (currentLoop.reaction_count === 0 && apiCount > 0) {
              // If the refetched count is 0 but our API count is positive, use our count
              console.log(`Refetched count is 0 but API count is ${apiCount}, keeping API count`);
              setAllLoops(prevLoops =>
                prevLoops.map(loop =>
                  (loop.id || loop._id) === loopId ? {...loop, reaction_count: apiCount} : loop
                )
              );
            }
          }
        }, 500);
      }, 500);

      console.log('=== LEADERBOARD REACTION HANDLER END ===');
      console.groupEnd();
    } catch (error) {
      console.error('Error reacting to loop:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });

      // Revert the local change if there was an error
      console.log('Reverting local changes due to error');
      queryClient.invalidateQueries(['leaderboard']);

      console.log('=== LEADERBOARD REACTION HANDLER END WITH ERROR ===');
      console.groupEnd();
    }
  };

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

      // Add a loading indicator or message
      const cloneButton = document.getElementById(`clone-button-${loopId}`);
      if (cloneButton) {
        cloneButton.textContent = 'Cloning...';
        cloneButton.disabled = true;
      }

      // Make the API call
      const result = await cloneLoop(loopId);
      console.log('Clone result:', result);

      // Validate the result
      if (!result || (!result.id && !result._id)) {
        throw new Error('Invalid response: Missing loop ID in response');
      }

      // Show success message
      alert('Loop cloned successfully! Check your dashboard.');

      // Reset button state
      if (cloneButton) {
        cloneButton.textContent = 'Clone';
        cloneButton.disabled = false;
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leaderboard']);
      queryClient.invalidateQueries(['loops']);
    } catch (error) {
      console.error('Error cloning loop:', error);

      // Reset button state if it exists
      const cloneButton = document.getElementById(`clone-button-${loopId}`);
      if (cloneButton) {
        cloneButton.textContent = 'Clone';
        cloneButton.disabled = false;
      }

      // Handle different types of errors
      if (error.name === 'TypeError' && error.message.includes('Cannot read properties of undefined')) {
        console.error('API response is undefined or invalid');
        alert('Error: Server returned an invalid response. Please try again later.');
      } else if (error.response?.status === 404) {
        alert('Error: Loop not found or not available for cloning.');
      } else if (error.response?.status === 403 || error.response?.status === 401) {
        alert('Error: You are not authorized to clone this loop. Please log in again.');
      } else if (error.message.includes('Network Error') || error.message.includes('CORS')) {
        alert('Network error: Could not connect to the server. CORS issue detected.');
      } else if (error.message.includes('Invalid response') || error.message.includes('empty response data')) {
        alert('Error: Server returned an incomplete response. Please try again later.');
      } else {
        alert(`Error cloning loop: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      }
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
        <h3 className="text-lg font-semibold mb-2">Error Loading Leaderboard</h3>
        <p>{error.message || 'An error occurred while loading the leaderboard.'}</p>
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Check out the top 10 loops with the longest active streaks. Get inspired or clone a loop to start your own streak!
      </p>

      {publicLoops.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2">No Loops Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Be the first to create a loop with a streak and top the leaderboard!
          </p>
          {isAuthenticated ? (
            <Link to="/loops/create">
              <Button>Create a Loop</Button>
            </Link>
          ) : (
            <Link to="/signup">
              <Button>Sign Up to Create Loops</Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Loop
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Streak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {publicLoops.map((loop, index) => (
                  <tr key={loop.id || loop._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        #{page * limit + index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {loop.icon && (
                          <div className="text-2xl mr-3">{loop.icon}</div>
                        )}
                        <div>
                          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {loop.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            by {loop.user_username || 'Anonymous'} • {loop.clone_count || 0} clones
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        {loop.current_streak}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        days
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        className="flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          const loopId = loop.id || loop._id;
                          if (!loopId) {
                            console.error('Loop ID is undefined or null', loop);
                            return;
                          }
                          handleReact(loopId);
                        }}
                      >
                        <span>❤️‍🔥</span>
                        <span className="text-xs font-medium ml-1">{loop.reaction_count || 0}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        id={`clone-button-${loop.id || loop._id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const loopId = loop.id || loop._id;
                          if (!loopId) {
                            console.error('Loop ID is undefined or null', loop);
                            alert('Error: Cannot clone loop with undefined ID');
                            return;
                          }
                          handleClone(loopId);
                        }}
                      >
                        Clone
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loading indicator for infinite scroll */}
          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-4 mt-4">
              {isFetching && (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              )}
            </div>
          )}

          {/* End of content message */}
          {!hasMore && publicLoops.length > 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>You've reached the end of the leaderboard</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
