import React from 'react';

// Loop state indicators
const ACTIVE_INDICATOR = "🟩"; // :large_green_square:
const BROKEN_INDICATOR = "🟥"; // :large_red_square:
const COMPLETED_INDICATOR = "✅"; // :white_check_mark:

const LoopStateIndicator = ({ loop, size = 'md', showLabel = false }) => {
  // Determine the loop state (active, broken, completed)
  const getLoopState = () => {
    try {
      // If the loop has a status of 'completed', return completed
      if (loop.status === 'completed') {
        return 'completed';
      }

      // Check if the loop has a future start date
      const startDate = new Date(loop.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If the loop hasn't started yet, it's active
      if (startDate > today) {
        console.log("Loop hasn't started yet, marking as active");
        return 'active';
      }

      // Special handling for x_times_per_week frequency
      if (loop.frequency_type === 'x_times_per_week') {
        // Get the week start (Sunday)
        const weekStart = new Date(today);
        const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);

        // If we're still in the current week and have at least one completion,
        // consider it active even if current_streak is 0
        if (startDate <= today && loop.status === 'active') {
          // If we have at least one completion this week, it's active
          // This is a simplification - ideally we'd check the actual completions for this week
          if (loop.current_streak > 0 || loop.longest_streak > 0) {
            console.log("Loop has completions, marking as active");
            return 'active';
          }
        }
      }

      // If the current streak is 0 and the loop is active, it's broken
      if (loop.current_streak === 0 && loop.status === 'active') {
        return 'broken';
      }

      // Otherwise, if the loop is active and has a streak, it's active
      if (loop.status === 'active' && loop.current_streak > 0) {
        return 'active';
      }

      // Default to active if we can't determine
      return 'active';
    } catch (error) {
      console.error('Error determining loop state:', error);
      return 'active'; // Default to active
    }
  };

  // Get the appropriate state indicator emoji
  const getLoopStateIndicator = () => {
    const state = getLoopState();
    switch (state) {
      case 'active':
        return ACTIVE_INDICATOR;
      case 'broken':
        return BROKEN_INDICATOR;
      case 'completed':
        return COMPLETED_INDICATOR;
      default:
        return ACTIVE_INDICATOR;
    }
  };

  // Get the state label text
  const getStateLabel = () => {
    const state = getLoopState();
    switch (state) {
      case 'active':
        return 'Active';
      case 'broken':
        return 'Broken';
      case 'completed':
        return 'Completed';
      default:
        return 'Active';
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className="flex items-center" title={`Loop state: ${getStateLabel()}`}>
      <div className={`${sizeClasses[size] || 'text-2xl'} mr-2`}>
        {getLoopStateIndicator()}
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {getStateLabel()}
        </span>
      )}
    </div>
  );
};

export default LoopStateIndicator;
