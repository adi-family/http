/**
 * React Hooks for Projects
 * Uses TanStack Query for data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  getProjectsConfig,
  getProjectConfig,
  createProjectConfig,
  updateProjectConfig,
  deleteProjectConfig,
  getCurrentUserConfig,
} from '../api/configs';

// ============================================================================
// Query Hooks
// ============================================================================

export function useProjects(filters?: {
  status?: 'active' | 'pending' | 'completed';
  limit?: number;
}) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () =>
      apiClient.run(getProjectsConfig, {
        query: filters,
      }),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () =>
      apiClient.run(getProjectConfig, {
        params: { id },
      }),
    enabled: !!id,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => apiClient.run(getCurrentUserConfig),
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiClient.run(createProjectConfig, {
        body: data,
      }),
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      status?: 'active' | 'pending' | 'completed';
      progress?: number;
    }) =>
      apiClient.run(updateProjectConfig, {
        params: { id },
        body: data,
      }),
    onSuccess: (_, variables) => {
      // Invalidate specific project and list
      queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.run(deleteProjectConfig, {
        params: { id },
      }),
    onSuccess: () => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
