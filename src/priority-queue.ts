/** A max binary heap. The highest-priority value is removed first. */
export class PriorityQueue<T> {
  private readonly heap: T[] = [];

  constructor(private readonly comesBefore: (a: T, b: T) => boolean) {}

  push(value: T): void {
    this.heap.push(value);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const tail = this.heap.pop();
    if (this.heap.length > 0 && tail !== undefined) {
      this.heap[0] = tail;
      this.sinkDown(0);
    }
    return top;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this.comesBefore(this.heap[index], this.heap[parent])) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }

  private sinkDown(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let best = index;
      if (left < this.heap.length && this.comesBefore(this.heap[left], this.heap[best])) best = left;
      if (right < this.heap.length && this.comesBefore(this.heap[right], this.heap[best])) best = right;
      if (best === index) return;
      [this.heap[index], this.heap[best]] = [this.heap[best], this.heap[index]];
      index = best;
    }
  }
}
