import { v4 as uuidv4 } from 'uuid';
import { Customer} from "../../domain/entities/Customers";
import { ICustomerRepository} from "../../domain/repositories/ICustomerRepository";
import { IEventBus } from '../ports/IEventBus';
import { ClientCreatedEvent} from "../../domain/events/CustomerEvents";

export interface CreateCustomerDTO {
    name: string;
    email: string;
    document: string;
    phone?: string;
}

export interface CreateCustomerResult {
    id: string;
    name: string;
    email: string;
    document: string;
    phone?: string;
    createdAt: Date;
}

export class CreateCustomerUseCase {
    constructor(
        private readonly customerRepository: ICustomerRepository,
        private readonly eventBus: IEventBus,
    ) {}

    async execute(dto: CreateCustomerDTO): Promise<CreateCustomerResult> {
        const existingByEmail = await this.customerRepository.findByEmail(dto.email);
        if (existingByEmail) {
            throw new Error(`Ya existe un cliente con el email: ${dto.email}`);
        }

        const existingByDocument = await this.customerRepository.findByDocument(dto.document);
        if (existingByDocument) {
            throw new Error(`Ya existe un cliente con el documento: ${dto.document}`);
        }

        const customer = Customer.create({
            id: uuidv4(),
            name: dto.name.trim(),
            email: dto.email.toLowerCase().trim(),
            document: dto.document.trim(),
            phone: dto.phone?.trim(),
        });

        const saved = await this.customerRepository.save(customer);

        const event: ClientCreatedEvent = {
            eventId: uuidv4(),
            eventType: 'ClientCreated',
            occurredAt: new Date().toISOString(),
            version: 1,
            payload: {
                customerId: saved.id,
                name: saved.name,
                email: saved.email,
                document: saved.document,
            },
        };

        await this.eventBus.publish('client.created', event);

        return {
            id: saved.id,
            name: saved.name,
            email: saved.email,
            document: saved.document,
            phone: saved.phone,
            createdAt: saved.createdAt,
        };
    }
}
