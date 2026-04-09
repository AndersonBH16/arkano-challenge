// ─── ENTIDAD TRANSACTION ──────────────────────────────────────
// Contiene todas las reglas de negocio de las transacciones:
// - Máquina de estados (PENDING → COMPLETED | REJECTED)
// - Validaciones de negocio
// - Prevención de duplicados con idempotency key

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface TransactionProps {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  sourceAccountId?: string;
  targetAccountId?: string;
  amount: number;
  currency: string;
  description?: string;
  rejectionReason?: string;
  idempotencyKey: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Transaction {
  private readonly _id: string;
  private readonly _type: TransactionType;
  private _status: TransactionStatus;
  private readonly _sourceAccountId?: string;
  private readonly _targetAccountId?: string;
  private readonly _amount: number;
  private readonly _currency: string;
  private readonly _description?: string;
  private _rejectionReason?: string;
  private readonly _idempotencyKey: string;
  private _processedAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: TransactionProps) {
    this._id = props.id;
    this._type = props.type;
    this._status = props.status;
    this._sourceAccountId = props.sourceAccountId;
    this._targetAccountId = props.targetAccountId;
    this._amount = props.amount;
    this._currency = props.currency;
    this._description = props.description;
    this._rejectionReason = props.rejectionReason;
    this._idempotencyKey = props.idempotencyKey;
    this._processedAt = props.processedAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;

    this.validate();
  }

  private validate(): void {
    if (this._amount <= 0) {
      throw new Error('El monto de la transacción debe ser mayor a 0');
    }

    // Validar cuentas según tipo de transacción
    if (this._type === 'DEPOSIT' && !this._targetAccountId) {
      throw new Error('Un depósito requiere una cuenta destino');
    }
    if (this._type === 'WITHDRAWAL' && !this._sourceAccountId) {
      throw new Error('Un retiro requiere una cuenta origen');
    }
    if (this._type === 'TRANSFER') {
      if (!this._sourceAccountId || !this._targetAccountId) {
        throw new Error('Una transferencia requiere cuenta origen y destino');
      }
      if (this._sourceAccountId === this._targetAccountId) {
        throw new Error('La cuenta origen y destino no pueden ser la misma');
      }
    }
  }

  // ─── Máquina de estados ───────────────────────────────────────
  complete(): void {
    if (this._status !== 'PENDING') {
      throw new Error(`No se puede completar una transacción en estado: ${this._status}`);
    }
    this._status = 'COMPLETED';
    this._processedAt = new Date();
    this._updatedAt = new Date();
  }

  reject(reason: string): void {
    if (this._status !== 'PENDING') {
      throw new Error(`No se puede rechazar una transacción en estado: ${this._status}`);
    }
    this._status = 'REJECTED';
    this._rejectionReason = reason;
    this._processedAt = new Date();
    this._updatedAt = new Date();
  }

  isPending(): boolean { return this._status === 'PENDING'; }
  isCompleted(): boolean { return this._status === 'COMPLETED'; }
  isRejected(): boolean { return this._status === 'REJECTED'; }

  // ─── Getters ─────────────────────────────────────────────────
  get id(): string { return this._id; }
  get type(): TransactionType { return this._type; }
  get status(): TransactionStatus { return this._status; }
  get sourceAccountId(): string | undefined { return this._sourceAccountId; }
  get targetAccountId(): string | undefined { return this._targetAccountId; }
  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }
  get description(): string | undefined { return this._description; }
  get rejectionReason(): string | undefined { return this._rejectionReason; }
  get idempotencyKey(): string { return this._idempotencyKey; }
  get processedAt(): Date | undefined { return this._processedAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // ─── Factory ──────────────────────────────────────────────────
  static create(
    props: Omit<TransactionProps, 'status' | 'createdAt' | 'updatedAt'>,
  ): Transaction {
    const now = new Date();
    return new Transaction({
      ...props,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
  }

  toJSON(): TransactionProps {
    return {
      id: this._id,
      type: this._type,
      status: this._status,
      sourceAccountId: this._sourceAccountId,
      targetAccountId: this._targetAccountId,
      amount: this._amount,
      currency: this._currency,
      description: this._description,
      rejectionReason: this._rejectionReason,
      idempotencyKey: this._idempotencyKey,
      processedAt: this._processedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
