import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { KafkaEventBus} from "./infrastructure/messaging/KafkaEventBus";
import { PrismaTransactionRepository } from './infrastructure/database/PrismaTransactionRepository';
import { HttpAccountsServiceClient } from './infrastructure/http/HttpAccountsServiceClient';
import { createTransactionsRouter } from './infrastructure/http/routes';
import { authMiddleware, rateLimitMiddleware} from "./shared/authMiddleware";

const PORT = process.env.PORT ?? 3002;
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const ACCOUNTS_SERVICE_URL = process.env.ACCOUNTS_SERVICE_URL ?? 'http://localhost:3001';

async function run(): Promise<void> {
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('[DB] PostgreSQL conectado');

  const transactionRepo = new PrismaTransactionRepository(prisma);
  const accountsClient = new HttpAccountsServiceClient(ACCOUNTS_SERVICE_URL);

  const eventBus = new KafkaEventBus(KAFKA_BROKERS, 'transactions-service');
  await eventBus.connect();

  const app = express();

  app.use(express.json());
  app.use(rateLimitMiddleware(60, 60_000));

  app.use('/api/v1/transactions', authMiddleware);

  const router = createTransactionsRouter(transactionRepo, accountsClient, eventBus);
  app.use('/api/v1', router);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Ruta no encontrada' });
  });

  const server = app.listen(PORT, () => {
    console.log(`[Transactions Service] API http://localhost:${PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    console.log('\n[Transactions Service] Apagando...');
    server.close();
    await eventBus.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

run().catch(err => {
  console.error('[Transactions Service] Error fatal:', err);
  process.exit(1);
});
