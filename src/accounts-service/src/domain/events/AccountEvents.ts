import { DomainEvent } from './CustomerEvents';

export interface AccountCreatedEvent extends DomainEvent {
    eventType: 'AccountCreated';
    payload: {
        accountId: string;
        customerId: string;
        accountNumber: string;
        currency: string;
        initialBalance: number;
    };
}

export interface BalanceUpdatedEvent extends DomainEvent {
    eventType: 'BalanceUpdated';
    payload: {
        accountId: string;
        accountNumber: string;
        previousBalance: number;
        newBalance: number;
        currency: string;
        reason: string;
    };
}

export const KAFKA_TOPICS = {
    CLIENT_CREATED:        'client.created',
    ACCOUNT_CREATED:       'account.created',
    BALANCE_UPDATED:       'balance.updated',
    TRANSACTION_COMPLETED: 'transaction.completed',
    TRANSACTION_REJECTED:  'transaction.rejected',
} as const;