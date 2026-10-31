import { App, ItemView, Modal, WorkspaceLeaf, setIcon } from "obsidian";
import type { FocusTask, TaskScope } from "./types";
import { TaskStore } from "./store";

export const VIEW_TYPE_FOCUS_QUEUE = "focus-queue-view";

export class FocusQueueView extends ItemView {
  private activeScope: TaskScope = "today";
  private draggedId: string | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly store: TaskStore) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_FOCUS_QUEUE; }
  getDisplayText(): string { return "Focus Queue"; }
  getIcon(): string { return "list-checks"; }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass("fq-root");

    const shell = root.createDiv({ cls: "fq-shell" });
    const header = shell.createDiv({ cls: "fq-header" });
    const brand = header.createDiv({ cls: "fq-brand" });
    brand.createSpan({ cls: "fq-eyebrow", text: "STUDY FLOW" });
    brand.createEl("h1", { text: "Focus Queue" });
    brand.createEl("p", { text: "One clear task at a time." });
    const date = header.createDiv({ cls: "fq-date" });
    date.createSpan({ text: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date()) });
    date.createEl("strong", { text: String(new Date().getDate()).padStart(2, "0") });

    this.renderTabs(shell);
    this.renderNextUp(shell);
    this.renderComposer(shell);
    this.renderQueue(shell);
  }

  private renderTabs(parent: HTMLElement): void {
    const tabs = parent.createDiv({ cls: "fq-tabs", attr: { role: "tablist", "aria-label": "Task period" } });
    (["today", "week"] as TaskScope[]).forEach((scope) => {
      const count = this.store.queued(scope).length;
      const button = tabs.createEl("button", {
        cls: `fq-tab${this.activeScope === scope ? " is-active" : ""}`,
        attr: { type: "button", role: "tab", "aria-selected": String(this.activeScope === scope) }
      });
      button.createSpan({ text: scope === "today" ? "Today" : "This week" });
      button.createSpan({ cls: "fq-count", text: String(count) });
      button.addEventListener("click", () => { this.activeScope = scope; this.render(); });
    });
  }

  private renderNextUp(parent: HTMLElement): void {
    const next = this.store.queued(this.activeScope)[0];
    const card = parent.createDiv({ cls: `fq-next${next ? "" : " is-empty"}` });
    const top = card.createDiv({ cls: "fq-next-top" });
    top.createSpan({ cls: "fq-next-label", text: next ? "NEXT UP" : "QUEUE CLEAR" });
    const pulse = top.createSpan({ cls: "fq-pulse", attr: { "aria-hidden": "true" } });
    if (!next) {
      card.createEl("h2", { text: this.activeScope === "today" ? "A quiet day." : "Space in your week." });
      card.createEl("p", { text: "Add one small, concrete task below." });
      return;
    }
    card.createEl("h2", { text: next.title });
    const meta = card.createDiv({ cls: "fq-next-meta" });
    if (next.deadline) meta.appendChild(this.createDeadline(next.deadline));
    const done = meta.createEl("button", { cls: "fq-start", text: "Mark complete", attr: { type: "button" } });
    done.addEventListener("click", () => void this.store.toggle(next.id));
    pulse.setAttribute("title", "First task in your queue");
  }

  private renderComposer(parent: HTMLElement): void {
    const form = parent.createEl("form", { cls: "fq-composer" });
    const inputWrap = form.createDiv({ cls: "fq-input-wrap" });
    const icon = inputWrap.createSpan({ cls: "fq-input-icon" });
    setIcon(icon, "plus");
    const input = inputWrap.createEl("input", {
      cls: "fq-input",
      attr: { type: "text", placeholder: "What will you study?", "aria-label": "Task title", maxlength: "180" }
    });
    const controls = form.createDiv({ cls: "fq-compose-controls" });
    const deadlineWrap = controls.createEl("label", { cls: "fq-deadline-input" });
    deadlineWrap.createSpan({ text: "Deadline" });
    const deadline = deadlineWrap.createEl("input", { attr: { type: "date", "aria-label": "Optional deadline" } });
    const add = controls.createEl("button", { cls: "fq-add", text: "Add task", attr: { type: "submit" } });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = input.value.trim();
      if (!title) { input.focus(); return; }
      void this.store.add(title, this.activeScope, deadline.value || null);
      input.value = "";
      deadline.value = "";
    });
    add.setAttribute("aria-label", `Add task to ${this.activeScope === "today" ? "today" : "this week"}`);
  }

  private renderQueue(parent: HTMLElement): void {
    const active = this.store.queued(this.activeScope);
    const completed = this.store.completed(this.activeScope);
    const section = parent.createDiv({ cls: "fq-section" });
    const heading = section.createDiv({ cls: "fq-section-heading" });
    const headingCopy = heading.createDiv();
    headingCopy.createEl("h3", { text: "Your queue" });
    headingCopy.createSpan({ text: active.length === 1 ? "1 open task" : `${active.length} open tasks` });
    const sorter = heading.createEl("label", { cls: "fq-sort-toggle" });
    const sortCheckbox = sorter.createEl("input", { attr: { type: "checkbox" } });
    sortCheckbox.checked = this.store.isSortedByDeadline();
    sorter.createSpan({ text: "Sort by deadline" });
    sortCheckbox.addEventListener("change", () => void this.store.setSortByDeadline(sortCheckbox.checked));
    const list = section.createDiv({ cls: "fq-list", attr: { role: "list" } });
    if (active.length === 0) {
      const empty = list.createDiv({ cls: "fq-list-empty" });
      const emptyIcon = empty.createSpan();
      setIcon(emptyIcon, "sparkles");
      empty.createSpan({ text: "Nothing waiting here." });
    } else {
      active.forEach((task, index) => this.renderTask(list, task, index));
    }
    if (completed.length > 0) this.renderCompleted(section, completed);
  }

  private renderTask(parent: HTMLElement, task: FocusTask, index: number): void {
    const deadlineSorted = this.store.isSortedByDeadline();
    const row = parent.createDiv({ cls: `fq-task${deadlineSorted ? " is-deadline-sorted" : ""}`, attr: { role: "listitem", draggable: String(!deadlineSorted), "data-task-id": task.id } });
    const rank = row.createDiv({ cls: "fq-rank" });
    rank.createSpan({ text: String(index + 1).padStart(2, "0") });
    const dragIcon = rank.createSpan({ cls: "fq-drag", attr: { title: deadlineSorted ? "Turn off deadline sorting to drag" : "Drag to reorder" } });
    setIcon(dragIcon, deadlineSorted ? "calendar-clock" : "grip-vertical");
    const body = row.createDiv({ cls: "fq-task-body" });
    body.createDiv({ cls: "fq-task-title", text: task.title });
    if (task.deadline) body.appendChild(this.createDeadline(task.deadline));
    const actions = row.createDiv({ cls: "fq-actions" });
    this.iconButton(actions, "calendar-plus", task.deadline ? "Change deadline" : "Add deadline", () => {
      new DeadlineModal(this.app, task.deadline, (value) => void this.store.setDeadline(task.id, value)).open();
    });
    this.iconButton(actions, "check", "Complete task", () => void this.store.toggle(task.id));
    this.iconButton(actions, "trash-2", "Delete task", () => void this.store.remove(task.id));

    row.addEventListener("dragstart", (event) => {
      this.draggedId = task.id;
      event.dataTransfer?.setData("text/plain", task.id);
      event.dataTransfer?.setDragImage(row, 28, 20);
      row.addClass("is-dragging");
    });
    row.addEventListener("dragend", () => { this.draggedId = null; row.removeClass("is-dragging"); });
    row.addEventListener("dragover", (event) => {
      if (!this.draggedId) return;
      event.preventDefault();
      row.addClass("is-drop-target");
    });
    row.addEventListener("dragleave", () => row.removeClass("is-drop-target"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.removeClass("is-drop-target");
      const dragged = event.dataTransfer?.getData("text/plain") || this.draggedId;
      if (dragged) void this.store.move(dragged, task.id, this.activeScope);
    });
  }

  private renderCompleted(parent: HTMLElement, tasks: FocusTask[]): void {
    const details = parent.createEl("details", { cls: "fq-completed" });
    const summary = details.createEl("summary");
    summary.createSpan({ text: `Completed · ${tasks.length}` });
    const clear = summary.createEl("button", { text: "Clear all", attr: { type: "button" } });
    clear.addEventListener("click", (event) => { event.preventDefault(); void this.store.clearCompleted(this.activeScope); });
    const list = details.createDiv({ cls: "fq-completed-list" });
    tasks.forEach((task) => {
      const row = list.createDiv({ cls: "fq-completed-task" });
      const restore = row.createEl("button", { attr: { type: "button", "aria-label": "Restore task" } });
      setIcon(restore, "rotate-ccw");
      restore.addEventListener("click", () => void this.store.toggle(task.id));
      row.createSpan({ text: task.title });
      const remove = row.createEl("button", { attr: { type: "button", "aria-label": "Delete task" } });
      setIcon(remove, "x");
      remove.addEventListener("click", () => void this.store.remove(task.id));
    });
  }

  private iconButton(parent: HTMLElement, icon: string, label: string, action: () => void, disabled = false): void {
    const button = parent.createEl("button", { cls: "fq-icon-button", attr: { type: "button", "aria-label": label, title: label } });
    setIcon(button, icon);
    button.disabled = disabled;
    button.addEventListener("click", action);
  }

  private createDeadline(value: string): HTMLElement {
    const today = this.localDateKey(new Date());
    const badge = document.createElement("span");
    const state = value < today ? " is-overdue" : value === today ? " is-today" : "";
    badge.className = `fq-deadline${state}`;
    const icon = badge.createSpan();
    setIcon(icon, "calendar-days");
    const date = new Date(`${value}T00:00:00`);
    const text = value === today
      ? "Due today"
      : value < today
        ? `Overdue · ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}`
        : `Due ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}`;
    badge.createSpan({ text });
    return badge;
  }

  private localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

class DeadlineModal extends Modal {
  constructor(
    app: App,
    private readonly current: string | null,
    private readonly save: (value: string | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("fq-deadline-modal");
    contentEl.createEl("h2", { text: this.current ? "Change deadline" : "Add a deadline" });
    contentEl.createEl("p", { text: "Choose a date, or remove the deadline from this task." });
    const form = contentEl.createEl("form");
    const input = form.createEl("input", { attr: { type: "date", "aria-label": "Task deadline" } });
    input.value = this.current ?? "";
    const buttons = form.createDiv({ cls: "fq-modal-actions" });
    if (this.current) {
      const clear = buttons.createEl("button", { text: "Remove deadline", attr: { type: "button" } });
      clear.addEventListener("click", () => { this.save(null); this.close(); });
    }
    buttons.createEl("button", { text: "Save", cls: "mod-cta", attr: { type: "submit" } });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.save(input.value || null);
      this.close();
    });
    window.setTimeout(() => input.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
