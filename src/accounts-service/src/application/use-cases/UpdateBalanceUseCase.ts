import { v4 as uuidv4 } from 'uuid';
import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { IEventBus } from '../ports/IEventBus';
import { BalanceUpdatedEvent } from '../../domain/events/AccountEvents';

export interface UpdateBalanceDTO {
    accountId: string;
    amount: number;
    operation: 'CREDIT' | 'DEBIT';
    reason: string;
}

export class UpdateBalanceUseCase {
    constructor(
        private readonly accountRepository: IAccountRepository,
        private readonly eventBus: IEventBus,
    ) {}

    async execute(dto: UpdateBalanceDTO): Promise<void> {
        const account = await this.accountRepository.findById(dto.accountId);
        if (!account) {
            throw new Error(`Cuenta no encontrada: ${dto.accountId}`);
        }

        const previousBalance = account.balance;

        if (dto.operation === 'CREDIT') {
            account.credit(dto.amount);
        } else {
            account.debit(dto.amount);
        }

        await this.accountRepository.update(account);

        const event: BalanceUpdatedEvent = {
            eventId: uuidv4(),
            eventType: 'BalanceUpdated',
            occurredAt: new Date().toISOString(),
            version: 1,
            payload: {
                accountId: account.id,
                accountNumber: account.number,
                previousBalance,
                newBalance: account.balance,
                currency: account.currency,
                reason: dto.reason,
            },
        };

        await this.eventBus.publish('balance.updated', event);
    }
}