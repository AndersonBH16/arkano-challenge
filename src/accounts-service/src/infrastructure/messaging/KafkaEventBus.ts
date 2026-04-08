import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { IEventBus } from '../../application/ports/IEventBus';

export class KafkaEventBus implements IEventBus {
    private kafka: Kafka;
    private producer: Producer;
    private consumers: Consumer[] = [];

    constructor(brokers: string[], clientId: string) {
        this.kafka = new Kafka({
            clientId,
            brokers,
            logLevel: logLevel.WARN,
            retry: {
                initialRetryTime: 300,
                retries: 8,
            },
        });
        this.producer = this.kafka.producer({
            idempotent: true,
        });
    }

    async connect(): Promise<void> {
        await this.producer.connect();
        console.log('[Kafka] Producer conectado');
    }

    async disconnect(): Promise<void> {
        await this.producer.disconnect();
        for (const consumer of this.consumers) {
            await consumer.disconnect();
        }
        console.log('[Kafka] Desconectado');
    }

    async publish(topic: string, event: unknown): Promise<void> {
        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        key: this.extractKey(event),
                        value: JSON.stringify(event),
                        headers: {
                            'content-type': 'application/json',
                            'event-type': this.extractEventType(event),
                        },
                    },
                ],
            });
            console.log(`[Kafka] Evento publicado → ${topic}:`, this.extractEventType(event));
        } catch (error) {
            console.error(`[Kafka] Error publicando en ${topic}:`, error);
            throw error;
        }
    }

    async subscribe(
        topic: string,
        handler: (event: unknown) => Promise<void>,
    ): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: `accounts-service-${topic}`,
            retry: { retries: 3 },
        });

        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const value = message.value?.toString();
                    if (!value) return;

                    const event = JSON.parse(value);
                    console.log(`[Kafka] Evento recibido - ${topic}:`, event.eventType);

                    await handler(event);
                } catch (error) {
                    console.error(`[Kafka] Error procesando mensaje de ${topic}:`, error);
                }
            },
        });

        this.consumers.push(consumer);
        console.log(`[Kafka] Consumer suscrito a: ${topic}`);
    }

    private extractKey(event: unknown): string {
        if (typeof event === 'object' && event !== null) {
            const e = event as Record<string, unknown>;
            return String(e['eventId'] ?? '');
        }
        return '';
    }

    private extractEventType(event: unknown): string {
        if (typeof event === 'object' && event !== null) {
            const e = event as Record<string, unknown>;
            return String(e['eventType'] ?? 'unknown');
        }
        return 'unknown';
    }
}
