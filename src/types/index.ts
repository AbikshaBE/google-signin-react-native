export type UserRole = 'admin' | 'member';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedDate: string;
  dueDate?: string | null;
  completed: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  updatedAt: string;
  createdAt: string;
  createdBy: string;
}

export interface TaskFilters {
  search: string;
  sortBy: 'assignedDate' | 'dueDate' | 'updatedAt';
  sortDirection: 'asc' | 'desc';
  status?: Task['status'] | 'all';
}

export interface OfflineMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  task: Task;
  timestamp: number;
}




