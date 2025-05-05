import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { useLoopCalendar, useLoop, useCompletionCount } from '../../hooks/useLoops';
import Card from '../common/Card';

const LoopCalendar = ({ loopId }) => {
  const [date, setDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const { data: loop } = useLoop(loopId);
  const { data: completionCount = 0 } = useCompletionCount(loopId);

  // Calculate start and end dates for the current view
  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

  // Fetch completions for the current month view
  const { data: completionDates = [], isLoading } = useLoopCalendar(
    loopId,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  );

  // Convert completion dates from strings to Date objects
  const completionDateObjects = completionDates.map(dateStr => new Date(dateStr));

  // Calculate completion rate
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    if (loop && loop.start_date) {
      // Calculate days since loop started
      const startDate = new Date(loop.start_date);
      startDate.setHours(0, 0, 0, 0); // Normalize to start of day

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day

      // If the loop hasn't started yet, set completion rate to 0
      if (startDate > today) {
        setCompletionRate(0);
        return;
      }

      const daysSinceStart = Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1);
      console.log(`Days since start: ${daysSinceStart}`);

      // Calculate expected completions based on frequency type
      let expectedCompletions = 0;

      switch (loop.frequency_type) {
        case 'daily':
          expectedCompletions = daysSinceStart;
          break;
        case 'specific_days':
          // Calculate number of specific days that have occurred since start
          const daysOfWeek = loop.frequency_details?.days || [];
          if (daysOfWeek.length > 0) {
            // Count actual matching days between start date and today
            let matchingDays = 0;
            const tempDate = new Date(startDate);

            while (tempDate <= today) {
              // Convert JS day (0-6, Sun-Sat) to backend day format (0-6, Sun-Sat)
              const dayOfWeek = tempDate.getDay(); // 0 = Sunday, 6 = Saturday

              if (daysOfWeek.includes(dayOfWeek)) {
                matchingDays++;
              }

              // Move to next day
              tempDate.setDate(tempDate.getDate() + 1);
            }

            expectedCompletions = matchingDays;
          }
          break;
        case 'every_n_days':
          const n = loop.frequency_details?.n || 1;
          expectedCompletions = Math.floor(daysSinceStart / n) + 1;
          break;
        case 'x_times_per_week':
          const timesPerWeek = loop.frequency_details?.count || 1;
          const weeksElapsed = Math.ceil(daysSinceStart / 7);
          expectedCompletions = Math.min(weeksElapsed * timesPerWeek, daysSinceStart);
          break;
        default:
          expectedCompletions = daysSinceStart;
      }

      console.log(`Expected completions: ${expectedCompletions}`);
      console.log(`Actual completions: ${completionCount}`);

      // Calculate completion rate (cap at 100%)
      if (expectedCompletions > 0) {
        const rate = Math.min(100, Math.round((completionCount / expectedCompletions) * 100));
        setCompletionRate(rate);
      } else {
        setCompletionRate(0);
      }
    } else {
      setCompletionRate(0);
    }
  }, [loop, completionCount]);

  // Custom tile content to show completion status
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const isCompleted = completionDateObjects.some(
      completionDate =>
        completionDate.getDate() === date.getDate() &&
        completionDate.getMonth() === date.getMonth() &&
        completionDate.getFullYear() === date.getFullYear()
    );

    return isCompleted ? (
      <div className="relative flex items-center justify-center pointer-events-none">
        <div className="w-3 h-3 bg-white dark:bg-white rounded-full"></div>
      </div>
    ) : null;
  };

  // Custom tile class to style completed days (GitHub-like heatmap)
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';

    // Check if this date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFutureDate = date > today;

    // Don't color future dates
    if (isFutureDate) {
      return 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500 opacity-50';
    }

    const isCompleted = completionDateObjects.some(
      completionDate =>
        completionDate.getDate() === date.getDate() &&
        completionDate.getMonth() === date.getMonth() &&
        completionDate.getFullYear() === date.getFullYear()
    );

    // Check if this date is before the loop's start date
    if (loop && loop.start_date) {
      const loopStartDate = new Date(loop.start_date);
      loopStartDate.setHours(0, 0, 0, 0);

      // Check if the loop has a future start date
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // If the loop hasn't started yet, all dates should be neutral
      if (loopStartDate > currentDate) {
        console.log("Loop hasn't started yet, all dates should be neutral");
        return 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500';
      }

      // If the date is before the loop's start date, use neutral styling
      if (date < loopStartDate) {
        return 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500';
      }
    }

    // Enhanced styling for better visibility in both light and dark modes with GitHub-like heatmap
    if (isCompleted) {
      // Make sure completed days are clearly green
      return '!bg-green-600 dark:!bg-green-700 !text-white dark:!text-white !font-bold';
    } else {
      // For past dates that weren't completed, show as broken (red) if they should have been completed
      // Check if this date is after the loop's start date and before or equal to today
      if (loop && loop.start_date) {
        const loopStartDate = new Date(loop.start_date);
        loopStartDate.setHours(0, 0, 0, 0);

        // If the loop hasn't started yet, don't mark any days as missed
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        if (loopStartDate > currentDate) {
          // Loop hasn't started yet, don't mark any days as missed
          return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
        }

        // Special handling for x_times_per_week frequency
        if (loop.frequency_type === 'x_times_per_week') {
          // Only mark days as missed if we're at the end of the week and haven't completed enough times
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

          // If it's the last day of the week (Saturday) and we're looking at a past week
          if (dayOfWeek === 6 && date < today) {
            // Get the week start (Sunday)
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - 6); // Go back to Sunday

            // Only mark as missed if the week is after the loop start date
            if (weekStart >= loopStartDate) {
              return '!bg-red-600 dark:!bg-red-800 !text-white dark:!text-white';
            }
          }

          // For other days in x_times_per_week, don't mark as missed
          return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
        }

        // For daily frequency, mark all days after start date and before today as missed if not completed
        if (loop.frequency_type === 'daily') {
          if (date >= loopStartDate && date <= today) {
            return '!bg-red-600 dark:!bg-red-800 !text-white dark:!text-white';
          }
        }

        // For specific_days frequency, only mark specific days as missed
        if (loop.frequency_type === 'specific_days') {
          const daysOfWeek = loop.frequency_details?.days || [];
          const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

          if (daysOfWeek.includes(dayOfWeek) && date >= loopStartDate && date <= today) {
            return '!bg-red-600 dark:!bg-red-800 !text-white dark:!text-white';
          }
        }

        // For every_n_days frequency, mark days that should have been completed
        if (loop.frequency_type === 'every_n_days') {
          const n = loop.frequency_details?.n || 1;
          const daysSinceStart = Math.floor((date - loopStartDate) / (1000 * 60 * 60 * 24));

          if (daysSinceStart % n === 0 && date >= loopStartDate && date <= today) {
            return '!bg-red-600 dark:!bg-red-800 !text-white dark:!text-white';
          }
        }
      }

      // For dates that don't need to be completed
      return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Card className="w-full dark:bg-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-white">Loop Heatmap Calendar</h3>

        {completionRate > 0 && (
          <div className="mt-2 md:mt-0 flex items-center">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
              Completion Rate:
            </div>
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  completionRate >= 80 ? 'bg-green-500 dark:bg-green-600' :
                  completionRate >= 50 ? 'bg-yellow-500 dark:bg-yellow-600' :
                  'bg-red-500 dark:bg-red-600'
                }`}
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {completionRate}%
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      ) : (
        <>
          <div className="calendar-container relative z-10 w-full overflow-x-auto dark:text-gray-200">
            <Calendar
              onChange={setDate}
              value={date}
              onActiveStartDateChange={({ activeStartDate }) => setViewDate(activeStartDate)}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="w-full border-0 min-w-full dark:bg-gray-800"
            />
          </div>

          {/* Calendar Legend */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 dark:bg-green-700 rounded mr-1"></div>
              <span className="text-gray-700 dark:text-gray-300">Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-600 dark:bg-red-800 rounded mr-1"></div>
              <span className="text-gray-700 dark:text-gray-300">Missed</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-900 rounded mr-1 opacity-50"></div>
              <span className="text-gray-700 dark:text-gray-300">Future/Inactive</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default LoopCalendar;
