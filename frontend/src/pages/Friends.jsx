import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { addFriend, removeFriend, getFriends } from '../api/friends';

const Friends = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [allFriends, setAllFriends] = useState([]);
  const limit = 10; // Number of friends to load per page
  const loaderRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch friends list with pagination
  const { data: friends = [], isLoading, isError, error: friendsError, isFetching } = useQuery({
    queryKey: ['friends', page],
    queryFn: () => getFriends(page * limit, limit),
    onError: (error) => {
      console.error('Error fetching friends:', error);
    },
    retry: 1,
    keepPreviousData: true,
  });

  // Update allFriends when new data is fetched
  useEffect(() => {
    if (friends) {
      if (friends.length < limit) {
        setHasMore(false);
      }

      if (page === 0) {
        setAllFriends(friends);
      } else {
        setAllFriends(prev => [...prev, ...friends]);
      }
    }
  }, [friends, page, limit]);

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

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: addFriend,
    onSuccess: () => {
      // Reset form and refetch friends
      setEmail('');
      setError('');
      setPage(0); // Reset to first page
      setAllFriends([]); // Clear current friends list
      setHasMore(true); // Reset hasMore flag
      queryClient.invalidateQueries(['friends']);
    },
    onError: (error) => {
      console.error('Error adding friend:', error);

      // Handle different error types
      if (error.message === 'User with this email not found') {
        setError(`No user found with email: ${email}`);
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to add friend. Please try again.');
      }
    },
  });

  // Remove friend mutation
  const removeFriendMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      setPage(0); // Reset to first page
      setAllFriends([]); // Clear current friends list
      setHasMore(true); // Reset hasMore flag
      queryClient.invalidateQueries(['friends']);
    },
    onError: (error) => {
      console.error('Error removing friend:', error);
      alert(error.response?.data?.detail || 'Failed to remove friend');
    },
  });

  const handleAddFriend = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    // Normalize email to lowercase to avoid case sensitivity issues
    const normalizedEmail = email.trim().toLowerCase();
    addFriendMutation.mutate({ email: normalizedEmail });
  };

  const handleRemoveFriend = (friendId) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      removeFriendMutation.mutate(friendId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>

      {/* Add Friend Form */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Add a Friend</h2>
        <form onSubmit={handleAddFriend} className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter friend's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              required
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={addFriendMutation.isLoading}
            className="whitespace-nowrap"
          >
            {addFriendMutation.isLoading ? 'Adding...' : 'Add Friend'}
          </Button>
        </form>
      </Card>

      {/* Friends List */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Your Friends</h2>

        {isLoading && page === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : isError && page === 0 ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading friends. Please try again.</p>
            {friendsError && (
              <p className="mt-2 text-sm">
                {friendsError.response?.data?.detail || friendsError.message || 'Unknown error'}
              </p>
            )}
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => queryClient.invalidateQueries(['friends'])}
            >
              Retry
            </Button>
          </div>
        ) : allFriends.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-4">You haven't added any friends yet.</p>
            <p>Add friends by email to share your loops with them!</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {allFriends.map((friend) => (
                    <tr key={friend.id || friend._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {friend.username || 'No username'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {friend.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveFriend(friend.id || friend._id)}
                          disabled={removeFriendMutation.isLoading}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            {!hasMore && allFriends.length > 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>You've reached the end of your friends list</p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Friends;
