import { CreateCustomerUseCase } from '../../src/application/use-cases/CreateCustomerUseCase';
import { ICustomerRepository} from "../../src/domain/repositories/ICustomerRepository";
import { IEventBus } from '../../src/application/ports/IEventBus';
import { Customer } from "../../src/domain/entities/Customers";
import { v4 as uuidv4 } from 'uuid';

const mockCustomerRepo: jest.Mocked<ICustomerRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByDocument: jest.fn(),
  save: jest.fn(),
  findAll: jest.fn(),
};

const mockEventBus: jest.Mocked<IEventBus> = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateCustomerUseCase(mockCustomerRepo, mockEventBus);
  });

  const validInput = {
    name: 'María García',
    email: 'maria@email.com',
    document: '87654321',
    phone: '987654321',
  };

  it('debe crear un cliente y publicar evento ClientCreated', async () => {
    mockCustomerRepo.findByEmail.mockResolvedValue(null);
    mockCustomerRepo.findByDocument.mockResolvedValue(null);

    const savedCustomer = Customer.create({ id: uuidv4(), ...validInput });
    mockCustomerRepo.save.mockResolvedValue(savedCustomer);

    const result = await useCase.execute(validInput);

    expect(result.name).toBe(validInput.name);
    expect(result.email).toBe(validInput.email);

    expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'client.created',
      expect.objectContaining({ eventType: 'ClientCreated' }),
    );
  });

  it('debe lanzar error si el email ya está registrado', async () => {
    const existing = Customer.create({ id: uuidv4(), ...validInput });
    mockCustomerRepo.findByEmail.mockResolvedValue(existing);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      `Ya existe un cliente con el email: ${validInput.email}`,
    );
    
    expect(mockCustomerRepo.save).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('debe lanzar error si el documento ya está registrado', async () => {
    mockCustomerRepo.findByEmail.mockResolvedValue(null);
    const existing = Customer.create({ id: uuidv4(), ...validInput });
    mockCustomerRepo.findByDocument.mockResolvedValue(existing);

    await expect(useCase.execute(validInput)).rejects.toThrow(
      `Ya existe un cliente con el documento: ${validInput.document}`,
    );
  });
});
