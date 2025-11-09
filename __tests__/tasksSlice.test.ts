import tasksReducer, {
  setFilters,
  resetFilters,
  enqueueOfflineMutation,
  clearOfflineQueue,
  hydrateFromCache,
} from '@/src/store/tasksSlice';
import type { Task } from '@/src/types';

const baseTask: Task = {
  id: '1',
  title: 'Sample',
  description: 'Test task',
  assignedTo: 'user@example.com',
  assignedDate: new Date().toISOString(),
  dueDate: null,
  completed: false,
  status: 'not_started',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'admin',
};

describe('tasksSlice reducers', () => {
  it('updates filters and can reset', () => {
    let state = tasksReducer(undefined, { type: '@@INIT' });
    state = tasksReducer(state, setFilters({ search: 'design', sortDirection: 'desc' }));
    expect(state.filters.search).toBe('design');
    expect(state.filters.sortDirection).toBe('desc');

    state = tasksReducer(state, resetFilters());
    expect(state.filters.search).toBe('');
    expect(state.filters.sortDirection).toBe('asc');
  });

  it('can hydrate from cached tasks', () => {
    const state = tasksReducer(undefined, hydrateFromCache([baseTask]));
    expect(state.ids).toContain('1');
    expect(state.entities['1']).toMatchObject({ title: 'Sample' });
  });

  it('manages offline queue lifecycle', () => {
    let state = tasksReducer(undefined, { type: '@@INIT' });
    state = tasksReducer(
      state,
      enqueueOfflineMutation({
        id: 'queue-1',
        type: 'create',
        task: baseTask,
        timestamp: Date.now(),
      })
    );
    expect(state.offlineQueue).toHaveLength(1);

    state = tasksReducer(state, clearOfflineQueue());
    expect(state.offlineQueue).toHaveLength(0);
  });
});





