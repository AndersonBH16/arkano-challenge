import Anthropic from '@anthropic-ai/sdk';

export interface LlmExplanationResult {
    explanation: string;
    summary: string;
    userFriendlyMessage: string;
}

export interface ILlmService {
    explainTransaction(eventData: Record<string, unknown>): Promise<LlmExplanationResult>;
    summarizeHistory(transactions: Record<string, unknown>[]): Promise<string>;
}

export class AnthropicLlmService implements ILlmService {
    private client: Anthropic;

    constructor() {
        this.client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    async explainTransaction(eventData: Record<string, unknown>): Promise<LlmExplanationResult> {
        const payload = eventData['payload'] as Record<string, unknown>;
        const eventType = eventData['eventType'] as string;
        const isRejected = eventType === 'TransactionRejected';

        const prompt = `Eres un asistente bancario. Analiza este evento de transacción y responde en JSON con exactamente estos campos:
                        {
                          "explanation": "explicación técnica detallada de lo que ocurrió",
                          "summary": "resumen en 1 línea",
                          "userFriendlyMessage": "mensaje amigable para el usuario final en español"
                        }
                        
                        Evento: ${JSON.stringify({ type: payload['type'], amount: payload['amount'], currency: payload['currency'], status: payload['status'], rejectionReason: isRejected ? payload['rejectionReason'] : undefined }, null, 2)}
                        
                        Responde SOLO con el JSON, sin markdown ni texto adicional.`;

        try {
            const message = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 512,
                messages: [{ role: 'user', content: prompt }],
            });

            const text = (message.content[0] as { type: string; text: string }).text;
            return JSON.parse(text) as LlmExplanationResult;
        } catch (err) {
            console.error('[LLM] Error con Anthropic, usando fallback:', err);
            return this.mockExplanation(eventData);
        }
    }

    async summarizeHistory(transactions: Record<string, unknown>[]): Promise<string> {
        if (transactions.length === 0) return 'No hay transacciones en el historial.';

        const prompt = `Resume en español el historial bancario de forma clara y amigable:
                        ${JSON.stringify(transactions.map(t => ({ type: t['type'], amount: t['amount'], status: t['status'] })))}
                        Máximo 3 líneas.`;

        try {
            const message = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 256,
                messages: [{ role: 'user', content: prompt }],
            });
            return (message.content[0] as { type: string; text: string }).text;
        } catch {
            return `Historial de ${transactions.length} transacciones procesadas.`;
        }
    }

    private mockExplanation(eventData: Record<string, unknown>): LlmExplanationResult {
        return MockLlmService.buildMockExplanation(eventData);
    }
}

export class MockLlmService implements ILlmService {
    async explainTransaction(eventData: Record<string, unknown>): Promise<LlmExplanationResult> {
        return MockLlmService.buildMockExplanation(eventData);
    }

    async summarizeHistory(transactions: Record<string, unknown>[]): Promise<string> {
        const completed = transactions.filter(t => t['status'] === 'COMPLETED').length;
        const rejected = transactions.filter(t => t['status'] === 'REJECTED').length;
        return `El historial muestra ${transactions.length} transacciones: ${completed} completadas y ${rejected} rechazadas.`;
    }

    static buildMockExplanation(eventData: Record<string, unknown>): LlmExplanationResult {
        const payload = eventData['payload'] as Record<string, unknown> ?? {};
        const eventType = eventData['eventType'] as string;
        const type = payload['type'] as string;
        const amount = payload['amount'] as number;
        const currency = payload['currency'] as string ?? 'PEN';
        const isRejected = eventType === 'TransactionRejected';

        const typeMap: Record<string, string> = {
          DEPOSIT: 'depósito', WITHDRAWAL: 'retiro', TRANSFER: 'transferencia',
        };
        const typeStr = typeMap[type] ?? type;

        if (isRejected) {
            const reason = payload['rejectionReason'] as string ?? 'fondos insuficientes';
            return {
                explanation: `La transacción de tipo ${typeStr} por ${amount} ${currency} fue rechazada. Motivo técnico: ${reason}.`,
                summary: `${typeStr} de ${amount} ${currency} rechazado`,
                userFriendlyMessage: `Tu ${typeStr} de ${amount} ${currency} no pudo procesarse porque ${reason.toLowerCase()}. Por favor verifica tu saldo e intenta nuevamente.`,
            };
        }

        return {
          explanation: `La transacción de tipo ${typeStr} por ${amount} ${currency} fue procesada exitosamente y los saldos han sido actualizados.`,
          summary: `${typeStr} de ${amount} ${currency} completado`,
          userFriendlyMessage: `Tu ${typeStr} de ${amount} ${currency} fue realizado con éxito. Los fondos ya están disponibles.`,
        };
    }
}

export function createLlmService(): ILlmService {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'mock') {
        console.log('[LLM] Usando modo MOCK (sin API key)');
        return new MockLlmService();
    }

    return new AnthropicLlmService();
}
