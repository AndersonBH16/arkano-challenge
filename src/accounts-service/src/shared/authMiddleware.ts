import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from './JwtService';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

const jwtService = new JwtService();

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Token de autenticación requerido',
            code: 'AUTH_REQUIRED',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwtService.verifyAccessToken(token);
        req.user = payload;
        next();
    } catch (err) {
        const message = err instanceof Error ? err.message : 'TOKEN_INVALID';

        if (message === 'TOKEN_EXPIRED') {
            res.status(401).json({
                success: false,
                error: 'Token expirado, por favor renueva tu sesión',
                code: 'TOKEN_EXPIRED',
            });
            return;
        }

        res.status(401).json({
            success: false,
            error: 'Token inválido',
            code: 'TOKEN_INVALID',
        });
    }
}

export function requireRole(...roles: JwtPayload['role'][]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'No autenticado' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: `Acceso denegado. Roles requeridos: ${roles.join(', ')}`,
                code: 'FORBIDDEN',
            });
            return;
        }

        next();
    };
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(maxRequests: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = req.ip ?? 'unknown';
        const now = Date.now();
        const entry = requestCounts.get(key);

        if (!entry || now > entry.resetAt) {
            requestCounts.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        if (entry.count >= maxRequests) {
            res.status(429).json({
                success: false,
                error: 'Demasiadas solicitudes, intenta más tarde',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            });
            return;
        }

        entry.count++;
        next();
    };
}
