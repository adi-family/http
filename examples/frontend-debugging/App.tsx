/**
 * Example React App
 * Demonstrates frontend debugging with mocks
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DevTools } from './components/DevTools';
import {
  useProjects,
  useCurrentUser,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './hooks/useProjects';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ProjectsApp() {
  const [filter, setFilter] = useState<
    'active' | 'pending' | 'completed' | undefined
  >();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data, isLoading, error } = useProjects({ status: filter });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const handleCreate = async () => {
    if (!newProjectName || !newProjectDesc) return;

    try {
      await createProject.mutateAsync({
        name: newProjectName,
        description: newProjectDesc,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      alert('Project created!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;

    try {
      await deleteProject.mutateAsync(id);
      alert('Project deleted!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <header
        style={{ marginBottom: 40, borderBottom: '2px solid #eee', paddingBottom: 20 }}
      >
        <h1>Frontend Debugging Example</h1>
        {userLoading ? (
          <p>Loading user...</p>
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: 40, height: 40, borderRadius: '50%' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 'bold' }}>{user.name}</div>
              <div style={{ fontSize: 14, color: '#666' }}>
                {user.email} • {user.role}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div style={{ marginBottom: 30 }}>
        <h2>Create New Project</h2>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
          <input
            type="text"
            placeholder="Description"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            style={{ flex: 2, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
          <button
            onClick={handleCreate}
            disabled={createProject.isPending}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {createProject.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>Projects</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setFilter(undefined)}
            style={{
              padding: '6px 12px',
              background: filter === undefined ? '#007bff' : '#f0f0f0',
              color: filter === undefined ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            style={{
              padding: '6px 12px',
              background: filter === 'active' ? '#007bff' : '#f0f0f0',
              color: filter === 'active' ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('pending')}
            style={{
              padding: '6px 12px',
              background: filter === 'pending' ? '#007bff' : '#f0f0f0',
              color: filter === 'pending' ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('completed')}
            style={{
              padding: '6px 12px',
              background: filter === 'completed' ? '#007bff' : '#f0f0f0',
              color: filter === 'completed' ? 'white' : 'black',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Completed
          </button>
        </div>
      </div>

      {isLoading && <div>Loading projects...</div>}

      {error && (
        <div
          style={{
            padding: 16,
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: 4,
            color: '#c00',
          }}
        >
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {data?.projects.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            background: '#f9f9f9',
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 18, color: '#999' }}>No projects found</p>
          <p style={{ fontSize: 14, color: '#999' }}>
            Create one above or change the scenario in DevTools
          </p>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {data.projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 8,
                background: 'white',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>{project.name}</h3>
                  <p style={{ margin: '0 0 12px 0', color: '#666' }}>
                    {project.description}
                  </p>
                  <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        background:
                          project.status === 'active'
                            ? '#d4edda'
                            : project.status === 'pending'
                            ? '#fff3cd'
                            : '#d1ecf1',
                        borderRadius: 4,
                      }}
                    >
                      {project.status}
                    </span>
                    <span>Progress: {project.progress}%</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(project.id)}
                  disabled={deleteProject.isPending}
                  style={{
                    padding: '6px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <DevTools />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectsApp />
    </QueryClientProvider>
  );
}
