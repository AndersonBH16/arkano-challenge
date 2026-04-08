import { Account} from "../entities/Accounts";

export interface IAccountRepository {
    findById(id: string): Promise<Account | null>;
    findByNumber(number: string): Promise<Account | null>;
    findByCustomerId(customerId: string): Promise<Account[]>;
    save(account: Account): Promise<Account>;
    update(account: Account): Promise<Account>;
}
