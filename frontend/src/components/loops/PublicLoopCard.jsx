import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import { reactToLoop } from '../../api/public';
import LoopStateIndicator from './LoopStateIndicator';
import { useCompletionCount } from '../../hooks/useLoops';

const FIRE_HEART_EMOJI = "❤️‍🔥";

const PublicLoopCard = ({ loop, onClone }) => {
  const [isReacting, setIsReacting] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [isCloning, setIsCloning] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const reactionCountRef = useRef(0); // Reference to track reaction count across renders
  const navigate = useNavigate();

  // Get completion count for x_times_per_week frequency
  const { data: completionCount = 0 } = useCompletionCount(loop?.id || loop?._id);

  // Return early if loop is undefined
  if (!loop) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-6">
        <p className="text-gray-500">Loop data not available</p>
      </Card>
    );
  }

  // Ensure we have all required properties with fallbacks
  const {
    _id,
    id,
    title,
    current_streak = 0,
    longest_streak = 0,
    frequency_type,
    frequency_details = {}, // Provide default empty object
    user_username = 'Anonymous',
    clone_count = 0,
    visibility = 'public', // Default to public for PublicLoopCard
    icon
  } = loop;

  // Ensure we have a valid ID to use throughout the component
  const loopId = id || _id;

  // Initialize reaction count from loop data if available
  useEffect(() => {
    // Check if loop has reaction_count property
    console.log('Loop in useEffect:', loop);
    console.log('Loop reaction_count type:', typeof loop.reaction_count);
    console.log('Loop reaction_count value:', loop.reaction_count);
    console.log('Loop object keys:', Object.keys(loop));
    console.log('Loop object values:', Object.values(loop));

    // CRITICAL FIX: Always use the reaction_count from the loop object
    // This ensures we're using the latest value from the backend
    const count = Number(loop.reaction_count || 0);
    console.log('Setting reaction count:', count, '(original value:', loop.reaction_count, ')');

    // Only update if the count is different to avoid infinite loops
    if (reactionCount !== count) {
      setReactionCount(count);
      // Also update the ref
      reactionCountRef.current = count;
      console.log(`[DEBUG] Initialized reactionCountRef.current to ${count}`);
    }
  }, [loop, loop.reaction_count]);

  // Debug useEffect to track reaction count changes
  useEffect(() => {
    console.log(`[DEBUG] PublicLoopCard reaction count changed: ${reactionCount} for loop ${loopId}`);

    // Update the ref whenever the reaction count changes
    reactionCountRef.current = reactionCount;
    console.log(`[DEBUG] Updated reactionCountRef.current to ${reactionCountRef.current}`);

    // Store the current reaction count in a data attribute for debugging
    const debugElement = document.getElementById('debug-reaction-count');
    if (debugElement) {
      debugElement.setAttribute('data-count', reactionCount.toString());
      debugElement.textContent = `Current reaction count: ${reactionCount}`;
    }
  }, [reactionCount, loopId]);



  // Format frequency text
  const getFrequencyText = () => {
    try {
      switch (frequency_type) {
        case 'daily':
          return 'Every day';
        case 'weekly':
          if (frequency_details && frequency_details.days_of_week) {
            return `${frequency_details.days_of_week.length} days per week`;
          }
          return 'Weekly';
        case 'specific_days':
          if (frequency_details && frequency_details.days_of_week) {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const selectedDays = frequency_details.days_of_week.map(day => days[day - 1]);
            return selectedDays.join(', ');
          }
          return 'Specific days';
        case 'every_n_days':
          if (frequency_details && frequency_details.every_n_days) {
            return `Every ${frequency_details.every_n_days} days`;
          }
          return 'Every N days';
        default:
          return 'Custom';
      }
    } catch (error) {
      console.error('Error formatting frequency text:', error);
      return 'Custom schedule';
    }
  };

  const handleReact = async () => {
    console.group('PUBLICLOOPCARD REACTION HANDLER');
    console.log('=== REACTION HANDLER START ===');
    console.log('Initial state:', {
      loopId,
      currentReactionCount: reactionCount,
      isReacting,
      selectedEmoji
    });

    try {
      // Validate loopId before making the request
      if (!loopId) {
        console.error('Invalid loop ID for reaction');
        console.groupEnd();
        alert('Error: Cannot react to loop with invalid ID');
        return;
      }

      setIsReacting(true);
      setSelectedEmoji(FIRE_HEART_EMOJI);
      console.log('Set isReacting to true and selectedEmoji to', FIRE_HEART_EMOJI);

      // Store the previous count for debugging
      const prevCount = reactionCount;

      // Immediately increment the count locally for better UX
      setReactionCount(prevCount => {
        const newCount = prevCount + 1;
        console.log(`Incrementing local reaction count: ${prevCount} -> ${newCount}`);
        // Also update the ref immediately
        reactionCountRef.current = newCount;
        console.log(`[DEBUG] Updated reactionCountRef.current to ${newCount} during increment`);
        return newCount;
      });

      console.log(`Calling reactToLoop API with loopId: ${loopId}`);
      const result = await reactToLoop(loopId, FIRE_HEART_EMOJI);
      console.log('Reaction API result:', result);

      // The reactToLoop function now handles the case where the API returns 0
      // for a reaction we just added, and returns 1 instead

      // Update reaction count with the result from the API
      if (typeof result === 'number') {
        console.log(`Setting reaction count from API numeric result: ${result}`);

        // Additional safeguard: If we just reacted but API returns 0, keep the incremented count
        if (result === 0) {
          console.log('API returned 0 for a reaction we just added, keeping incremented count');
          // Ensure the ref is set to at least 1
          if (reactionCountRef.current < 1) {
            reactionCountRef.current = 1;
            console.log(`[DEBUG] Forced reactionCountRef.current to 1 since API returned 0`);
          }
        } else {
          setReactionCount(result);
          reactionCountRef.current = result;
          console.log(`[DEBUG] Updated reactionCountRef.current to ${result} from API result`);
        }
      } else if (result && typeof result === 'object' && result[FIRE_HEART_EMOJI] !== undefined) {
        const count = result[FIRE_HEART_EMOJI];
        console.log(`Setting reaction count from API object result: ${count}`);

        // Additional safeguard: If we just reacted but API returns 0, keep the incremented count
        if (count === 0) {
          console.log('API returned 0 for a reaction we just added, keeping incremented count');
          // Ensure the ref is set to at least 1
          if (reactionCountRef.current < 1) {
            reactionCountRef.current = 1;
            console.log(`[DEBUG] Forced reactionCountRef.current to 1 since API returned 0`);
          }
        } else {
          setReactionCount(count);
          reactionCountRef.current = count;
          console.log(`[DEBUG] Updated reactionCountRef.current to ${count} from API object result`);
        }
      } else {
        console.log('API result format not recognized, keeping local increment');
      }

      // Store the current reaction count to use in the timeout
      // If the API returned 0, use the incremented count instead
      let currentReactionCount;
      if (typeof result === 'number') {
        currentReactionCount = result === 0 ? prevCount + 1 : result;
      } else if (result && typeof result === 'object' && result[FIRE_HEART_EMOJI] !== undefined) {
        currentReactionCount = result[FIRE_HEART_EMOJI] === 0 ? prevCount + 1 : result[FIRE_HEART_EMOJI];
      } else {
        currentReactionCount = prevCount + 1;
      }

      console.log(`Storing current reaction count for timeout: ${currentReactionCount}`);

      // Update the reaction count ref for use in the timeout
      reactionCountRef.current = reactionCount;

      setTimeout(() => {
        console.log('Timeout callback executing, resetting UI state');
        setIsReacting(false);
        setSelectedEmoji(null);

        // Get the current reaction count from the ref
        const currentCount = reactionCountRef.current;

        // Ensure the reaction count is still correct
        console.log(`Checking reaction count in timeout: current=${currentCount}, stored=${currentReactionCount}`);

        // CRITICAL FIX: Always ensure the count is at least 1 after a reaction
        if (currentCount === 0 && currentReactionCount > 0) {
          console.log(`Current count is 0 but should be at least 1, setting to ${currentReactionCount}`);
          setReactionCount(currentReactionCount);
          // Force update the ref as well
          reactionCountRef.current = currentReactionCount;
          console.log(`[DEBUG] Forced reactionCountRef.current to ${currentReactionCount} in timeout`);
        }
        // Only update if the stored count is different and not 0
        else if (currentCount !== currentReactionCount && currentReactionCount > 0) {
          console.log(`Reaction count changed during timeout, resetting to ${currentReactionCount}`);
          setReactionCount(currentReactionCount);
          // Force update the ref as well
          reactionCountRef.current = currentReactionCount;
          console.log(`[DEBUG] Updated reactionCountRef.current to ${currentReactionCount} in timeout`);
        }

        // Log the final state after all updates
        console.log('Final reaction count after API call:', currentReactionCount);
      }, 1500);

      console.log('=== REACTION HANDLER END ===');
      console.groupEnd();
    } catch (error) {
      console.error('Error reacting to loop:', error);

      // Revert the local increment if there was an error
      setReactionCount(prevCount => {
        const newCount = Math.max(0, prevCount - 1);
        console.log(`Error occurred, reverting count: ${prevCount} -> ${newCount}`);
        return newCount;
      });

      alert(`Error reacting to loop: ${error.message || 'Unknown error'}`);
      setIsReacting(false);
      setSelectedEmoji(null);

      console.log('=== REACTION HANDLER END WITH ERROR ===');
      console.groupEnd();
    }
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      await onClone(loopId);
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Card className="h-full flex flex-col p-5 mb-6">
      {/* Hidden debug element */}
      <div id="debug-reaction-count" className="hidden" data-count={reactionCount.toString()}>
        Current reaction count: {reactionCount}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          {/* Loop state indicator */}
          <LoopStateIndicator loop={loop} />

          {icon && (
            <div className="mr-3 text-2xl">{icon}</div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">by {user_username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">{getFrequencyText()}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center mb-1">
            {/* Visibility tag */}
            {visibility === 'public' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mr-2">
                Public
              </span>
            )}
            {visibility === 'friends_only' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2">
                Friends
              </span>
            )}
          </div>
          {frequency_type === 'x_times_per_week' ? (
            <>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completionCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                times total
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {current_streak}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                day streak
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clone count */}
      <div className="mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {clone_count} {clone_count === 1 ? 'person' : 'people'} cloned this loop
        </span>
      </div>

      {/* Emoji Reactions */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {/* Single Fire Heart Emoji Button */}
          <button
            onClick={handleReact}
            disabled={isReacting}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center ${
              selectedEmoji === FIRE_HEART_EMOJI
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            } transition-colors`}
            data-reaction-count={reactionCount}
            data-loop-reaction-count={loop.reaction_count}
          >
            <span>{FIRE_HEART_EMOJI}</span>
            <span className="text-xs font-medium ml-1">{reactionCount}</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleClone}
          disabled={isCloning}
        >
          {isCloning ? 'Cloning...' : 'Clone this loop'}
        </Button>
      </div>
    </Card>
  );
};

export default PublicLoopCard;
