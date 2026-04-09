import { v4 as uuidv4 } from 'uuid';
import { AiExplanation, AiExplanationProps, IAiExplanationRepository } from '../../domain/entities/AiExplanation';
import { ILlmService } from '../../infrastructure/llm/LlmService';

type ValidEventType = AiExplanationProps['eventType'];

const VALID_EVENT_TYPES: ValidEventType[] = [
    'TransactionCompleted',
    'TransactionRejected',
];

function parseEventType(value: unknown): ValidEventType {
    const str = String(value ?? '');
    if (VALID_EVENT_TYPES.includes(str as ValidEventType)) {
        return str as ValidEventType;
    }
    throw new Error(`Tipo de evento no soportado: ${str}`);
}

export class ExplainTransactionUseCase {
    constructor(
        private readonly repo: IAiExplanationRepository,
        private readonly llm: ILlmService,
    ) {}

    async processEvent(event: Record<string, unknown>): Promise<AiExplanation> {
        const payload = event['payload'] as Record<string, unknown>;
        const transactionId = String(payload?.['transactionId'] ?? '');
        const eventType = parseEventType(event['eventType']);

        const existing = await this.repo.findByTransactionId(transactionId);
        if (existing) {
            console.log(`[AI] Explicación ya existe para transacción: ${transactionId}`);
            return existing;
        }

        const result = await this.llm.explainTransaction(event);

        const explanation = new AiExplanation({
            id: uuidv4(),
            transactionId,
            eventType,
            explanation: result.explanation,
            summary: result.summary,
            userFriendlyMessage: result.userFriendlyMessage,
            rawEvent: event,
            createdAt: new Date(),
        });

        return this.repo.save(explanation);
    }

    async getExplanation(transactionId: string): Promise<AiExplanation | null> {
        return this.repo.findByTransactionId(transactionId);
    }

    async listExplanations(limit?: number): Promise<AiExplanation[]> {
        return this.repo.findAll(limit);
    }

    async summarizeHistory(transactions: Record<string, unknown>[]): Promise<string> {
        return this.llm.summarizeHistory(transactions);
    }
}