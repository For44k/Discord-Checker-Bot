import { ConnectionAuthStatus } from "../../core/indexes/types.js";

export interface ConnectedAccount {
    type: string;
    id: string;
    name: string;
    verified: boolean;
}

export interface CheckConnectionsResponse {
    userId: string;
    status: ConnectionAuthStatus;
    connections: ConnectedAccount[];
    error?: string;
}

export class CheckConnectionsService {
    private readonly authorizedConnections: Map<string, ConnectedAccount[]> = new Map();

    public registerAuthorizedUser(userId: string, accounts: ConnectedAccount[]): void {
        this.authorizedConnections.set(userId, accounts);
    }

    public revokeAuthorization(userId: string): void {
        this.authorizedConnections.delete(userId);
    }

    public execute(userId: string, isRequesterAuthorized: boolean = false): CheckConnectionsResponse {
        if (!isRequesterAuthorized) {
            return {
                userId,
                status: "NOT_AUTHORIZED",
                connections: [],
                error: "Caller lacks OAuth2 scope authorization to inspect user connected accounts"
            };
        }

        const accounts = this.authorizedConnections.get(userId);
        if (!accounts) {
            return {
                userId,
                status: "NOT_AUTHORIZED",
                connections: []
            };
        }

        return {
            userId,
            status: "AUTHORIZED",
            connections: accounts
        };
    }
}

export const checkConnectionsService = new CheckConnectionsService();
