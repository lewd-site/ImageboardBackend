export interface IQueue {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(event: string, payload: any): void;
}

export default IQueue;
