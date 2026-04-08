import { Router, Request, Response } from 'express';
import { AuthUseCase } from '../../application/use-cases/AuthUseCase';
import { rateLimitMiddleware} from "../../shared/authMiddleware";

export function createAuthRouter(): Router {
    const router = Router();
    const authUseCase = new AuthUseCase();
    const loginRateLimit = rateLimitMiddleware(10, 60_000);

    router.post('/auth/login', loginRateLimit, async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
            }
            const result = await authUseCase.login({ email, password });
            res.json({ success: true, data: result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error de autenticación';
            res.status(401).json({ success: false, error: message });
        }
    });

    router.post('/auth/refresh', async (req: Request, res: Response) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ success: false, error: 'refreshToken requerido' });
            }
            const tokens = await authUseCase.refreshToken(refreshToken);
            res.json({ success: true, data: tokens });
        } catch {
            res.status(401).json({ success: false, error: 'Token de refresco inválido o expirado' });
        }
    });

    return router;
}
