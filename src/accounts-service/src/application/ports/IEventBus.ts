// ─── PUERTO: INTERFAZ DEL BUS DE EVENTOS ─────────────────────
// El dominio/aplicación define esta interfaz (puerto).
// Kafka es el adaptador concreto que la implementa.
// Siguiendo la arquitectura hexagonal (ports & adapters).

export interface IEventBus {
    publish(topic: string, event: unknown): Promise<void>;
    subscribe(topic: string, handler: (event: unknown) => Promise<void>): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
