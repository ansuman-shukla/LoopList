import axiosInstance from './axios';

// Get friends with pagination
export const getFriends = async (skip = 0, limit = 10) => {
  const response = await axiosInstance.get('/friends/me/friends', {
    params: { skip, limit }
  });
  return response.data;
};

// Check if a user exists by email
export const checkUserExists = async (email) => {
  const response = await axiosInstance.get('/friends/check-user', {
    params: { email }
  });
  return response.data;
};

// Add a friend by email
export const addFriend = async ({ email }) => {
  // First check if the user exists
  try {
    const checkResult = await checkUserExists(email);
    console.log('Check user exists result:', checkResult);

    if (!checkResult.exists) {
      throw new Error('User with this email not found');
    }

    // If user exists, add as friend
    const response = await axiosInstance.post('/friends/me/friends', { email });
    return response.data;
  } catch (error) {
    console.error('Error in addFriend:', error);
    throw error;
  }
};

// Remove a friend
export const removeFriend = async (friendId) => {
  const response = await axiosInstance.delete(`/friends/me/friends/${friendId}`);
  return response.data;
};
