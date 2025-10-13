/** Fake BullMQ-like queue for stubbing add/process */
export type JobHandler<T> = (data: T) => Promise<any>;

export class FakeQueue<T = any> {
  private handler?: JobHandler<T>;

  constructor(public name: string) {}

  async add(_jobName: string, data: T): Promise<void> {
    if (!this.handler) return; // no-op if not registered
    await this.handler(data);
  }

  process(handler: JobHandler<T>) {
    this.handler = handler;
  }
}
