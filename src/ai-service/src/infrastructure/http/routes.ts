import { Router, Request, Response } from 'express';
import { ExplainTransactionUseCase } from '../../application/use-cases/ExplainTransactionUseCase';

export function createAiRouter(explainUseCase: ExplainTransactionUseCase): Router {
  const router = Router();

  router.get('/ai/explanations', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query['limit'] as string ?? '20', 10);
      const explanations = await explainUseCase.listExplanations(limit);
      res.json({ success: true, data: explanations.map(e => e.toJSON()) });
    } catch {
      res.status(500).json({ success: false, error: 'Error interno' });
    }
  });

  router.get('/ai/explanations/:transactionId', async (req: Request, res: Response) => {
    try {
      const explanation = await explainUseCase.getExplanation(req.params.transactionId);
      if (!explanation) {
        return res.status(404).json({
          success: false,
          error: 'No hay explicación para esta transacción. Puede que aún esté procesándose.',
        });
      }
      res.json({ success: true, data: explanation.toJSON() });
    } catch {
      res.status(500).json({ success: false, error: 'Error interno' });
    }
  });

  router.post('/ai/summarize', async (req: Request, res: Response) => {
    try {
      const { transactions } = req.body as { transactions: Record<string, unknown>[] };
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ success: false, error: 'Se esperaba un array de transacciones' });
      }
      const summary = await explainUseCase.summarizeHistory(transactions);
      res.json({ success: true, data: { summary } });
    } catch {
      res.status(500).json({ success: false, error: 'Error interno' });
    }
  });

  router.post('/ai/explain', async (req: Request, res: Response) => {
    try {
      const event = req.body as Record<string, unknown>;
      const explanation = await explainUseCase.processEvent(event);
      res.json({ success: true, data: explanation.toJSON() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      res.status(400).json({ success: false, error: message });
    }
  });

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ai-service', timestamp: new Date().toISOString() });
  });

  return router;
}
