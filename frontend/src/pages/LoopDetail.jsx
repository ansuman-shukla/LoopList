import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLoop, useCompleteLoop, useArchiveLoop, useCompletionCount } from '../hooks/useLoops';
import { useQueryClient } from '@tanstack/react-query';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoopCalendar from '../components/loops/LoopCalendar';
import LoopStateIndicator from '../components/loops/LoopStateIndicator';

const LoopDetail = () => {
  const { loopId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: loop, isLoading, error } = useLoop(loopId);
  const { data: completionCount = 0, isLoading: isCountLoading } = useCompletionCount(loopId);
  const completeLoopMutation = useCompleteLoop();
  const archiveLoopMutation = useArchiveLoop();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Refresh completion count when component mounts
  useEffect(() => {
    if (loopId) {
      queryClient.invalidateQueries({ queryKey: ['completion-count', loopId] });
      queryClient.invalidateQueries({ queryKey: ['loop-calendar', loopId] });
    }
  }, [loopId, queryClient]);

  const handleComplete = () => {
    completeLoopMutation.mutate(
      { loopId },
      {
        onError: (error) => {
          // Check if the error is because the loop is already completed for today
          if (error.response?.data?.detail === "Loop already completed for this date") {
            alert("You've already completed this loop for today!");
          } else {
            console.error("Error completing loop:", error);
            alert(error.response?.data?.detail || "Failed to complete loop. Please try again.");
          }
        },
        onSuccess: () => {
          alert("Loop completed successfully!");
        }
      }
    );
  };

  const handleArchive = async () => {
    try {
      await archiveLoopMutation.mutateAsync(loopId);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error archiving loop:', error);
    }
  };

  // Format frequency text
  const getFrequencyText = () => {
    if (!loop) return '';

    // Ensure frequency_details exists
    const frequencyDetails = loop.frequency_details || {};

    try {
      switch (loop.frequency_type) {
        case 'daily':
          return 'Every day';
        case 'weekly':
          const daysOfWeek = frequencyDetails.days_of_week || [];
          return `${daysOfWeek.length} days per week`;
        case 'specific_days':
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const daysArray = frequencyDetails.days_of_week || [];
          const selectedDays = daysArray.map(day => days[day - 1]);
          return selectedDays.join(', ') || 'No days selected';
        case 'every_n_days':
          return `Every ${frequencyDetails.n || 0} days`;
        case 'x_times_per_week':
          return `${frequencyDetails.count || 0} times per week`;
        default:
          return 'Custom';
      }
    } catch (error) {
      console.error('Error formatting frequency text:', error);
      return 'Custom schedule';
    }
  };

  // Get additional frequency info for custom types
  const getAdditionalFrequencyInfo = () => {
    if (!loop) return null;

    try {
      // Show completion count for custom frequency types and every_n_days
      if (loop.frequency_type === 'x_times_per_week' ||
          loop.frequency_type === 'custom' ||
          loop.frequency_type === 'every_n_days') {
        return (
          <div>
            <p className="text-md font-medium text-primary-600 dark:text-primary-400 mt-2">
              Completed {isCountLoading ? '...' : completionCount} times total
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Started on {new Date(loop.start_date).toLocaleDateString()}
            </p>
          </div>
        );
      }

      return (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Started on {new Date(loop.start_date).toLocaleDateString()}
        </p>
      );
    } catch (error) {
      console.error('Error formatting additional frequency info:', error);
      return (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Started on {loop.start_date ? new Date(loop.start_date).toLocaleDateString() : 'unknown date'}
        </p>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Handle invalid loop ID
  if (loopId === 'undefined' || !loopId) {
    return (
      <Card className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
        <h3 className="text-lg font-semibold mb-2">Error Loading Loop</h3>
        <p>Invalid loop ID. This may happen if the loop was not created properly.</p>
        <button
          className="mt-4 text-primary-600 dark:text-primary-400 hover:underline"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </button>
      </Card>
    );
  }

  // Handle other errors
  if (error || !loop) {
    return (
      <Card className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
        <h3 className="text-lg font-semibold mb-2">Error Loading Loop</h3>
        <p>{error?.message || 'The loop could not be found.'}</p>
        <button
          className="mt-4 text-primary-600 dark:text-primary-400 hover:underline"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </button>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <Link
            to="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-2 inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center">
            <LoopStateIndicator loop={loop} size="lg" showLabel={true} />
            <h1 className="text-3xl font-bold flex items-center ml-3">
              {loop.icon && <span className="mr-3 text-3xl">{loop.icon}</span>}
              {loop.title}
            </h1>
          </div>
        </div>

        <div className="flex space-x-3">
          <Link to={`/loops/${loopId}/edit`}>
            <Button variant="outline">
              Edit Loop
            </Button>
          </Link>

          {loop.status === 'active' && (
            <Button onClick={handleComplete}>
              Complete Today
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {loop.frequency_type === 'x_times_per_week' ? (
          <Card className="relative md:col-span-2">
            <div className="absolute top-2 right-2">
              <span className="text-2xl" title="Completion count">✅</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Completions</h3>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{completionCount} times total</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Goal: {loop.frequency_details?.count || 1} times per week
            </p>
          </Card>
        ) : (
          <>
            <Card className="relative">
              <div className="absolute top-2 right-2">
                <span className="text-2xl" title="Current streak">🟩</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Current Streak</h3>
              <p className="text-4xl font-bold text-primary-600 dark:text-primary-400">{loop.current_streak}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">days</p>
            </Card>

            <Card className="relative">
              <div className="absolute top-2 right-2">
                <span className="text-2xl" title="Longest streak">🔥</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Longest Streak</h3>
              <p className="text-4xl font-bold text-secondary-600 dark:text-secondary-400">{loop.longest_streak}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">days</p>
            </Card>

            <Card className="relative">
              <div className="absolute top-2 right-2">
                <span className="text-2xl" title="Completion count">✅</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Completions</h3>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">{completionCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">total check-ins</p>
            </Card>
          </>
        )}

        <Card>
          <h3 className="text-lg font-semibold mb-2">Frequency</h3>
          <p className="text-xl">{getFrequencyText()}</p>
          {getAdditionalFrequencyInfo()}
        </Card>
      </div>

      <div className="mb-8 w-full">
        <LoopCalendar loopId={loopId} />
      </div>

      <Card className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Loop Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visibility</p>
            <p className="font-medium">
              {loop.visibility === 'public' ? 'Public' : 'Private'}
              {loop.visibility === 'public' && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  On Leaderboard
                </span>
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
            <p className="font-medium capitalize">{loop.status}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
            <p className="font-medium">{new Date(loop.created_at).toLocaleDateString()}</p>
          </div>

          {loop.end_date && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
              <p className="font-medium">{new Date(loop.end_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold mb-4">Danger Zone</h3>

        {!showConfirmDelete ? (
          <Button
            variant="danger"
            onClick={() => setShowConfirmDelete(true)}
          >
            Archive Loop
          </Button>
        ) : (
          <div>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Are you sure you want to archive this loop? This action will hide the loop from your dashboard.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="danger"
                onClick={handleArchive}
                disabled={archiveLoopMutation.isPending}
              >
                {archiveLoopMutation.isPending ? 'Archiving...' : 'Yes, Archive Loop'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LoopDetail;
