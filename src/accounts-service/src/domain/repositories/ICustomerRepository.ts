import { Customer} from "../entities/Customers";

export interface ICustomerRepository {
    findById(id: string): Promise<Customer | null>;
    findByEmail(email: string): Promise<Customer | null>;
    findByDocument(document: string): Promise<Customer | null>;
    save(customer: Customer): Promise<Customer>;
    findAll(): Promise<Customer[]>;
}