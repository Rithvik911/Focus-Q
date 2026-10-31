import type { FocusQueueData, FocusTask, TaskScope } from "./types";
import { PriorityQueue } from "./priority-queue";

export class TaskStore {
  constructor(
    private readonly data: FocusQueueData,
    private readonly persist: () => Promise<void>,
    private readonly changed: () => void
  ) {}

  all(): FocusTask[] {
    return this.data.tasks;
  }

  queued(scope: TaskScope): FocusTask[] {
    const queue = new PriorityQueue<FocusTask>((a, b) => {
      if (this.data.sortByDeadline) {
        if (a.deadline !== null && b.deadline === null) return true;
        if (a.deadline === null && b.deadline !== null) return false;
        if (a.deadline !== null && b.deadline !== null && a.deadline !== b.deadline) return a.deadline < b.deadline;
      }
      return a.order < b.order;
    });
    this.data.tasks
      .filter((task) => this.belongsTo(task, scope) && task.completedAt === null)
      .forEach((task) => queue.push(task));

    const result: FocusTask[] = [];
    while (queue.size > 0) {
      const task = queue.pop();
      if (task) result.push(task);
    }
    return result;
  }

  completed(scope: TaskScope): FocusTask[] {
    return this.data.tasks
      .filter((task) => this.belongsTo(task, scope) && task.completedAt !== null)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }

  isSortedByDeadline(): boolean {
    return this.data.sortByDeadline;
  }

  async setSortByDeadline(enabled: boolean): Promise<void> {
    this.data.sortByDeadline = enabled;
    await this.commit();
  }

  async add(title: string, scope: TaskScope, deadline: string | null): Promise<void> {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const nextOrder = this.data.tasks.reduce((max, task) => Math.max(max, task.order), -1) + 1;
    this.data.tasks.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: cleanTitle,
      scope,
      deadline: deadline || null,
      order: nextOrder,
      createdAt: Date.now(),
      completedAt: null
    });
    await this.commit();
  }

  async toggle(id: string): Promise<void> {
    const task = this.find(id);
    if (!task) return;
    if (task.completedAt === null) {
      task.completedAt = Date.now();
    } else {
      task.completedAt = null;
      task.order = this.data.tasks
        .filter((item) => item.completedAt === null && item.id !== id)
        .reduce((max, item) => Math.max(max, item.order), -1) + 1;
    }
    await this.commit();
  }

  async setDeadline(id: string, deadline: string | null): Promise<void> {
    const task = this.find(id);
    if (!task) return;
    task.deadline = deadline || null;
    await this.commit();
  }

  async remove(id: string): Promise<void> {
    const index = this.data.tasks.findIndex((task) => task.id === id);
    if (index === -1) return;
    this.data.tasks.splice(index, 1);
    await this.commit();
  }

  async move(draggedId: string, targetId: string, visibleScope: TaskScope): Promise<void> {
    if (this.data.sortByDeadline) return;
    const dragged = this.find(draggedId);
    const target = this.find(targetId);
    if (!dragged || !target || dragged.id === target.id) return;
    if (!this.belongsTo(dragged, visibleScope) || !this.belongsTo(target, visibleScope)) return;

    const visible = this.queued(visibleScope);
    const from = visible.findIndex((task) => task.id === dragged.id);
    const to = visible.findIndex((task) => task.id === target.id);
    if (from === -1 || to === -1) return;
    visible.splice(to, 0, visible.splice(from, 1)[0]);

    const allOpen = this.data.tasks
      .filter((task) => task.completedAt === null)
      .sort((a, b) => a.order - b.order);
    if (visibleScope === "week") {
      visible.forEach((task, index) => { task.order = index; });
    } else {
      const reorderedToday = [...visible];
      allOpen.forEach((task, index) => {
        if (task.scope === "today") allOpen[index] = reorderedToday.shift() ?? task;
      });
      allOpen.forEach((task, index) => { task.order = index; });
    }
    await this.commit();
  }

  async clearCompleted(scope: TaskScope): Promise<void> {
    this.data.tasks = this.data.tasks.filter((task) => task.completedAt === null || !this.belongsTo(task, scope));
    await this.commit();
  }

  private belongsTo(task: FocusTask, scope: TaskScope): boolean {
    return scope === "week" || task.scope === "today";
  }

  private find(id: string): FocusTask | undefined {
    return this.data.tasks.find((task) => task.id === id);
  }

  private async commit(): Promise<void> {
    await this.persist();
    this.changed();
  }
}
