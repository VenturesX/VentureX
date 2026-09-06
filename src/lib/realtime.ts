import { EventEmitter } from "node:events";

type OpsEvent = {
  type: string;
  eventId?: string;
  entityType?: string;
  entityId?: string;
  at: string;
};

const globalForHub = globalThis as unknown as {
  vdHub?: EventEmitter;
};

const hub = globalForHub.vdHub ?? new EventEmitter();
hub.setMaxListeners(200);
if (!globalForHub.vdHub) globalForHub.vdHub = hub;

export function publishOps(event: Omit<OpsEvent, "at"> & { at?: string }) {
  const payload: OpsEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  };
  hub.emit("ops", payload);
  if (payload.eventId) hub.emit(`ops:${payload.eventId}`, payload);
}

export function subscribeOps(eventId: string | undefined, listener: (event: OpsEvent) => void) {
  const channel = eventId ? `ops:${eventId}` : "ops";
  hub.on(channel, listener);
  return () => hub.off(channel, listener);
}
