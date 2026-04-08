// ─── IMPLEMENTACIÓN KAFKA DEL BUS DE EVENTOS ─────────────────
// Aquí está la implementación concreta de IEventBus usando KafkaJS.
// El dominio/aplicación nunca sabe que existe Kafka.

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
            // Garantiza que los mensajes no se dupliquen en reintentos
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

    // Publica un evento en un tópico de Kafka
    async publish(topic: string, event: unknown): Promise<void> {
        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        // La key permite garantizar orden por entidad
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

    // Suscribe un handler a un tópico
    async subscribe(
        topic: string,
        handler: (event: unknown) => Promise<void>,
    ): Promise<void> {
        const consumer = this.kafka.consumer({
            groupId: `accounts-service-${topic}`,
            // Reintentar mensajes fallidos automáticamente
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
                    console.log(`[Kafka] Evento recibido ← ${topic}:`, event.eventType);

                    await handler(event);
                } catch (error) {
                    // Log del error pero no relanzamos para no bloquear el consumer
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
            // Usa el eventId como key para idempotencia
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
