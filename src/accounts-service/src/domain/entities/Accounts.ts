export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface AccountProps {
    id: string;
    customerId: string;
    number: string;
    balance: number;
    currency: string;
    status: AccountStatus;
    createdAt: Date;
    updatedAt: Date;
}

export class Account {
    private readonly _id: string;
    private readonly _customerId: string;
    private readonly _number: string;
    private _balance: number;
    private readonly _currency: string;
    private _status: AccountStatus;
    private readonly _createdAt: Date;
    private _updatedAt: Date;

    constructor(props: AccountProps) {
        this._id = props.id;
        this._customerId = props.customerId;
        this._number = props.number;
        this._balance = props.balance;
        this._currency = props.currency;
        this._status = props.status;
        this._createdAt = props.createdAt;
        this._updatedAt = props.updatedAt;

        this.validate();
    }

    get id(): string { return this._id; }
    get customerId(): string { return this._customerId; }
    get number(): string { return this._number; }
    get balance(): number { return this._balance; }
    get currency(): string { return this._currency; }
    get status(): AccountStatus { return this._status; }
    get createdAt(): Date { return this._createdAt; }
    get updatedAt(): Date { return this._updatedAt; }

    static create(props: Omit<AccountProps, 'createdAt' | 'updatedAt' | 'status'>): Account {
        const now = new Date();
        return new Account({
            ...props,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
        });
    }

    private validate(): void {
        if (this._balance < 0) {
            throw new Error('El saldo de la cuenta no puede ser negativo');
        }
        if (!this._customerId) {
            throw new Error('La cuenta debe pertenecer a un cliente');
        }
        if (!this._number || this._number.trim().length === 0) {
            throw new Error('El número de cuenta es requerido');
        }
    }

    credit(amount: number): void {
        if (amount <= 0) {
            throw new Error('El monto a depositar debe ser mayor a 0');
        }
        this._balance += amount;
        this._updatedAt = new Date();
    }

    debit(amount: number): void {
        if (amount <= 0) {
            throw new Error('El monto a retirar debe ser mayor a 0');
        }
        if (this._balance < amount) {
            throw new Error(`Saldo insuficiente. Disponible: ${this._balance}, requerido: ${amount}`);
        }
        if (this._status !== 'ACTIVE') {
            throw new Error('La cuenta no está activa para realizar operaciones');
        }
        this._balance -= amount;
        this._updatedAt = new Date();
    }

    isActive(): boolean {
        return this._status === 'ACTIVE';
    }

    hasSufficientFunds(amount: number): boolean {
        return this._balance >= amount;
    }

    toJSON(): AccountProps {
        return {
            id: this._id,
            customerId: this._customerId,
            number: this._number,
            balance: this._balance,
            currency: this._currency,
            status: this._status,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
