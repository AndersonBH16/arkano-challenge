// ─── IMPLEMENTACIÓN DEL REPOSITORIO CON PRISMA ───────────────
// Esta es la capa de infraestructura: implementa las interfaces
// del dominio usando tecnologías concretas (Prisma + PostgreSQL).

import { PrismaClient } from '@prisma/client';
import { Customer} from "../../domain/entities/Customers";
import { ICustomerRepository} from "../../domain/repositories/ICustomerRepository";

export class PrismaCustomerRepository implements ICustomerRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findById(id: string): Promise<Customer | null> {
        const row = await this.prisma.customer.findUnique({ where: { id } });
        return row ? this.toDomain(row) : null;
    }

    async findByEmail(email: string): Promise<Customer | null> {
        const row = await this.prisma.customer.findUnique({ where: { email } });
        return row ? this.toDomain(row) : null;
    }

    async findByDocument(document: string): Promise<Customer | null> {
        const row = await this.prisma.customer.findUnique({ where: { document } });
        return row ? this.toDomain(row) : null;
    }

    async save(customer: Customer): Promise<Customer> {
        const data = customer.toJSON();
        const row = await this.prisma.customer.create({
            data: {
                id: data.id,
                name: data.name,
                email: data.email,
                document: data.document,
                phone: data.phone,
            },
        });
        return this.toDomain(row);
    }

    async findAll(): Promise<Customer[]> {
        const rows = await this.prisma.customer.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return rows.map(this.toDomain);
    }

    // Convierte un registro de BD en una entidad del dominio
    private toDomain(row: {
        id: string;
        name: string;
        email: string;
        document: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
    }): Customer {
        return new Customer({
            id: row.id,
            name: row.name,
            email: row.email,
            document: row.document,
            phone: row.phone ?? undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
    }
}
