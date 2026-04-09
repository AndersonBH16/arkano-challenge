export interface DomainEvent {
    eventId: string;
    eventType: string;
    occurredAt: string;
    version: number;
}

export interface TransactionRequestedEvent extends DomainEvent {
    eventType: 'TransactionRequested';
    payload: {
        transactionId: string;
        type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
        sourceAccountId?: string;
        targetAccountId?: string;
        amount: number;
        currency: string;
        idempotencyKey: string;
    };
}

export interface TransactionCompletedEvent extends DomainEvent {
    eventType: 'TransactionCompleted';
    payload: {
        transactionId: string;
        type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
        sourceAccountId?: string;
        targetAccountId?: string;
        amount: number;
        currency: string;
        processedAt: string;
        status: 'COMPLETED';
    };
}

export interface TransactionRejectedEvent extends DomainEvent {
    eventType: 'TransactionRejected';
    payload: {
        transactionId: string;
        type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
        sourceAccountId?: string;
        targetAccountId?: string;
        amount: number;
        currency: string;
        rejectionReason: string;
        processedAt: string;
        status: 'REJECTED';
    };
}

export const KAFKA_TOPICS = {
    TRANSACTION_REQUESTED: 'transaction.requested',
    TRANSACTION_COMPLETED: 'transaction.completed',
    TRANSACTION_REJECTED: 'transaction.rejected',
} as const;
