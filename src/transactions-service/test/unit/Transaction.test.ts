import { Transaction } from '../../src/domain/entities/Transaction';
import { v4 as uuidv4 } from 'uuid';

describe('Transaction Entity', () => {
  const baseProps = { id: uuidv4(), amount: 500, currency: 'PEN', idempotencyKey: uuidv4() };

  describe('create()', () => {
    it('crea depósito con cuenta destino', () => {
      const t = Transaction.create({ ...baseProps, type: 'DEPOSIT', targetAccountId: uuidv4() });
      expect(t.status).toBe('PENDING');
      expect(t.isPending()).toBe(true);
    });

    it('crea retiro con cuenta origen', () => {
      const t = Transaction.create({ ...baseProps, type: 'WITHDRAWAL', sourceAccountId: uuidv4() });
      expect(t.type).toBe('WITHDRAWAL');
    });

    it('crea transferencia con origen y destino', () => {
      const t = Transaction.create({
        ...baseProps, type: 'TRANSFER',
        sourceAccountId: uuidv4(), targetAccountId: uuidv4(),
      });
      expect(t.type).toBe('TRANSFER');
    });

    it('lanza error si monto es 0', () => {
      expect(() => Transaction.create({ ...baseProps, amount: 0, type: 'DEPOSIT', targetAccountId: uuidv4() }))
        .toThrow('mayor a 0');
    });

    it('lanza error en depósito sin cuenta destino', () => {
      expect(() => Transaction.create({ ...baseProps, type: 'DEPOSIT' }))
        .toThrow('cuenta destino');
    });

    it('lanza error en transferencia con misma cuenta', () => {
      const id = uuidv4();
      expect(() => Transaction.create({ ...baseProps, type: 'TRANSFER', sourceAccountId: id, targetAccountId: id }))
        .toThrow('no pueden ser la misma');
    });
  });

  describe('complete()', () => {
    it('cambia estado a COMPLETED', () => {
      const t = Transaction.create({ ...baseProps, type: 'DEPOSIT', targetAccountId: uuidv4() });
      t.complete();
      expect(t.isCompleted()).toBe(true);
      expect(t.processedAt).toBeInstanceOf(Date);
    });

    it('no permite completar dos veces', () => {
      const t = Transaction.create({ ...baseProps, type: 'DEPOSIT', targetAccountId: uuidv4() });
      t.complete();
      expect(() => t.complete()).toThrow();
    });
  });

  describe('reject()', () => {
    it('cambia estado a REJECTED con razón', () => {
      const t = Transaction.create({ ...baseProps, type: 'DEPOSIT', targetAccountId: uuidv4() });
      t.reject('Saldo insuficiente');
      expect(t.isRejected()).toBe(true);
      expect(t.rejectionReason).toBe('Saldo insuficiente');
    });
  });
});
