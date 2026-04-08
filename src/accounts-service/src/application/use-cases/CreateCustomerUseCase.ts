// ─── CASO DE USO: CREAR CLIENTE ───────────────────────────────
// Los casos de uso coordinan: validar → guardar → publicar evento.
// No conocen detalles de BD ni HTTP, solo trabajan con interfaces.

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
        // 1. Verificar que el email no esté registrado
        const existingByEmail = await this.customerRepository.findByEmail(dto.email);
        if (existingByEmail) {
            throw new Error(`Ya existe un cliente con el email: ${dto.email}`);
        }

        // 2. Verificar que el documento no esté registrado
        const existingByDocument = await this.customerRepository.findByDocument(dto.document);
        if (existingByDocument) {
            throw new Error(`Ya existe un cliente con el documento: ${dto.document}`);
        }

        // 3. Crear la entidad (aquí se validan las reglas de negocio del dominio)
        const customer = Customer.create({
            id: uuidv4(),
            name: dto.name.trim(),
            email: dto.email.toLowerCase().trim(),
            document: dto.document.trim(),
            phone: dto.phone?.trim(),
        });

        // 4. Persistir en la base de datos
        const saved = await this.customerRepository.save(customer);

        // 5. Publicar evento en Kafka para notificar a otros servicios
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
