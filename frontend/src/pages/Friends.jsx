import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { addFriend, removeFriend, getFriends } from '../api/friends';

const Friends = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch friends list
  const { data: friends, isLoading, isError, error: friendsError } = useQuery({
    queryKey: ['friends'],
    queryFn: getFriends,
    onError: (error) => {
      console.error('Error fetching friends:', error);
    },
    retry: 1,
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: addFriend,
    onSuccess: () => {
      // Reset form and refetch friends
      setEmail('');
      setError('');
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

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : isError ? (
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
        ) : friends?.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-4">You haven't added any friends yet.</p>
            <p>Add friends by email to share your loops with them!</p>
          </div>
        ) : (
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
                {friends?.map((friend) => (
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
        )}
      </Card>
    </div>
  );
};

export default Friends;
