import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import { reactToLoop } from '../../api/public';
import LoopStateIndicator from './LoopStateIndicator';
import { useCompletionCount } from '../../hooks/useLoops';

const FIRE_HEART_EMOJI = "❤️‍🔥";

const LoopCard = ({ loop, onComplete, isPublic = false, showReactions = true }) => {
  const [isReacting, setIsReacting] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [reactionCount, setReactionCount] = useState(0);
  const reactionCountRef = useRef(0); // Reference to track reaction count across renders

  // Get completion count for x_times_per_week frequency
  const { data: completionCount = 0 } = useCompletionCount(loop?.id || loop?._id)

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
    visibility = 'private',
    icon
  } = loop;

  // Ensure we have a valid ID to use throughout the component
  const loopId = id || _id;

  // Initialize reaction count from loop data if available
  useEffect(() => {
    // Check if loop has reaction_count property
    console.log('Loop in LoopCard useEffect:', loop);
    console.log('Loop reaction_count type:', typeof loop.reaction_count);
    console.log('Loop reaction_count value:', loop.reaction_count);
    console.log('Loop object keys:', Object.keys(loop));
    console.log('Loop object values:', Object.values(loop));

    // CRITICAL FIX: Always use the reaction_count from the loop object
    // This ensures we're using the latest value from the backend
    const count = Number(loop.reaction_count || 0);
    console.log('Setting reaction count in LoopCard:', count, '(original value:', loop.reaction_count, ')');

    // Only update if the count is different to avoid infinite loops
    if (reactionCount !== count) {
      setReactionCount(count);
      // Also update the ref
      reactionCountRef.current = count;
      console.log(`[DEBUG] Initialized reactionCountRef.current to ${count} in LoopCard`);
    }
  }, [loop, loop.reaction_count]);

  // Debug useEffect to track reaction count changes
  useEffect(() => {
    console.log(`[DEBUG] LoopCard reaction count changed: ${reactionCount} for loop ${loopId}`);

    // Update the ref whenever the reaction count changes
    reactionCountRef.current = reactionCount;
    console.log(`[DEBUG] Updated reactionCountRef.current to ${reactionCountRef.current} in LoopCard`);

    // Store the current reaction count in a data attribute for debugging
    const debugElement = document.getElementById('debug-loopcard-reaction-count');
    if (debugElement) {
      debugElement.setAttribute('data-count', reactionCount.toString());
      debugElement.textContent = `Current reaction count: ${reactionCount}`;
    }
  }, [reactionCount, loopId]);

  // Enhanced debug logging
  console.log('Loop in LoopCard:', loop);
  console.log('Loop ID:', loopId);
  console.log('Loop title:', title);
  console.log('Loop user_id:', loop.user_id);
  console.log('Loop status:', loop.status);
  console.log('Loop frequency_type:', frequency_type);
  console.log('Loop frequency_details:', frequency_details);
  console.log('Loop visibility:', visibility);

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
    console.group('LOOPCARD REACTION HANDLER');
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
        console.log(`[DEBUG] Updated reactionCountRef.current to ${newCount} during increment in LoopCard`);
        return newCount;
      });

      console.log(`Calling reactToLoop API with loopId: ${loopId}`);
      const result = await reactToLoop(loopId, FIRE_HEART_EMOJI);
      console.log('Reaction API result:', result);

      // Update reaction count with the result from the API
      if (typeof result === 'number') {
        console.log(`Setting reaction count from API numeric result: ${result}`);

        // Additional safeguard: If we just reacted but API returns 0, keep the incremented count
        if (result === 0) {
          console.log('API returned 0 for a reaction we just added, keeping incremented count');
          // Ensure the ref is set to at least 1
          if (reactionCountRef.current < 1) {
            reactionCountRef.current = 1;
            console.log(`[DEBUG] Forced reactionCountRef.current to 1 since API returned 0 in LoopCard`);
          }
        } else {
          setReactionCount(result);
          reactionCountRef.current = result;
          console.log(`[DEBUG] Updated reactionCountRef.current to ${result} from API result in LoopCard`);
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
            console.log(`[DEBUG] Forced reactionCountRef.current to 1 since API returned 0 in LoopCard`);
          }
        } else {
          setReactionCount(count);
          reactionCountRef.current = count;
          console.log(`[DEBUG] Updated reactionCountRef.current to ${count} from API object result in LoopCard`);
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
          console.log(`[DEBUG] Forced reactionCountRef.current to ${currentReactionCount} in timeout in LoopCard`);
        }
        // Only update if the stored count is different and not 0
        else if (currentCount !== currentReactionCount && currentReactionCount > 0) {
          console.log(`Reaction count changed during timeout, resetting to ${currentReactionCount}`);
          setReactionCount(currentReactionCount);
          // Force update the ref as well
          reactionCountRef.current = currentReactionCount;
          console.log(`[DEBUG] Updated reactionCountRef.current to ${currentReactionCount} in timeout in LoopCard`);
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

  return (
    <Card className="h-full flex flex-col">
      {/* Hidden debug element */}
      <div id="debug-loopcard-reaction-count" className="hidden" data-count={reactionCount.toString()}>
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
            <p className="text-sm text-gray-600 dark:text-gray-400">{getFrequencyText()}</p>
          </div>
        </div>
        {/* Visibility tags for all types */}
        {visibility === 'public' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Public
          </span>
        )}
        {visibility === 'friends_only' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Friends
          </span>
        )}
        {visibility === 'private' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            Private
          </span>
        )}
      </div>

      <div className="flex justify-between mb-4">
        {frequency_type === 'x_times_per_week' ? (
          <div className="w-full">
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completionCount} times total</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{current_streak}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</p>
              <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">{longest_streak}</p>
            </div>
          </>
        )}
      </div>

      {/* Emoji Reactions */}
      {visibility === 'public' && showReactions && (
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
      )}

      <div className="mt-auto pt-4 flex justify-between">
        <Link to={`/loops/${loopId}`}>
          <Button variant="outline" size="sm">
            Details
          </Button>
        </Link>

        {!isPublic && (
          <Button
            size="sm"
            onClick={() => {
              console.log(`Completing loop with ID: ${loopId}`);
              onComplete(loopId);
            }}
          >
            Complete Today
          </Button>
        )}
      </div>
    </Card>
  );
};

export default LoopCard;
