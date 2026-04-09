import { PrismaClient } from '@prisma/client';
import { Transaction, TransactionType, TransactionStatus } from '../../domain/entities/Transaction';
import { ITransactionRepository} from "../../domain/repositories/ITransactionRepository";

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const row = await this.prisma.transaction.findUnique({ where: { idempotencyKey: key } });
    return row ? this.toDomain(row) : null;
  }

  async findByAccountId(accountId: string): Promise<Transaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        OR: [{ sourceAccountId: accountId }, { targetAccountId: accountId }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toDomain(r));
  }

  async save(transaction: Transaction): Promise<Transaction> {
    const data = transaction.toJSON();
    const row = await this.prisma.transaction.create({
      data: {
        id: data.id,
        type: data.type,
        status: data.status,
        sourceAccountId: data.sourceAccountId,
        targetAccountId: data.targetAccountId,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        idempotencyKey: data.idempotencyKey,
      },
    });
    return this.toDomain(row);
  }

  async update(transaction: Transaction): Promise<Transaction> {
    const data = transaction.toJSON();
    const row = await this.prisma.transaction.update({
      where: { id: data.id },
      data: {
        status: data.status,
        rejectionReason: data.rejectionReason,
        processedAt: data.processedAt,
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string; type: string; status: string;
    sourceAccountId: string | null; targetAccountId: string | null;
    amount: { toNumber: () => number } | number; currency: string;
    description: string | null; rejectionReason: string | null;
    idempotencyKey: string; processedAt: Date | null;
    createdAt: Date; updatedAt: Date;
  }): Transaction {
    const amount = typeof row.amount === 'object'
      ? (row.amount as { toNumber: () => number }).toNumber()
      : Number(row.amount);

    return new Transaction({
      id: row.id,
      type: row.type as TransactionType,
      status: row.status as TransactionStatus,
      sourceAccountId: row.sourceAccountId ?? undefined,
      targetAccountId: row.targetAccountId ?? undefined,
      amount,
      currency: row.currency,
      description: row.description ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      idempotencyKey: row.idempotencyKey,
      processedAt: row.processedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
