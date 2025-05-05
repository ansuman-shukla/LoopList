import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoop, useUpdateLoop } from '../hooks/useLoops';
import LoopForm from '../components/loops/LoopForm';
import Card from '../components/common/Card';

const EditLoop = () => {
  const { loopId } = useParams();
  const navigate = useNavigate();
  const { data: loop, isLoading, error } = useLoop(loopId);
  const updateLoopMutation = useUpdateLoop();
  
  const handleSubmit = async (formData) => {
    try {
      await updateLoopMutation.mutateAsync({ loopId, data: formData });
      navigate(`/loops/${loopId}`);
    } catch (error) {
      console.error('Error updating loop:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Loop</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Update your loop details below.
      </p>
      
      <LoopForm 
        initialData={loop}
        onSubmit={handleSubmit} 
        isSubmitting={updateLoopMutation.isPending}
        buttonText="Save Changes"
      />
    </div>
  );
};

export default EditLoop;
