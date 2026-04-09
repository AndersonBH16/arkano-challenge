import { ITransactionRepository} from "../../domain/repositories/ITransactionRepository";
import { TransactionProps } from '../../domain/entities/Transaction';

export class GetTransactionUseCase {
  constructor(private readonly transactionRepo: ITransactionRepository) {}

  async execute(transactionId: string): Promise<TransactionProps> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transacción no encontrada: ${transactionId}`);
    }
    return transaction.toJSON();
  }

  async getByAccountId(accountId: string): Promise<TransactionProps[]> {
    const transactions = await this.transactionRepo.findByAccountId(accountId);
    return transactions.map(t => t.toJSON());
  }
}
