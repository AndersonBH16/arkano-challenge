import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

export interface IEventBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, event: unknown): Promise<void>;
  subscribe(topic: string, handler: (event: unknown) => Promise<void>): Promise<void>;
}

export class KafkaEventBus implements IEventBus {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Consumer[] = [];

  constructor(brokers: string[], clientId: string) {
    this.kafka = new Kafka({ clientId, brokers, logLevel: logLevel.WARN,
      retry: { initialRetryTime: 300, retries: 8 } });
    this.producer = this.kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    console.log('[Kafka] AI service producer conectado');
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    for (const c of this.consumers) await c.disconnect();
  }

  async publish(topic: string, event: unknown): Promise<void> {
    await this.producer.send({ topic, messages: [{ value: JSON.stringify(event) }] });
  }

  async subscribe(topic: string, handler: (event: unknown) => Promise<void>): Promise<void> {
    const consumer = this.kafka.consumer({
      groupId: `ai-service-${topic}`,
      retry: { retries: 5 },
    });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const value = message.value?.toString();
          if (!value) return;
          await handler(JSON.parse(value));
        } catch (err) {
          console.error(`[Kafka/AI] Error procesando ${topic}:`, err);
        }
      },
    });
    this.consumers.push(consumer);
    console.log(`[Kafka] AI service suscrito a: ${topic}`);
  }
}
