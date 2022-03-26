import IQueue from '../models/queue';

export class LogQueue implements IQueue {
  public async connect() {}
  public async disconnect() {}

  public publish(event: string, payload: any) {
    console.dir({ event, payload });
  }
}

export default LogQueue;
