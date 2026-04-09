import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../domain/entities/Transaction';
import { ITransactionRepository } from '../../domain/repositories/ITransactionRepository';
import { IEventBus, IAccountsServiceClient} from "../ports/IEventBus";
import {
  TransactionRequestedEvent,
  TransactionCompletedEvent,
  TransactionRejectedEvent
} from "../../domain/events/TransactionEvents";

export interface ProcessTransactionDTO {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  sourceAccountId?: string;
  targetAccountId?: string;
  amount: number;
  currency?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface ProcessTransactionResult {
  transactionId: string;
  status: string;
  message: string;
}

export class ProcessTransactionUseCase {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly accountsClient: IAccountsServiceClient,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: ProcessTransactionDTO): Promise<ProcessTransactionResult> {
    const idempotencyKey = dto.idempotencyKey ?? uuidv4();
    const existing = await this.transactionRepo.findByIdempotencyKey(idempotencyKey);

    if (existing) {
      console.log(`[Idempotencia] Transacción ya existe: ${existing.id}`);
      return {
        transactionId: existing.id,
        status: existing.status,
        message: 'Transacción ya procesada (idempotente)',
      };
    }

    const transaction = Transaction.create({
      id: uuidv4(),
      type: dto.type,
      sourceAccountId: dto.sourceAccountId,
      targetAccountId: dto.targetAccountId,
      amount: dto.amount,
      currency: dto.currency ?? 'PEN',
      description: dto.description,
      idempotencyKey,
    });

    await this.transactionRepo.save(transaction);

    const requestedEvent: TransactionRequestedEvent = {
      eventId: uuidv4(),
      eventType: 'TransactionRequested',
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        transactionId: transaction.id,
        type: transaction.type,
        sourceAccountId: transaction.sourceAccountId,
        targetAccountId: transaction.targetAccountId,
        amount: transaction.amount,
        currency: transaction.currency,
        idempotencyKey,
      },
    };

    await this.eventBus.publish('transaction.requested', requestedEvent);
    setImmediate(() => this.processTransaction(transaction.id, dto));

    return {
      transactionId: transaction.id,
      status: 'PENDING',
      message: 'Transacción recibida y en proceso',
    };
  }

  private async processTransaction(
    transactionId: string,
    dto: ProcessTransactionDTO,
  ): Promise<void> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) return;

    try {
      await this.validateTransaction(dto);
      transaction.complete();
      await this.transactionRepo.update(transaction);

      const completedEvent: TransactionCompletedEvent = {
        eventId: uuidv4(),
        eventType: 'TransactionCompleted',
        occurredAt: new Date().toISOString(),
        version: 1,
        payload: {
          transactionId: transaction.id,
          type: transaction.type,
          sourceAccountId: transaction.sourceAccountId,
          targetAccountId: transaction.targetAccountId,
          amount: transaction.amount,
          currency: transaction.currency,
          processedAt: new Date().toISOString(),
          status: 'COMPLETED',
        },
      };

      await this.eventBus.publish('transaction.completed', completedEvent);
      console.log(`[Transaction] Completada: ${transactionId}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      transaction.reject(reason);
      await this.transactionRepo.update(transaction);

      const rejectedEvent: TransactionRejectedEvent = {
        eventId: uuidv4(),
        eventType: 'TransactionRejected',
        occurredAt: new Date().toISOString(),
        version: 1,
        payload: {
          transactionId: transaction.id,
          type: transaction.type,
          sourceAccountId: transaction.sourceAccountId,
          targetAccountId: transaction.targetAccountId,
          amount: transaction.amount,
          currency: transaction.currency,
          rejectionReason: reason,
          processedAt: new Date().toISOString(),
          status: 'REJECTED',
        },
      };

      await this.eventBus.publish('transaction.rejected', rejectedEvent);
      console.log(`[Transaction] Rechazada: ${transactionId} - ${reason}`);
    }
  }

  private async validateTransaction(dto: ProcessTransactionDTO): Promise<void> {
    if (dto.sourceAccountId) {
      const sourceAccount = await this.accountsClient.getAccount(dto.sourceAccountId);
      if (!sourceAccount) {
        throw new Error(`Cuenta origen no encontrada: ${dto.sourceAccountId}`);
      }
      if (sourceAccount.status !== 'ACTIVE') {
        throw new Error('La cuenta origen no está activa');
      }
      if (sourceAccount.balance < dto.amount) {
        throw new Error(
          `Saldo insuficiente en cuenta origen. Disponible: ${sourceAccount.balance} ${sourceAccount.currency}, requerido: ${dto.amount}`,
        );
      }
    }

    if (dto.targetAccountId) {
      const targetAccount = await this.accountsClient.getAccount(dto.targetAccountId);
      if (!targetAccount) {
        throw new Error(`Cuenta destino no encontrada: ${dto.targetAccountId}`);
      }
      if (targetAccount.status !== 'ACTIVE') {
        throw new Error('La cuenta destino no está activa');
      }
    }
  }
}
