// ─── CASO DE USO: CREAR CUENTA BANCARIA ──────────────────────

import { v4 as uuidv4 } from 'uuid';
import { Account} from "../../domain/entities/Accounts";
import { ICustomerRepository} from "../../domain/repositories/ICustomerRepository";
import {IAccountRepository} from "../../domain/repositories/IAccountRepository";
import { IEventBus } from '../ports/IEventBus';
import { AccountCreatedEvent} from "../../domain/events/AccountEvents";

export interface CreateAccountDTO {
    customerId: string;
    currency?: string;
    initialBalance?: number;
}

export interface CreateAccountResult {
    id: string;
    customerId: string;
    number: string;
    balance: number;
    currency: string;
    status: string;
    createdAt: Date;
}

export class CreateAccountUseCase {
    constructor(
        private readonly customerRepository: ICustomerRepository,
        private readonly accountRepository: IAccountRepository,
        private readonly eventBus: IEventBus,
    ) {}

    async execute(dto: CreateAccountDTO): Promise<CreateAccountResult> {
        // 1. Verificar que el cliente existe
        const customer = await this.customerRepository.findById(dto.customerId);
        if (!customer) {
            throw new Error(`Cliente no encontrado: ${dto.customerId}`);
        }

        // 2. Generar número de cuenta único
        const accountNumber = this.generateAccountNumber();

        // 3. Crear la entidad Account (validaciones en el dominio)
        const account = Account.create({
            id: uuidv4(),
            customerId: dto.customerId,
            number: accountNumber,
            balance: dto.initialBalance ?? 0,
            currency: dto.currency ?? 'PEN',
        });

        // 4. Persistir
        const saved = await this.accountRepository.save(account);

        // 5. Publicar evento
        const event: AccountCreatedEvent = {
            eventId: uuidv4(),
            eventType: 'AccountCreated',
            occurredAt: new Date().toISOString(),
            version: 1,
            payload: {
                accountId: saved.id,
                customerId: saved.customerId,
                accountNumber: saved.number,
                currency: saved.currency,
                initialBalance: saved.balance,
            },
        };

        await this.eventBus.publish('account.created', event);

        return {
            id: saved.id,
            customerId: saved.customerId,
            number: saved.number,
            balance: saved.balance,
            currency: saved.currency,
            status: saved.status,
            createdAt: saved.createdAt,
        };
    }

    // Genera un número de cuenta bancaria de 14 dígitos
    private generateAccountNumber(): string {
        const prefix = '0021'; // Código del banco
        const random = Math.floor(Math.random() * 10_000_000_000).toString().padStart(10, '0');
        return `${prefix}${random}`;
    }
}
