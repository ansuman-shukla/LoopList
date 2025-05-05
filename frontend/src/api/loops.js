import axiosInstance from './axios';
import { getTodayInLocalTimezone } from '../utils/dateUtils';

// Get loops for the current user with pagination
export const getLoops = async (status = null, skip = 0, limit = 10) => {
  try {
    console.log(`Fetching loops with status: ${status || 'all'}, skip: ${skip}, limit: ${limit}`);
    console.log(`Timestamp: ${new Date().toISOString()}`); // Add timestamp for debugging
    const params = { skip, limit };
    if (status) params.status = status;

    // Add cache-busting parameter to prevent browser caching
    params._t = new Date().getTime();

    const response = await axiosInstance.get('/loops', { params });

    // Enhanced debug logging
    console.log('Raw API response:', response.data);
    console.log('API response headers:', response.headers);
    console.log('API request config:', response.config);

    if (response.data && Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} loops`);
      if (response.data.length > 0) {
        console.log('First loop sample:', JSON.stringify(response.data[0], null, 2));
        console.log('User ID in first loop:', response.data[0].user_id);
      } else {
        console.log('No loops returned from API');
      }
    } else {
      console.log('API response is not an array:', typeof response.data);
    }

    // Process the data to ensure each loop has an id property and reaction_count is a number
    const processedData = response.data.map(loop => {
      // Create a new loop object with all the properties
      const processedLoop = { ...loop };

      // If the loop has _id but no id, add id property
      if (loop._id && !loop.id) {
        processedLoop.id = loop._id;
      }

      // Ensure reaction_count is a number
      if (loop.reaction_count !== undefined) {
        processedLoop.reaction_count = Number(loop.reaction_count);
        console.log(`Loop ${loop._id || loop.id} reaction_count: ${processedLoop.reaction_count}`);
      } else {
        processedLoop.reaction_count = 0;
        console.log(`Loop ${loop._id || loop.id} has no reaction_count, setting to 0`);
      }

      return processedLoop;
    });

    return processedData;
  } catch (error) {
    console.error('Error fetching loops:', error);
    console.error('Error details:', error.response?.data);
    throw error;
  }
};

// Get a specific loop by ID
export const getLoop = async (loopId) => {
  const response = await axiosInstance.get(`/loops/${loopId}`);

  // Process the data to ensure the loop has an id property and reaction_count is a number
  const loop = response.data;

  // Create a processed loop object
  const processedLoop = { ...loop };

  // If the loop has _id but no id, add id property
  if (loop && loop._id && !loop.id) {
    processedLoop.id = loop._id;
  }

  // Ensure reaction_count is a number
  if (loop && loop.reaction_count !== undefined) {
    processedLoop.reaction_count = Number(loop.reaction_count);
    console.log(`Loop ${loop._id || loop.id} reaction_count: ${processedLoop.reaction_count}`);
  } else if (loop) {
    processedLoop.reaction_count = 0;
    console.log(`Loop ${loop._id || loop.id} has no reaction_count, setting to 0`);
  }

  return processedLoop;
};

// Create a new loop
export const createLoop = async (loopData) => {
  const response = await axiosInstance.post('/loops', loopData);
  return response.data;
};

// Update an existing loop
export const updateLoop = async (loopId, loopData) => {
  const response = await axiosInstance.put(`/loops/${loopId}`, loopData);
  return response.data;
};

// Delete (archive) a loop
export const archiveLoop = async (loopId) => {
  const response = await axiosInstance.put(`/loops/${loopId}`, { status: 'archived' });
  return response.data;
};

// Mark a loop as completed for a specific date
export const completeLoop = async (loopId, date = null) => {
  if (!loopId) {
    throw new Error('Loop ID is required');
  }

  // Always include completion_date, default to today's date if not provided
  // Use our utility function to get today's date in local timezone
  const today = getTodayInLocalTimezone();
  console.log(`Today's date in local timezone: ${today}`);
  const data = { completion_date: date || today };

  console.log(`Sending completion request for loop ID: ${loopId}`);
  console.log('Sending completion data:', data);

  try {
    const response = await axiosInstance.post(`/loops/${loopId}/complete`, data);

    // Process the response to ensure it has an id property
    const completedLoop = response.data;
    if (completedLoop && completedLoop._id && !completedLoop.id) {
      return { ...completedLoop, id: completedLoop._id };
    }

    return completedLoop;
  } catch (error) {
    console.error(`Error completing loop ${loopId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Get completion calendar for a loop
export const getLoopCalendar = async (loopId, startDate = null, endDate = null) => {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response = await axiosInstance.get(`/loops/${loopId}/calendar`, { params });
  return response.data;
};

// Get completion count for a loop
export const getCompletionCount = async (loopId) => {
  try {
    // First try the direct endpoint
    const response = await axiosInstance.get(`/loops/${loopId}/count`);
    return response.data;
  } catch (error) {
    // If that fails, count the completions from the calendar data
    console.log("Count endpoint failed, falling back to calendar data");
    const calendarResponse = await axiosInstance.get(`/loops/${loopId}/calendar`);
    return calendarResponse.data.length;
  }
};
