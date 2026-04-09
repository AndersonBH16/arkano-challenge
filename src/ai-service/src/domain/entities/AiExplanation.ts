export interface AiExplanationProps {
    id: string;
    transactionId: string;
    eventType: 'TransactionCompleted' | 'TransactionRejected';
    explanation: string;
    summary: string;
    userFriendlyMessage: string;
    rawEvent: Record<string, unknown>;
    createdAt: Date;
}

export class AiExplanation {
    constructor(private readonly props: AiExplanationProps) {}

    get id(): string { return this.props.id; }
    get transactionId(): string { return this.props.transactionId; }
    get explanation(): string { return this.props.explanation; }
    get summary(): string { return this.props.summary; }
    get userFriendlyMessage(): string { return this.props.userFriendlyMessage; }
    get eventType(): string { return this.props.eventType; }
    get createdAt(): Date { return this.props.createdAt; }

    toJSON(): AiExplanationProps { return { ...this.props }; }
}

export interface IAiExplanationRepository {
    save(explanation: AiExplanation): Promise<AiExplanation>;
    findByTransactionId(transactionId: string): Promise<AiExplanation | null>;
    findAll(limit?: number): Promise<AiExplanation[]>;
}
