import { IEventBus } from './KafkaEventBus';
import { ExplainTransactionUseCase } from '../../application/use-cases/ExplainTransactionUseCase';

export class TransactionEventConsumer {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly explainUseCase: ExplainTransactionUseCase,
  ) {}

  async start(): Promise<void> {
    await this.eventBus.subscribe(
      'transaction.completed',
      async (event: unknown) => {
        console.log('[AI Consumer] Procesando TransactionCompleted...');
        try {
          const explanation = await this.explainUseCase.processEvent(
            event as Record<string, unknown>,
          );
          console.log(`[AI] Explicación generada: "${explanation.summary}"`);
        } catch (err) {
          console.error('[AI] Error generando explicación (completed):', err);
        }
      },
    );

    await this.eventBus.subscribe(
      'transaction.rejected',
      async (event: unknown) => {
        console.log('[AI Consumer] Procesando TransactionRejected...');
        try {
          const explanation = await this.explainUseCase.processEvent(
            event as Record<string, unknown>,
          );
          console.log(`[AI] Explicación generada: "${explanation.userFriendlyMessage}"`);
        } catch (err) {
          console.error('[AI] Error generando explicación (rejected):', err);
        }
      },
    );

    console.log('[AI Service] Escuchando eventos de transacciones en Kafka');
  }
}
