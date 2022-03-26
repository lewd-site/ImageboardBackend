import IQueue from '../models/queue';

export class DummyQueue implements IQueue {
  public async connect() {}
  public async disconnect() {}
  public publish(event: string, payload: any) {}
}

export default DummyQueue;
