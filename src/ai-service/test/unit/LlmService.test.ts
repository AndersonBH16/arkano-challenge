import { MockLlmService } from '../../src/infrastructure/llm/LlmService';

describe('MockLlmService', () => {
  const service = new MockLlmService();

  it('genera explicación para transacción completada', async () => {
    const event = {
      eventType: 'TransactionCompleted',
      payload: { transactionId: 'tx-1', type: 'DEPOSIT', amount: 500, currency: 'PEN', status: 'COMPLETED' },
    };
    const result = await service.explainTransaction(event);
    expect(result.explanation).toBeTruthy();
    expect(result.summary).toContain('500');
    expect(result.userFriendlyMessage).toBeTruthy();
  });

  it('genera explicación para transacción rechazada', async () => {
    const event = {
      eventType: 'TransactionRejected',
      payload: { transactionId: 'tx-2', type: 'WITHDRAWAL', amount: 1000, currency: 'PEN', status: 'REJECTED', rejectionReason: 'Saldo insuficiente' },
    };
    const result = await service.explainTransaction(event);
    expect(result.userFriendlyMessage).toContain('saldo insuficiente');
  });

  it('resume historial vacío', async () => {
    const summary = await service.summarizeHistory([]);
    expect(summary).toContain('No hay');
  });

  it('resume historial con transacciones', async () => {
    const txs = [
      { type: 'DEPOSIT', amount: 100, status: 'COMPLETED' },
      { type: 'WITHDRAWAL', amount: 50, status: 'REJECTED' },
    ];
    const summary = await service.summarizeHistory(txs);
    expect(summary).toContain('2');
  });
});
