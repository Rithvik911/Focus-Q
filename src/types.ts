export type TaskScope = "today" | "week";

export interface FocusTask {
  id: string;
  title: string;
  scope: TaskScope;
  deadline: string | null;
  order: number;
  createdAt: number;
  completedAt: number | null;
}

export interface FocusQueueData {
  tasks: FocusTask[];
  sortByDeadline: boolean;
}

export const EMPTY_DATA: FocusQueueData = { tasks: [], sortByDeadline: false };
