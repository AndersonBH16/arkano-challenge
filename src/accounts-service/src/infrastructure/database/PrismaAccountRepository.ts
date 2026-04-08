import { PrismaClient } from '@prisma/client';
import { Account, AccountStatus} from "../../domain/entities/Accounts";
import { IAccountRepository} from "../../domain/repositories/IAccountRepository";

export class PrismaAccountRepository implements IAccountRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findById(id: string): Promise<Account | null> {
        const row = await this.prisma.account.findUnique({ where: { id } });
        return row ? this.toDomain(row) : null;
    }

    async findByNumber(number: string): Promise<Account | null> {
        const row = await this.prisma.account.findUnique({ where: { number } });
        return row ? this.toDomain(row) : null;
    }

    async findByCustomerId(customerId: string): Promise<Account[]> {
        const rows = await this.prisma.account.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((row) => this.toDomain(row));
    }

    async save(account: Account): Promise<Account> {
        const data = account.toJSON();
        const row = await this.prisma.account.create({
            data: {
                id: data.id,
                customerId: data.customerId,
                number: data.number,
                balance: data.balance,
                currency: data.currency,
                status: data.status,
            },
        });
        return this.toDomain(row);
    }

    async update(account: Account): Promise<Account> {
        const data = account.toJSON();
        const row = await this.prisma.account.update({
            where: { id: data.id },
            data: {
                balance: data.balance,
                status: data.status,
            },
        });
        return this.toDomain(row);
    }

    private toDomain(row: {
        id: string;
        customerId: string;
        number: string;
        balance: { toNumber: () => number } | number;
        currency: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }): Account {
        const balance = typeof row.balance === 'object'
            ? (row.balance as { toNumber: () => number }).toNumber()
            : Number(row.balance);

        return new Account({
            id: row.id,
            customerId: row.customerId,
            number: row.number,
            balance,
            currency: row.currency,
            status: row.status as AccountStatus,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
    }
}
