export interface IEventBus {
    publish(topic: string, event: unknown): Promise<void>;
    subscribe(topic: string, handler: (event: unknown) => Promise<void>): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

export interface AccountInfo {
    id: string;
    number: string;
    balance: number;
    currency: string;
    status: string;
}

export interface IAccountsServiceClient {
    getAccount(accountId: string): Promise<AccountInfo | null>;
    getAccountBalance(accountId: string): Promise<number>;
}
