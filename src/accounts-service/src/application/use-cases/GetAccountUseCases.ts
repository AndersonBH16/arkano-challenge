import { IAccountRepository } from '../../domain/repositories/IAccountRepository';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';

export interface GetAccountResult {
    id: string;
    customerId: string;
    customerName: string;
    number: string;
    balance: number;
    currency: string;
    status: string;
    createdAt: Date;
}

export class GetAccountUseCase {
    constructor(
        private readonly accountRepository: IAccountRepository,
        private readonly customerRepository: ICustomerRepository,
    ) {}

    async execute(accountId: string): Promise<GetAccountResult> {
        const account = await this.accountRepository.findById(accountId);
        if (!account) {
            throw new Error(`Cuenta no encontrada: ${accountId}`);
        }

        const customer = await this.customerRepository.findById(account.customerId);
        if (!customer) {
            throw new Error(`Cliente de la cuenta no encontrado`);
        }

        return {
            id: account.id,
            customerId: account.customerId,
            customerName: customer.name,
            number: account.number,
            balance: account.balance,
            currency: account.currency,
            status: account.status,
            createdAt: account.createdAt,
        };
    }
}