import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLoops,
  getLoop,
  createLoop,
  updateLoop,
  archiveLoop,
  completeLoop,
  getLoopCalendar,
  getCompletionCount
} from '../api/loops';

export const useLoops = (status = null, page = 0, limit = 10) => {
  return useQuery({
    queryKey: ['loops', { status, page, limit }],
    queryFn: () => getLoops(status, page * limit, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    keepPreviousData: true,
  });
};

export const useLoop = (loopId) => {
  return useQuery({
    queryKey: ['loop', loopId],
    queryFn: () => getLoop(loopId),
    enabled: !!loopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreateLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLoop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loops'] });
    },
  });
};

export const useUpdateLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loopId, data }) => updateLoop(loopId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loops'] });
      // Handle both id and _id to be safe
      const loopId = data && (data.id || data._id);
      if (loopId) {
        queryClient.invalidateQueries({ queryKey: ['loop', loopId] });
      }
    },
  });
};

export const useArchiveLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveLoop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loops'] });
    },
  });
};

export const useCompleteLoop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loopId, date }) => completeLoop(loopId, date),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loops'] });
      // Handle both id and _id to be safe
      const loopId = data && (data.id || data._id);
      if (loopId) {
        queryClient.invalidateQueries({ queryKey: ['loop', loopId] });
        queryClient.invalidateQueries({ queryKey: ['loop-calendar', loopId] });
        queryClient.invalidateQueries({ queryKey: ['completion-count', loopId] });
      }
    },
    onError: (error, variables) => {
      // Even on error, we should refresh the completion count
      // This is especially important for "already completed" errors
      const { loopId } = variables;
      if (loopId) {
        queryClient.invalidateQueries({ queryKey: ['completion-count', loopId] });
        queryClient.invalidateQueries({ queryKey: ['loop-calendar', loopId] });
      }
    }
  });
};

export const useLoopCalendar = (loopId, startDate = null, endDate = null) => {
  return useQuery({
    queryKey: ['loop-calendar', loopId, { startDate, endDate }],
    queryFn: () => getLoopCalendar(loopId, startDate, endDate),
    enabled: !!loopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCompletionCount = (loopId) => {
  return useQuery({
    queryKey: ['completion-count', loopId],
    queryFn: () => getCompletionCount(loopId),
    enabled: !!loopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
