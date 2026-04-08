export interface CustomerProps {
    id: string;
    name: string;
    email: string;
    document: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class Customer {
    private readonly _id: string;
    private _name: string;
    private _email: string;
    private _document: string;
    private _phone?: string;
    private readonly _createdAt: Date;
    private _updatedAt: Date;

    constructor(props: CustomerProps) {
        this._id = props.id;
        this._name = props.name;
        this._email = props.email;
        this._document = props.document;
        this._phone = props.phone;
        this._createdAt = props.createdAt;
        this._updatedAt = props.updatedAt;

        this.validate();
    }

    get id(): string { return this._id; }
    get name(): string { return this._name; }
    get email(): string { return this._email; }
    get document(): string { return this._document; }
    get phone(): string | undefined { return this._phone; }
    get createdAt(): Date { return this._createdAt; }
    get updatedAt(): Date { return this._updatedAt; }

    static create(props: Omit<CustomerProps, 'createdAt' | 'updatedAt'>): Customer {
        const now = new Date();
        return new Customer({
            ...props,
            createdAt: now,
            updatedAt: now,
        });
    }

    private validate(): void {
        if (!this._name || this._name.trim().length < 2) {
            throw new Error('El nombre del cliente debe tener al menos 2 caracteres');
        }
        if (!this._email || !this.isValidEmail(this._email)) {
            throw new Error('El email del cliente no es válido');
        }
        if (!this._document || this._document.trim().length < 8) {
            throw new Error('El documento del cliente debe tener al menos 8 caracteres');
        }
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    toJSON(): CustomerProps {
        return {
            id: this._id,
            name: this._name,
            email: this._email,
            document: this._document,
            phone: this._phone,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
}
