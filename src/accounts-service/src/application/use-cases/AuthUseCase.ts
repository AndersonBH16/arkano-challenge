import { v4 as uuidv4 } from 'uuid';
import { JwtService, TokenPair} from "../../shared/JwtService";

export interface LoginDTO {
    email: string;
    password: string;
}

export interface RegisterDTO {
    email: string;
    password: string;
    name: string;
    role?: 'ADMIN' | 'USER';
}

const DEMO_USERS: Array<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'ADMIN' | 'USER';
}> = [
    {
        id: uuidv4(),
        email: 'admin@banco.com',
        passwordHash: 'Admin1234!',
        name: 'Administrador',
        role: 'ADMIN',
    },
    {
        id: uuidv4(),
        email: 'usuario@banco.com',
        passwordHash: 'User1234!',
        name: 'Usuario Demo',
        role: 'USER',
    },
];

export class AuthUseCase {
    private readonly jwtService: JwtService;

    constructor() {
        this.jwtService = new JwtService();
    }

    async login(dto: LoginDTO): Promise<TokenPair & { user: { id: string; email: string; name: string; role: string } }> {
        const user = DEMO_USERS.find(u => u.email === dto.email);
        if (!user) {
            throw new Error('Credenciales inválidas');
        }

        if (dto.password !== user.passwordHash) {
            throw new Error('Credenciales inválidas');
        }

        const tokens = this.jwtService.generateTokenPair({
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            ...tokens,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        };
    }

    async refreshToken(refreshToken: string): Promise<TokenPair> {
        const { sub } = this.jwtService.verifyRefreshToken(refreshToken);
        const user = DEMO_USERS.find(u => u.id === sub);
        if (!user) throw new Error('Usuario no encontrado');

        return this.jwtService.generateTokenPair({
            sub: user.id,
            email: user.email,
            role: user.role,
        });
    }
}
