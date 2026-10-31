import { Plugin, WorkspaceLeaf } from "obsidian";
import { EMPTY_DATA, FocusQueueData } from "./types";
import { TaskStore } from "./store";
import { FocusQueueView, VIEW_TYPE_FOCUS_QUEUE } from "./view";

export default class FocusQueuePlugin extends Plugin {
  private data: FocusQueueData = structuredClone(EMPTY_DATA);
  private store!: TaskStore;

  async onload(): Promise<void> {
    const loaded = await this.loadData() as { tasks?: Array<Record<string, unknown>>; sortByDeadline?: boolean } | null;
    const rawTasks = Array.isArray(loaded?.tasks) ? loaded.tasks : [];
    this.data = {
      sortByDeadline: loaded?.sortByDeadline === true,
      tasks: rawTasks
        .filter((task) => typeof task.id === "string" && typeof task.title === "string")
        .sort((a, b) => {
          const oldPriorityA = typeof a.priority === "number" ? a.priority : 0;
          const oldPriorityB = typeof b.priority === "number" ? b.priority : 0;
          if (oldPriorityA !== oldPriorityB) return oldPriorityB - oldPriorityA;
          return Number(a.order ?? 0) - Number(b.order ?? 0);
        })
        .map((task, index) => ({
          id: String(task.id),
          title: String(task.title),
          scope: task.scope === "week" ? "week" : "today",
          deadline: typeof task.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline) ? task.deadline : null,
          order: index,
          createdAt: Number(task.createdAt ?? Date.now()),
          completedAt: typeof task.completedAt === "number" ? task.completedAt : null
        }))
    };
    this.store = new TaskStore(this.data, () => this.saveData(this.data), () => this.refreshViews());

    this.registerView(VIEW_TYPE_FOCUS_QUEUE, (leaf) => new FocusQueueView(leaf, this.store));
    this.addRibbonIcon("list-checks", "Open Focus Queue", () => void this.activateView());
    this.addCommand({ id: "open-focus-queue", name: "Open Focus Queue", callback: () => void this.activateView() });
    this.addCommand({ id: "add-today-task", name: "Add a task for today", callback: () => void this.activateView() });
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOCUS_QUEUE);
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOCUS_QUEUE)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_FOCUS_QUEUE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private refreshViews(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_FOCUS_QUEUE).forEach((leaf: WorkspaceLeaf) => {
      const view = leaf.view;
      if (view instanceof FocusQueueView) view.render();
    });
  }
}
