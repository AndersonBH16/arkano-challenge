import { Customer } from "../../src/domain/entities/Customers";
import { v4 as uuidv4 } from 'uuid';

describe('Customer Entity', () => {
  const validProps = {
    id: uuidv4(),
    name: 'Juan Pérez',
    email: 'juan@email.com',
    document: '12345678',
  };

  describe('create()', () => {
    it('debe crear un cliente válido con los datos correctos', () => {
      const customer = Customer.create(validProps);

      expect(customer.id).toBe(validProps.id);
      expect(customer.name).toBe(validProps.name);
      expect(customer.email).toBe(validProps.email);
      expect(customer.document).toBe(validProps.document);
      expect(customer.createdAt).toBeInstanceOf(Date);
    });

    it('debe lanzar error si el nombre es muy corto', () => {
      expect(() =>
        Customer.create({ ...validProps, name: 'A' }),
      ).toThrow('El nombre del cliente debe tener al menos 2 caracteres');
    });

    it('debe lanzar error si el email no es válido', () => {
      expect(() =>
        Customer.create({ ...validProps, email: 'no-es-email' }),
      ).toThrow('El email del cliente no es válido');
    });

    it('debe lanzar error si el documento es muy corto', () => {
      expect(() =>
        Customer.create({ ...validProps, document: '1234' }),
      ).toThrow('El documento del cliente debe tener al menos 8 caracteres');
    });

    it('debe aceptar cliente sin teléfono (campo opcional)', () => {
      const customer = Customer.create({ ...validProps, phone: undefined });
      expect(customer.phone).toBeUndefined();
    });
  });

  describe('toJSON()', () => {
    it('debe serializar correctamente todos los campos', () => {
      const customer = Customer.create({ ...validProps, phone: '999888777' });
      const json = customer.toJSON();

      expect(json).toMatchObject({
        id: validProps.id,
        name: validProps.name,
        email: validProps.email,
        document: validProps.document,
        phone: '999888777',
      });
    });
  });
});
