import tasksReducer, { syncOfflineQueue } from '@/src/store/tasksSlice';
import type { Task, OfflineMutation } from '@/src/types';

const task: Task = {
  id: 'task-1',
  title: 'Offline task',
  description: 'Created offline',
  assignedTo: 'user@example.com',
  assignedDate: new Date().toISOString(),
  dueDate: null,
  completed: false,
  status: 'not_started',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'admin',
};

const mutation: OfflineMutation = {
  id: 'mutation-1',
  type: 'create',
  task,
  timestamp: Date.now(),
};

describe('syncOfflineQueue extra reducer', () => {
  it('removes synced actions from queue', () => {
    const baseState = tasksReducer(undefined, { type: '@@INIT' });
    const stateWithQueue = {
      ...baseState,
      offlineQueue: [mutation],
    };

    const nextState = tasksReducer(
      stateWithQueue,
      syncOfflineQueue.fulfilled([mutation], '', undefined as any)
    );

    expect(nextState.offlineQueue).toHaveLength(0);
  });
});





