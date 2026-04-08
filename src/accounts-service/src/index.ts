import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { KafkaEventBus } from './infrastructure/messaging/KafkaEventBus';
import { PrismaCustomerRepository } from './infrastructure/database/PrismaCustomerRepository';
import { PrismaAccountRepository } from './infrastructure/database/PrismaAccountRepository';
import { TransactionEventConsumer } from './infrastructure/messaging/TransactionEventConsumer';
import { UpdateBalanceUseCase} from "./application/use-cases/UpdateBalanceUseCase";
import { createAccountsRouter } from './infrastructure/http/routes';
import { createAuthRouter } from './infrastructure/http/authRoutes';
import { authMiddleware, rateLimitMiddleware } from './shared/authMiddleware';

const PORT = process.env.PORT ?? 3001;
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

async function run(): Promise<void> {
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('[DB] PostgreSQL conectado');

    const customerRepo = new PrismaCustomerRepository(prisma);
    const accountRepo = new PrismaAccountRepository(prisma);

    const eventBus = new KafkaEventBus(KAFKA_BROKERS, 'accounts-service');
    await eventBus.connect();

    const updateBalance = new UpdateBalanceUseCase(accountRepo, eventBus);
    const transactionConsumer = new TransactionEventConsumer(eventBus, updateBalance);
    await transactionConsumer.start();

    const app = express();

    app.use(express.json());
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    });
    app.use(rateLimitMiddleware(100, 60_000));
    app.use('/api/v1', createAuthRouter());
    app.get('/api/v1/health', (_req, res) => {
        res.json({ status: 'ok', service: 'accounts-service', timestamp: new Date().toISOString() });
    });
    app.use('/api/v1', authMiddleware, createAccountsRouter(customerRepo, accountRepo, eventBus));
    app.use((_req, res) => {
        res.status(404).json({ success: false, error: 'Ruta no encontrada' });
    });

    const server = app.listen(PORT, () => {
        console.log(`[Accounts Service] API: http://localhost:${PORT}/api/v1`);
    });

    const shutdown = async (): Promise<void> => {
        console.log('\n[Accounts Service] Apagando...');
        server.close();
        await eventBus.disconnect();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

run().catch((err) => {
    console.error('[Accounts Service] Error fatal al iniciar:', err);
    process.exit(1);
});
