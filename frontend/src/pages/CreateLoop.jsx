import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateLoop } from '../hooks/useLoops';
import LoopForm from '../components/loops/LoopForm';
import Card from '../components/common/Card';

const CreateLoop = () => {
  const navigate = useNavigate();
  const createLoopMutation = useCreateLoop();
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setError(null);
    try {
      const newLoop = await createLoopMutation.mutateAsync(formData);
      console.log('Loop creation response:', newLoop);

      // Validate that we have a valid loop ID before navigating
      // Check for both id and _id to handle different response formats
      const loopId = newLoop && (newLoop.id || newLoop._id);

      if (loopId) {
        navigate(`/loops/${loopId}`);
      } else {
        setError("Failed to create loop: Invalid response from server");
        console.error('Invalid loop response:', newLoop);
      }
    } catch (error) {
      setError(`Error creating loop: ${error.message || 'Unknown error'}`);
      console.error('Error creating loop:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create a New Loop</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Define a new micro-habit to track. Be specific about what you want to accomplish and how often.
      </p>

      {error && (
        <Card className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="text-red-600 dark:text-red-400">
            {error}
          </div>
        </Card>
      )}

      <LoopForm
        onSubmit={handleSubmit}
        isSubmitting={createLoopMutation.isPending}
        buttonText="Create Loop"
      />
    </div>
  );
};

export default CreateLoop;
