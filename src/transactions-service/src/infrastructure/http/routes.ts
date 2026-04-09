import { Router, Request, Response } from 'express';
import { ProcessTransactionUseCase } from '../../application/use-cases/ProcessTransactionUseCase';
import { GetTransactionUseCase } from '../../application/use-cases/GetTransactionUseCase';
import { ITransactionRepository} from "../../domain/repositories/ITransactionRepository";
import { IEventBus, IAccountsServiceClient} from "../../application/ports/IEventBus";

export function createTransactionsRouter(
  transactionRepo: ITransactionRepository,
  accountsClient: IAccountsServiceClient,
  eventBus: IEventBus,
): Router {
  const router = Router();

  const processTransaction = new ProcessTransactionUseCase(transactionRepo, accountsClient, eventBus);
  const getTransaction = new GetTransactionUseCase(transactionRepo);

  router.post('/transactions', async (req: Request, res: Response) => {
    try {
      const result = await processTransaction.execute(req.body);
      res.status(202).json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      res.status(400).json({ success: false, error: message });
    }
  });

  router.get('/transactions/:id', async (req: Request, res: Response) => {
    try {
      const result = await getTransaction.execute(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      res.status(404).json({ success: false, error: message });
    }
  });

  // GET /transactions/account/:accountId — Historial de una cuenta
  router.get('/transactions/account/:accountId', async (req: Request, res: Response) => {
    try {
      const results = await getTransaction.getByAccountId(req.params.accountId);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Error interno' });
    }
  });

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'transactions-service', timestamp: new Date().toISOString() });
  });

  return router;
}
