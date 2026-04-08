// ─── RUTAS HTTP DEL SERVICIO DE CUENTAS ──────────────────────
// La capa HTTP es solo un adaptador: recibe requests, llama
// al caso de uso correspondiente, y devuelve la respuesta.

import { Router, Request, Response } from 'express';
import { CreateCustomerUseCase } from '../../application/use-cases/CreateCustomerUseCase';
import { CreateAccountUseCase } from '../../application/use-cases/CreateAccountUseCase';
import { GetAccountUseCase } from '../../application/use-cases/GetAccountUseCases';
import { ICustomerRepository} from "../../domain/repositories/ICustomerRepository";
import {IAccountRepository} from "../../domain/repositories/IAccountRepository";
import { IEventBus } from '../../application/ports/IEventBus';

export function createAccountsRouter(
    customerRepo: ICustomerRepository,
    accountRepo: IAccountRepository,
    eventBus: IEventBus,
): Router {
    const router = Router();

    // ─── Instanciar casos de uso ────────────────────────────────
    const createCustomer = new CreateCustomerUseCase(customerRepo, eventBus);
    const createAccount = new CreateAccountUseCase(customerRepo, accountRepo, eventBus);
    const getAccount = new GetAccountUseCase(accountRepo, customerRepo);

    // ─── POST /customers ────────────────────────────────────────
    router.post('/customers', async (req: Request, res: Response) => {
        try {
            const result = await createCustomer.execute(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error interno';
            res.status(400).json({ success: false, error: message });
        }
    });

    // ─── GET /customers ─────────────────────────────────────────
    router.get('/customers', async (_req: Request, res: Response) => {
        try {
            const customers = await customerRepo.findAll();
            res.json({ success: true, data: customers.map(c => c.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    });

    // ─── GET /customers/:id ─────────────────────────────────────
    router.get('/customers/:id', async (req: Request, res: Response) => {
        try {
            const customer = await customerRepo.findById(req.params.id);
            if (!customer) {
                return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            }
            res.json({ success: true, data: customer.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    });

    // ─── POST /accounts ─────────────────────────────────────────
    router.post('/accounts', async (req: Request, res: Response) => {
        try {
            const result = await createAccount.execute(req.body);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error interno';
            res.status(400).json({ success: false, error: message });
        }
    });

    // ─── GET /accounts/:id ──────────────────────────────────────
    router.get('/accounts/:id', async (req: Request, res: Response) => {
        try {
            const result = await getAccount.execute(req.params.id);
            res.json({ success: true, data: result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error interno';
            res.status(404).json({ success: false, error: message });
        }
    });

    // ─── GET /accounts/:id/balance ──────────────────────────────
    router.get('/accounts/:id/balance', async (req: Request, res: Response) => {
        try {
            const account = await accountRepo.findById(req.params.id);
            if (!account) {
                return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
            }
            res.json({
                success: true,
                data: {
                    accountId: account.id,
                    number: account.number,
                    balance: account.balance,
                    currency: account.currency,
                },
            });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    });

    // ─── GET /customers/:id/accounts ────────────────────────────
    router.get('/customers/:id/accounts', async (req: Request, res: Response) => {
        try {
            const customer = await customerRepo.findById(req.params.id);
            if (!customer) {
                return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            }
            const accounts = await accountRepo.findByCustomerId(req.params.id);
            res.json({ success: true, data: accounts.map(a => a.toJSON()) });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    });

    // ─── GET /health ─────────────────────────────────────────────
    router.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok', service: 'accounts-service', timestamp: new Date().toISOString() });
    });

    // ─── GET /accounts/number/:number ────────────────────────────
    router.get('/accounts/number/:number', async (req: Request, res: Response) => {
        try {
            const account = await accountRepo.findByNumber(req.params.number);
            if (!account) {
                return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
            }
            res.json({ success: true, data: account.toJSON() });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Error interno' });
        }
    });

    return router;
}
