import { IEventBus } from '../../application/ports/IEventBus';
import { UpdateBalanceUseCase} from "../../application/use-cases/UpdateBalanceUseCase";

interface TransactionCompletedPayload {
    transactionId: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
    sourceAccountId?: string;
    targetAccountId?: string;
    amount: number;
    status: 'COMPLETED';
}

interface TransactionCompletedEvent {
    eventType: 'TransactionCompleted';
    payload: TransactionCompletedPayload;
}

export class TransactionEventConsumer {
    constructor(
        private readonly eventBus: IEventBus,
        private readonly updateBalanceUseCase: UpdateBalanceUseCase,
    ) {}

    async start(): Promise<void> {
        await this.eventBus.subscribe(
            'transaction.completed',
            this.handleTransactionCompleted.bind(this),
        );
        console.log('[Consumer] Escuchando eventos transaction.completed');
    }

    private async handleTransactionCompleted(event: unknown): Promise<void> {
        const { payload } = event as TransactionCompletedEvent;

        try {
            if (payload.type === 'DEPOSIT' && payload.targetAccountId) {
                await this.updateBalanceUseCase.execute({
                    accountId: payload.targetAccountId,
                    amount: payload.amount,
                    operation: 'CREDIT',
                    reason: 'DEPOSIT',
                });
            } else if (payload.type === 'WITHDRAWAL' && payload.sourceAccountId) {
                await this.updateBalanceUseCase.execute({
                    accountId: payload.sourceAccountId,
                    amount: payload.amount,
                    operation: 'DEBIT',
                    reason: 'WITHDRAWAL',
                });
            } else if (payload.type === 'TRANSFER') {
                if (payload.sourceAccountId) {
                    await this.updateBalanceUseCase.execute({
                        accountId: payload.sourceAccountId,
                        amount: payload.amount,
                        operation: 'DEBIT',
                        reason: 'TRANSFER_OUT',
                    });
                }
                if (payload.targetAccountId) {
                    await this.updateBalanceUseCase.execute({
                        accountId: payload.targetAccountId,
                        amount: payload.amount,
                        operation: 'CREDIT',
                        reason: 'TRANSFER_IN',
                    });
                }
            }

            console.log(`[Consumer] Saldo actualizado para transacción: ${payload.transactionId}`);
        } catch (error) {
            console.error('[Consumer] Error actualizando saldo:', error);
        }
    }
}
