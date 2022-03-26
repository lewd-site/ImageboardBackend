import amqp from 'amqplib';
import IQueue from '../models/queue';
import config from '../config';

export class RabbitQueue implements IQueue {
  private static readonly EXCHANGE_NAME = 'events';

  private connection?: amqp.Connection;
  private channel?: amqp.Channel;

  public constructor() {}

  public async connect() {
    this.connection = await amqp.connect(config.rabbit.host);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(RabbitQueue.EXCHANGE_NAME, 'fanout', { durable: true });
  }

  public async disconnect() {
    await this.connection?.close();
  }

  public publish(event: string, payload: any) {
    const buffer = Buffer.from(JSON.stringify({ event, payload }));
    this.channel?.publish(RabbitQueue.EXCHANGE_NAME, '', buffer, { persistent: true });
  }
}

export default RabbitQueue;
