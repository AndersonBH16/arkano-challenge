export interface DomainEvent {
    eventId: string;
    eventType: string;
    occurredAt: string;
    version: number;
}

export interface ClientCreatedEvent extends DomainEvent {
    eventType: 'ClientCreated';
    payload: {
        customerId: string;
        name: string;
        email: string;
        document: string;
    };
}