export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  durationMinutes: number; // in minutes
  color: string; // Hex color code (4 main colors)
  icon?: string; // Optional
  completed: boolean;
  subtasks?: Subtask[]; // Optional
  inInbox?: boolean; // If true, it's unscheduled in Inbox
}

export type TimelineSlot = 
  | { type: 'task'; task: Task; startMinutes: number; endMinutes: number }
  | { type: 'free'; startTime: string; endTime: string; durationMinutes: number; startMinutes: number; endMinutes: number };

export interface DayStats {
  totalTasks: number;
  completedTasks: number;
  totalPlannedMinutes: number;
  completedMinutes: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
