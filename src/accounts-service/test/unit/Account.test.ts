import { Account } from '../../src/domain/entities/Accounts';
import { v4 as uuidv4 } from 'uuid';

describe('Account Entity', () => {
  const validProps = {
    id: uuidv4(),
    customerId: uuidv4(),
    number: '00211234567890',
    balance: 1000,
    currency: 'PEN',
  };

  describe('create()', () => {
    it('debe crear una cuenta activa con saldo inicial', () => {
      const account = Account.create(validProps);

      expect(account.status).toBe('ACTIVE');
      expect(account.balance).toBe(1000);
      expect(account.isActive()).toBe(true);
    });

    it('debe crear una cuenta con saldo cero por defecto', () => {
      const account = Account.create({ ...validProps, balance: 0 });
      expect(account.balance).toBe(0);
    });

    it('debe lanzar error si el saldo inicial es negativo', () => {
      expect(() =>
        Account.create({ ...validProps, balance: -100 }),
      ).toThrow('El saldo de la cuenta no puede ser negativo');
    });
  });

  describe('credit()', () => {
    it('debe aumentar el saldo correctamente', () => {
      const account = Account.create({ ...validProps, balance: 500 });
      account.credit(200);
      expect(account.balance).toBe(700);
    });

    it('debe lanzar error si el monto a acreditar es cero o negativo', () => {
      const account = Account.create(validProps);
      expect(() => account.credit(0)).toThrow('El monto a acreditar debe ser mayor a 0');
      expect(() => account.credit(-50)).toThrow('El monto a acreditar debe ser mayor a 0');
    });
  });

  describe('debit()', () => {
    it('debe disminuir el saldo correctamente', () => {
      const account = Account.create({ ...validProps, balance: 1000 });
      account.debit(300);
      expect(account.balance).toBe(700);
    });

    it('debe lanzar error si no hay fondos suficientes', () => {
      const account = Account.create({ ...validProps, balance: 100 });
      expect(() => account.debit(200)).toThrow('Saldo insuficiente');
    });

    it('debe lanzar error si el monto es cero o negativo', () => {
      const account = Account.create(validProps);
      expect(() => account.debit(0)).toThrow('El monto a debitar debe ser mayor a 0');
    });
  });

  describe('hasSufficientFunds()', () => {
    it('debe retornar true si hay fondos suficientes', () => {
      const account = Account.create({ ...validProps, balance: 500 });
      expect(account.hasSufficientFunds(500)).toBe(true);
      expect(account.hasSufficientFunds(499)).toBe(true);
    });

    it('debe retornar false si no hay fondos suficientes', () => {
      const account = Account.create({ ...validProps, balance: 100 });
      expect(account.hasSufficientFunds(101)).toBe(false);
    });
  });
});
