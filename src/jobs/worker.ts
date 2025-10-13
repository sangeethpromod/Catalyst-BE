import { screenerQueue } from "./screenerJob.js";

// In real BullMQ, a separate worker process would start here.
export function startWorkers() {
  // No-op for FakeQueue, processor is already registered.
  void screenerQueue;
}
