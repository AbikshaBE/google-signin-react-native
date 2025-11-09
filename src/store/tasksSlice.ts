import {
  createAsyncThunk,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { cacheTasks, getSupabaseClient, readCachedTasks } from '../services/supabaseClient';
import type { OfflineMutation, Task, TaskFilters } from '../types';
import { signOut } from './authSlice';

interface TasksState {
  entities: Record<string, Task>;
  ids: string[];
  status: 'idle' | 'loading' | 'error' | 'syncing';
  error: string | null;
  filters: TaskFilters;
  offlineQueue: OfflineMutation[];
  lastSyncedAt: string | null;
}

const defaultFilters: TaskFilters = {
  search: '',
  sortBy: 'assignedDate',
  sortDirection: 'asc',
  status: 'all',
};

const initialState: TasksState = {
  entities: {},
  ids: [],
  status: 'idle',
  error: null,
  filters: defaultFilters,
  offlineQueue: [],
  lastSyncedAt: null,
};

function upsertMany(state: TasksState, tasks: Task[]) {
  const cloned = { ...state.entities };
  tasks.forEach((task) => {
    cloned[task.id] = task;
  });
  state.entities = cloned;
  state.ids = Object.keys(cloned).sort(
    (a, b) =>
      new Date(cloned[b].updatedAt).getTime() - new Date(cloned[a].updatedAt).getTime()
  );
}

function mapTask(row: Record<string, any>): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignedTo: row.assigned_to,
    assignedDate: row.assigned_date,
    dueDate: row.due_date,
    completed: row.completed,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (_, { rejectWithValue }) => {
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      const cached = await readCachedTasks<Task[]>([]);
      if (cached.length) {
        return { tasks: cached, fromCache: true };
      }
      return rejectWithValue(
        error instanceof Error ? error.message : 'Supabase misconfigured'
      );
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        const cached = await readCachedTasks<Task[]>([]);
        if (cached.length) {
          return { tasks: cached, fromCache: true };
        }
        return rejectWithValue(error.message);
      }

      const tasks = (data ?? []).map(mapTask);
      await cacheTasks(tasks);
      return { tasks, fromCache: false };
    } catch (error) {
      const cached = await readCachedTasks<Task[]>([]);
      if (cached.length) {
        return { tasks: cached, fromCache: true };
      }
      return rejectWithValue(
        error instanceof Error ? error.message : 'Network request failed'
      );
    }
  }
);

interface TaskInput {
  title: string;
  description: string;
  assignedTo: string;
  assignedDate: string;
  dueDate?: string | null;
  status?: Task['status'];
}

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (
    payload: TaskInput,
    { getState, rejectWithValue, requestId }
  ) => {
    const state = getState() as {
      network: { isConnected: boolean | null };
      auth: { profile: { id: string } | null };
    };
    const isConnected = state.network?.isConnected ?? false;
    const profileId = state.auth?.profile?.id;

    if (!profileId) {
      return rejectWithValue('No authenticated user');
    }

    const newTask: Task = {
      id: uuidv4(),
      title: payload.title,
      description: payload.description,
      assignedTo: payload.assignedTo,
      assignedDate: payload.assignedDate,
      dueDate: payload.dueDate ?? null,
      completed: false,
      status: payload.status ?? 'not_started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: profileId,
    };

    if (!isConnected) {
      return { task: newTask, offline: true, requestId };
    }

    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      return { task: newTask, offline: true, requestId };
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          assigned_to: newTask.assignedTo,
          assigned_date: newTask.assignedDate,
          due_date: newTask.dueDate,
          completed: newTask.completed,
          status: newTask.status,
          created_by: newTask.createdBy,
        })
        .select('*')
        .single();

      if (error) {
        return rejectWithValue(error.message);
      }

      return {
        task: {
          ...newTask,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        offline: false,
        requestId,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create task'
      );
    }
  }
);

interface UpdatePayload {
  id: string;
  changes: Partial<
    Pick<
      Task,
      'title' | 'description' | 'dueDate' | 'status' | 'completed' | 'assignedTo'
    >
  >;
}

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, changes }: UpdatePayload, { getState, rejectWithValue, requestId }) => {
    const state = getState() as { network: { isConnected: boolean | null } };
    const isConnected = state.network?.isConnected ?? false;

    const updatedAt = new Date().toISOString();

    if (!isConnected) {
      return { id, changes: { ...changes, updatedAt }, offline: true, requestId };
    }

    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      return { id, changes: { ...changes, updatedAt }, offline: true, requestId };
    }

    const payload = {
      ...(changes.title ? { title: changes.title } : {}),
      ...(changes.description ? { description: changes.description } : {}),
      ...(changes.dueDate !== undefined ? { due_date: changes.dueDate } : {}),
      ...(changes.status ? { status: changes.status } : {}),
      ...(changes.completed !== undefined ? { completed: changes.completed } : {}),
      ...(changes.assignedTo ? { assigned_to: changes.assignedTo } : {}),
      updated_at: updatedAt,
    };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return rejectWithValue(error.message);
      }

      const result: Partial<Task> = {
        id: data.id,
        title: data.title,
        description: data.description,
        dueDate: data.due_date,
        status: data.status,
        completed: data.completed,
        assignedTo: data.assigned_to,
        updatedAt: data.updated_at,
      };

      return { id, changes: result, offline: false, requestId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update task'
      );
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { getState, rejectWithValue, requestId }) => {
    const state = getState() as { network: { isConnected: boolean | null } };
    const isConnected = state.network?.isConnected ?? false;

    if (!isConnected) {
      return { id, offline: true, requestId };
    }

    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      return { id, offline: true, requestId };
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        return rejectWithValue(error.message);
      }
      return { id, offline: false, requestId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete task'
      );
    }
  }
);

export const syncOfflineQueue = createAsyncThunk(
  'tasks/syncOfflineQueue',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { tasks: TasksState };
    const queue = state.tasks?.offlineQueue ?? [];
    if (!queue.length) {
      return [];
    }

    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Supabase misconfigured');
    }

    const processed: OfflineMutation[] = [];

    for (const entry of queue) {
      try {
        if (entry.type === 'create') {
          const task = entry.task;
          const { error } = await supabase.from('tasks').upsert({
            id: task.id,
            title: task.title,
            description: task.description,
            assigned_to: task.assignedTo,
            assigned_date: task.assignedDate,
            due_date: task.dueDate,
            completed: task.completed,
            status: task.status,
            created_by: task.createdBy,
            updated_at: task.updatedAt,
            created_at: task.createdAt,
          });
          if (error) {
            throw new Error(error.message);
          }
        }

        if (entry.type === 'update') {
          const task = entry.task;
          const { error } = await supabase
            .from('tasks')
            .update({
              title: task.title,
              description: task.description,
              assigned_to: task.assignedTo,
              due_date: task.dueDate,
              status: task.status,
              completed: task.completed,
              updated_at: task.updatedAt,
            })
            .eq('id', task.id);
          if (error) {
            throw new Error(error.message);
          }
        }

        if (entry.type === 'delete') {
          const { error } = await supabase.from('tasks').delete().eq('id', entry.task.id);
          if (error) {
            throw new Error(error.message);
          }
        }

        processed.push(entry);
      } catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Sync failed');
      }
    }

    return processed;
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<TaskFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = defaultFilters;
    },
    enqueueOfflineMutation(state, action: PayloadAction<OfflineMutation>) {
      state.offlineQueue.push(action.payload);
    },
    clearOfflineQueue(state) {
      state.offlineQueue = [];
    },
    hydrateFromCache(state, action: PayloadAction<Task[]>) {
      upsertMany(state, action.payload);
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = 'idle';
        upsertMany(state, action.payload.tasks);
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(createTask.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const { task, offline } = action.payload;
        upsertMany(state, [task]);
        state.status = 'idle';
        if (offline) {
          state.offlineQueue.push({
            id: nanoid(),
            type: 'create',
            task,
            timestamp: Date.now(),
          });
        }
        void cacheTasks(Object.values(state.entities));
      })
      .addCase(createTask.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const { id, changes, offline } = action.payload;
        const existing = state.entities[id];
        if (existing) {
          const merged = { ...existing, ...changes, id };
          state.entities[id] = merged as Task;
        }
        if (offline && existing) {
          state.offlineQueue.push({
            id: nanoid(),
            type: 'update',
            task: state.entities[id],
            timestamp: Date.now(),
          });
        }
        void cacheTasks(Object.values(state.entities));
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload as string;
        state.status = 'error';
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const { id, offline } = action.payload;
        delete state.entities[id];
        state.ids = state.ids.filter((existingId) => existingId !== id);
        if (offline) {
          state.offlineQueue.push({
            id: nanoid(),
            type: 'delete',
            task: { id } as Task,
            timestamp: Date.now(),
          });
        }
        void cacheTasks(Object.values(state.entities));
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(syncOfflineQueue.pending, (state) => {
        state.status = 'syncing';
      })
      .addCase(syncOfflineQueue.fulfilled, (state, action) => {
        const processed = action.payload;
        if (processed.length) {
          const ids = new Set(processed.map((mutation) => mutation.id));
          state.offlineQueue = state.offlineQueue.filter((entry) => !ids.has(entry.id));
        }
        state.status = 'idle';
        state.lastSyncedAt = new Date().toISOString();
      })
      .addCase(syncOfflineQueue.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload as string;
      })
      .addCase(signOut.fulfilled, (state) => {
        return initialState;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  enqueueOfflineMutation,
  clearOfflineQueue,
  hydrateFromCache,
} = tasksSlice.actions;

export default tasksSlice.reducer;

