import axios, { AxiosInstance } from 'axios';
import { IAccountsServiceClient, AccountInfo } from '../../application/ports/IEventBus';
import { JwtService } from '../../shared/JwtService';

export class HttpAccountsServiceClient implements IAccountsServiceClient {
    private readonly http: AxiosInstance;
    private readonly jwtService: JwtService;

    constructor(baseURL: string) {
        this.jwtService = new JwtService();

        this.http = axios.create({
            baseURL,
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' },
        });

        this.http.interceptors.request.use((config) => {
            const token = this.jwtService.generateServiceToken('transactions-service');
            config.headers['Authorization'] = `Bearer ${token}`;
            return config;
        });
    }

    async getAccount(accountId: string): Promise<AccountInfo | null> {
        try {
            const res = await this.http.get(`/api/v1/accounts/${accountId}`);
            return res.data.data as AccountInfo;
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 404) return null;
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                throw new Error(`Sin autorización para consultar cuenta ${accountId}`);
            }
            throw new Error(`Error consultando cuenta ${accountId}`);
        }
    }

    async getAccountBalance(accountId: string): Promise<number> {
        try {
            const res = await this.http.get(`/api/v1/accounts/${accountId}/balance`);
            return res.data.data.balance as number;
        } catch {
            throw new Error(`Error consultando saldo de cuenta ${accountId}`);
        }
    }
}