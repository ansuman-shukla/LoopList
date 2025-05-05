/**
 * Format a frequency type and details into a human-readable string
 * @param {string} frequencyType - The frequency type
 * @param {object} frequencyDetails - The frequency details
 * @returns {string} Formatted frequency string
 */
export const formatFrequency = (frequencyType, frequencyDetails) => {
  if (!frequencyType) return '';
  
  switch (frequencyType) {
    case 'daily':
      return 'Every day';
      
    case 'specific_days':
      if (!frequencyDetails?.days_of_week?.length) return 'Specific days';
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const selectedDays = frequencyDetails.days_of_week.map(day => days[day - 1]);
      
      if (selectedDays.length === 7) return 'Every day';
      if (selectedDays.length === 5 && 
          selectedDays.includes('Monday') && 
          selectedDays.includes('Friday')) {
        return 'Weekdays';
      }
      if (selectedDays.length === 2 && 
          selectedDays.includes('Saturday') && 
          selectedDays.includes('Sunday')) {
        return 'Weekends';
      }
      
      return selectedDays.join(', ');
      
    case 'every_n_days':
      const n = frequencyDetails?.every_n_days || 0;
      if (n === 1) return 'Every day';
      if (n === 2) return 'Every other day';
      return `Every ${n} days`;
      
    case 'weekly':
      const times = frequencyDetails?.times_per_week || 0;
      if (times === 1) return 'Once a week';
      if (times === 7) return 'Every day';
      return `${times} times per week`;
      
    default:
      return 'Custom';
  }
};

/**
 * Format a number with suffix (e.g., 1st, 2nd, 3rd)
 * @param {number} n - The number to format
 * @returns {string} Formatted number with suffix
 */
export const formatNumberWithSuffix = (n) => {
  if (n >= 11 && n <= 13) {
    return `${n}th`;
  }
  
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};

/**
 * Truncate a string to a specified length
 * @param {string} str - The string to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
export const truncateString = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  
  return `${str.substring(0, length)}...`;
};
