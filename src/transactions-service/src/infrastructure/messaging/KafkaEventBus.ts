import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { IEventBus} from "../../application/ports/IEventBus";

export class KafkaEventBus implements IEventBus {
    private kafka: Kafka;
    private producer: Producer;
    private consumers: Consumer[] = [];

    constructor(brokers: string[], clientId: string) {
        this.kafka = new Kafka({ clientId, brokers, logLevel: logLevel.WARN,
            retry: { initialRetryTime: 300, retries: 8 } });
        this.producer = this.kafka.producer({ idempotent: true });
    }

    async connect(): Promise<void> {
        await this.producer.connect();
        console.log('[Kafka] Producer conectado');
    }

    async disconnect(): Promise<void> {
        await this.producer.disconnect();
        for (const c of this.consumers) await c.disconnect();
    }

    async publish(topic: string, event: unknown): Promise<void> {
        try {
            const e = event as Record<string, unknown>;
            await this.producer.send({
                topic,
                messages: [{ key: String(e['eventId'] ?? ''), value: JSON.stringify(event) }],
            });
            console.log(`[Kafka] - ${topic}: ${e['eventType']}`);
        } catch (err) {
            console.error(`[Kafka] Error publicando en ${topic}:`, err);
            throw err;
        }
    }

    async subscribe(topic: string, handler: (event: unknown) => Promise<void>): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: `transactions-service-${topic}`,
            retry: { retries: 3 },
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
                    console.error(`[Kafka] Error procesando ${topic}:`, err);
                }
            },
        });
        this.consumers.push(consumer);
        console.log(`[Kafka] Consumer suscrito: ${topic}`);
    }
}
