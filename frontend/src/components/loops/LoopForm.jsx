import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';

const FREQUENCY_TYPES = [
  { value: 'daily', label: 'Every day' },
  { value: 'specific_days', label: 'Specific days of the week' },
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'x_times_per_week', label: 'X times per week' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'friends_only', label: 'Friends Only' },
  { value: 'public', label: 'Public' },
];

const LoopForm = ({ initialData = {}, onSubmit, isSubmitting, buttonText = 'Create Loop' }) => {
  const [formData, setFormData] = useState({
    title: '',
    frequency_type: 'daily',
    frequency_details: {},
    visibility: 'private',
    icon: '',
    ...initialData,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFrequencyTypeChange = (e) => {
    const frequencyType = e.target.value;
    let frequencyDetails = {};

    // Initialize appropriate frequency details based on type
    switch (frequencyType) {
      case 'specific_days':
        frequencyDetails = { days: [] };
        break;
      case 'every_n_days':
        frequencyDetails = { n: 2 };
        break;
      case 'x_times_per_week':
        frequencyDetails = { count: 3 };
        break;
      default:
        frequencyDetails = {};
    }

    setFormData(prev => ({
      ...prev,
      frequency_type: frequencyType,
      frequency_details: frequencyDetails
    }));
  };

  const handleDayToggle = (day) => {
    // Convert from 1-7 (Mon-Sun) to 0-6 (Sun-Sat) format that backend expects
    // 1 (Mon) -> 1, 2 (Tue) -> 2, ..., 6 (Sat) -> 6, 7 (Sun) -> 0
    const backendDay = day === 7 ? 0 : day;

    const currentDays = formData.frequency_details.days || [];
    const newDays = currentDays.includes(backendDay)
      ? currentDays.filter(d => d !== backendDay)
      : [...currentDays, backendDay];

    setFormData(prev => ({
      ...prev,
      frequency_details: {
        ...prev.frequency_details,
        days: newDays
      }
    }));
  };

  const handleFrequencyDetailChange = (e) => {
    const { name, value } = e.target;

    // Map frontend field names to backend field names
    let fieldName;
    if (name === 'every_n_days') {
      fieldName = 'n';
    } else if (name === 'times_per_week') {
      fieldName = 'count';
    } else {
      fieldName = name;
    }

    setFormData(prev => ({
      ...prev,
      frequency_details: {
        ...prev.frequency_details,
        [fieldName]: parseInt(value, 10)
      }
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.frequency_type === 'specific_days' &&
        (!formData.frequency_details.days || formData.frequency_details.days.length === 0)) {
      newErrors.days_of_week = 'Select at least one day';
    }

    if (formData.frequency_type === 'every_n_days' &&
        (!formData.frequency_details.n || formData.frequency_details.n < 1)) {
      newErrors.every_n_days = 'Must be at least 1';
    }

    if (formData.frequency_type === 'x_times_per_week' &&
        (!formData.frequency_details.count ||
         formData.frequency_details.count < 1 ||
         formData.frequency_details.count > 7)) {
      newErrors.times_per_week = 'Must be between 1 and 7';
    }

    // Add start_date if not present
    if (!formData.start_date) {
      formData.start_date = new Date().toISOString().split('T')[0];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit(formData);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <Input
          label="Loop Title"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Daily Meditation"
          error={errors.title}
          required
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Frequency
          </label>
          <select
            name="frequency_type"
            value={formData.frequency_type}
            onChange={handleFrequencyTypeChange}
            className="input"
          >
            {FREQUENCY_TYPES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Frequency Details */}
        {formData.frequency_type === 'specific_days' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Days
              {errors.days_of_week && (
                <span className="text-red-500 ml-2">{errors.days_of_week}</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  type="button"
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.frequency_details.days?.includes(day.value === 7 ? 0 : day.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleDayToggle(day.value)}
                >
                  {day.label.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {formData.frequency_type === 'every_n_days' && (
          <Input
            label="Every N Days"
            id="every_n_days"
            name="every_n_days"
            type="number"
            min="1"
            value={formData.frequency_details.n || ''}
            onChange={handleFrequencyDetailChange}
            error={errors.every_n_days}
          />
        )}

        {formData.frequency_type === 'x_times_per_week' && (
          <Input
            label="Times Per Week"
            id="times_per_week"
            name="times_per_week"
            type="number"
            min="1"
            max="7"
            value={formData.frequency_details.count || ''}
            onChange={handleFrequencyDetailChange}
            error={errors.times_per_week}
          />
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Visibility
          </label>
          <select
            name="visibility"
            value={formData.visibility}
            onChange={handleChange}
            className="input"
          >
            {VISIBILITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {formData.visibility === 'public' && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Public loops will appear on the leaderboard and can be viewed by anyone.
            </p>
          )}
          {formData.visibility === 'friends_only' && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Friends-only loops will only be visible to your friends.
            </p>
          )}
        </div>

        <Input
          label="Icon (emoji)"
          id="icon"
          name="icon"
          value={formData.icon || ''}
          onChange={handleChange}
          placeholder="e.g., 🧘‍♀️"
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : buttonText}
        </Button>
      </form>
    </Card>
  );
};

export default LoopForm;
