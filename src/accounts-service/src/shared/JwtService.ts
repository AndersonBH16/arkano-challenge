import jwt from 'jsonwebtoken';

export interface JwtPayload {
    sub: string;
    email: string;
    role: 'ADMIN' | 'USER' | 'SERVICE';
    iat?: number;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export class JwtService {
    private readonly accessSecret: string;
    private readonly refreshSecret: string;
    private readonly accessExpiresIn: number;
    private readonly refreshExpiresIn: number;

    constructor() {
        this.accessSecret = process.env.JWT_ACCESS_SECRET ?? 'access-secret-change-in-prod';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'refresh-secret-change-in-prod';
        this.accessExpiresIn = Number(process.env.JWT_ACCESS_EXPIRES_IN ?? 900);   // 15 min
        this.refreshExpiresIn = Number(process.env.JWT_REFRESH_EXPIRES_IN ?? 604800); // 7 días
    }

    generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
        const accessToken = jwt.sign(payload, this.accessSecret, {
            expiresIn: this.accessExpiresIn,
            issuer: 'banking-platform',
            audience: 'banking-api',
        });

        const refreshToken = jwt.sign(
            { sub: payload.sub },
            this.refreshSecret,
            { expiresIn: this.refreshExpiresIn, issuer: 'banking-platform' },
        );

        return { accessToken, refreshToken, expiresIn: this.accessExpiresIn };
    }

    verifyAccessToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, this.accessSecret, {
                issuer: 'banking-platform',
                audience: 'banking-api',
            }) as JwtPayload;
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                throw new Error('TOKEN_EXPIRED');
            }
            throw new Error('TOKEN_INVALID');
        }
    }

    verifyRefreshToken(token: string): { sub: string } {
        try {
            return jwt.verify(token, this.refreshSecret, {
                issuer: 'banking-platform',
            }) as { sub: string };
        } catch {
            throw new Error('REFRESH_TOKEN_INVALID');
        }
    }

    generateServiceToken(serviceName: string): string {
        return jwt.sign(
            { sub: serviceName, email: `${serviceName}@internal`, role: 'SERVICE' },
            this.accessSecret,
            { expiresIn: 3600, issuer: 'banking-platform', audience: 'banking-api' },
        );
    }
}
