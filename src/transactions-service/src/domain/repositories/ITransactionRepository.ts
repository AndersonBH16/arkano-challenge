import { Transaction } from '../entities/Transaction';

export interface ITransactionRepository {
    findById(id: string): Promise<Transaction | null>;
    findByIdempotencyKey(key: string): Promise<Transaction | null>;
    findByAccountId(accountId: string): Promise<Transaction[]>;
    save(transaction: Transaction): Promise<Transaction>;
    update(transaction: Transaction): Promise<Transaction>;
}
