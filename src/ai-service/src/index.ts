import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { KafkaEventBus } from './infrastructure/messaging/KafkaEventBus';
import { TransactionEventConsumer } from './infrastructure/messaging/TransactionEventConsumer';
import { MongoAiExplanationRepository } from './infrastructure/database/MongoAiExplanationRepository';
import { ExplainTransactionUseCase } from './application/use-cases/ExplainTransactionUseCase';
import { createLlmService } from './infrastructure/llm/LlmService';
import { createAiRouter } from './infrastructure/http/routes';

const PORT = process.env.PORT ?? 3003;
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ai_db';

async function bootstrap(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] MongoDB conectado');

  const explanationRepo = new MongoAiExplanationRepository();
  const llmService = createLlmService();
  const explainUseCase = new ExplainTransactionUseCase(explanationRepo, llmService);

  const eventBus = new KafkaEventBus(KAFKA_BROKERS, 'ai-service');
  await eventBus.connect();

  const consumer = new TransactionEventConsumer(eventBus, explainUseCase);
  await consumer.start();

  const app = express();
  app.use(express.json());

  app.use('/api/v1', createAiRouter(explainUseCase));

  app.use((_req, res) => res.status(404).json({ success: false, error: 'Ruta no encontrada' }));

  const server = app.listen(PORT, () => {
    console.log(`[AI Service] http://localhost:${PORT}/api/v1`);
  });

  const shutdown = async (): Promise<void> => {
    console.log('\n[AI Service] Apagando...');
    server.close();
    await eventBus.disconnect();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch(err => {
  console.error('[AI Service] Error fatal:', err);
  process.exit(1);
});
