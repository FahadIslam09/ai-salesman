// ponytail: in-memory debounce buffer + per-key mutex. Single backend replica only.
// Upgrade path: Redis or a DB-backed queue if multiple replicas are ever needed.
export interface QueueItem {
  text?: string;
  attachments?: { url: string; type: string }[];
}

type FlushHandler = (items: QueueItem[]) => Promise<void>;

export class MessageQueue {
  private buffers = new Map<string, QueueItem[]>();
  private handlers = new Map<string, FlushHandler>();
  private timers = new Map<string, NodeJS.Timeout>();
  private processing = new Set<string>();

  constructor(private delayMs = 3500) {}

  enqueue(key: string, item: QueueItem, onFlush: FlushHandler): void {
    const buffer = this.buffers.get(key) ?? [];
    buffer.push(item);
    this.buffers.set(key, buffer);
    this.handlers.set(key, onFlush);

    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    this.timers.set(key, setTimeout(() => this.flush(key), this.delayMs));
  }

  private async flush(key: string): Promise<void> {
    this.timers.delete(key);
    if (this.processing.has(key)) return; // the running loop will drain whatever is left
    const onFlush = this.handlers.get(key);
    if (!onFlush) return;
    this.processing.add(key);
    try {
      while (true) {
        const items = this.buffers.get(key) ?? [];
        if (items.length === 0) break;
        this.buffers.set(key, []);
        await onFlush(items);
      }
    } finally {
      this.processing.delete(key);
    }
  }
}
