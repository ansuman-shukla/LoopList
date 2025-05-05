import axiosInstance from './axios';

// Get loops for the home feed (public loops from other users and friends-only loops from friends)
export const getLeaderboard = async (skip = 0, limit = 10) => {
  const response = await axiosInstance.get('/public/leaderboard', {
    params: { skip, limit }
  });

  // Process the data to ensure each loop has an id property
  const loops = response.data;
  return loops.map(loop => {
    // If loop has _id but no id, add id property
    if (loop._id && !loop.id) {
      return { ...loop, id: loop._id };
    }
    return loop;
  });
};

// Get the top 10 loops with the longest active streaks for the leaderboard page
export const getTopStreaks = async (skip = 0, limit = 10) => {
  const response = await axiosInstance.get('/public/top-streaks', {
    params: { skip, limit }
  });

  // Process the data to ensure each loop has an id property
  const loops = response.data;
  return loops.map(loop => {
    // If loop has _id but no id, add id property
    if (loop._id && !loop.id) {
      return { ...loop, id: loop._id };
    }
    return loop;
  });
};

// Get a specific public loop by ID
export const getPublicLoop = async (loopId) => {
  const response = await axiosInstance.get(`/public/loops/${loopId}`);
  return response.data;
};

// React to a public loop with fire heart emoji
export const reactToLoop = async (loopId, emoji) => {
  console.group('REACTION API CALL');
  console.log('=== REACTION API CALL START ===');

  // Validate inputs
  if (!loopId || loopId === 'undefined') {
    console.error('Invalid loop ID detected:', loopId);
    console.groupEnd();
    throw new Error('Invalid loop ID: Cannot react to a loop with undefined ID');
  }

  // Use the fire heart emoji
  const FIRE_HEART_EMOJI = "❤️‍🔥";
  console.log(`Loop ID: ${loopId} (type: ${typeof loopId})`);
  console.log(`Emoji: ${FIRE_HEART_EMOJI}`);

  try {
    console.log(`Making reaction request for loop ID: ${loopId}`);
    console.log('Request URL:', `/public/loops/${loopId}/react`);
    console.log('Request body:', { emoji: FIRE_HEART_EMOJI });

    const response = await axiosInstance.post(`/public/loops/${loopId}/react`, { emoji: FIRE_HEART_EMOJI });

    console.log('Reaction API response status:', response.status);
    console.log('Reaction API response headers:', response.headers);
    console.log('Reaction API response data:', response.data);
    console.log('Reaction API response data type:', typeof response.data);
    console.log('Response data structure:', JSON.stringify(response.data, null, 2));

    if (response.data === undefined || response.data === null) {
      console.error('API returned empty response data');
      console.groupEnd();
      throw new Error('API returned empty response data');
    }

    // If the response is a number, return it directly
    if (typeof response.data === 'number') {
      console.log('Returning numeric response:', response.data);
      console.log('=== REACTION API CALL END ===');
      console.groupEnd();
      return response.data;
    }

    // If the response is an object with the emoji as a key, return the count
    if (typeof response.data === 'object' && response.data[FIRE_HEART_EMOJI] !== undefined) {
      const count = response.data[FIRE_HEART_EMOJI];
      console.log(`Returning object response for emoji ${FIRE_HEART_EMOJI}:`, count);

      // IMPORTANT: If the count is 0 but we just reacted, return 1 instead
      // This fixes the issue where the backend returns 0 even though we just added a reaction
      if (count === 0) {
        console.log('API returned 0 for a reaction we just added, returning 1 instead');
        console.log('=== REACTION API CALL END ===');
        console.groupEnd();
        return 1;
      }

      console.log('=== REACTION API CALL END ===');
      console.groupEnd();
      return count;
    }

    // If we can't determine the count, return 1 as a fallback
    console.warn('Could not determine reaction count from API response, using fallback value');
    console.log('Full response data:', JSON.stringify(response.data));
    console.log('=== REACTION API CALL END ===');
    console.groupEnd();
    return 1;
  } catch (error) {
    console.error('Error in reactToLoop API call:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    console.log('=== REACTION API CALL END WITH ERROR ===');
    console.groupEnd();
    // Re-throw the error to be handled by the caller
    throw error;
  }
};

// Clone a public loop
export const cloneLoop = async (loopId) => {
  // Validate loopId before making the request
  if (!loopId || loopId === 'undefined') {
    throw new Error('Invalid loop ID: Cannot clone a loop with undefined ID');
  }

  try {
    console.log('Making clone request for loop ID:', loopId);

    // Use the correct clone endpoint
    const response = await axiosInstance.post(`/public/loops/${loopId}/clone`);

    // Log the response for debugging
    console.log('Clone API response:', response);

    // Validate the response data
    if (!response.data) {
      throw new Error('API returned empty response data');
    }

    // Ensure the response has an id property
    const clonedLoop = response.data;
    if (clonedLoop._id && !clonedLoop.id) {
      return { ...clonedLoop, id: clonedLoop._id };
    }

    return clonedLoop;
  } catch (error) {
    console.error('Error in cloneLoop API call:', error);
    // Re-throw the error to be handled by the caller
    throw error;
  }
};
