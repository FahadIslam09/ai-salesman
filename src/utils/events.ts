import { EventEmitter } from "node:events";

// ponytail: single-process pub/sub for dashboard SSE; replace with Redis if
// the backend ever runs more than one replica.
export const events = new EventEmitter();

export function emitPageEvent(pageId: string, type: string, data: unknown) {
  events.emit(`page:${pageId}`, { type, data, at: new Date().toISOString() });
}
