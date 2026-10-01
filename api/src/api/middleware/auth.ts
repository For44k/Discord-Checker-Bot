import { Request, Response, NextFunction, RequestHandler } from 'express';
import { config } from '../../utils/env.config.js';

export type ApiScope = 'analytics:read' | 'guild:read' | 'user:read' | 'voice:read' | 'messaging:send' | 'admin:*';

function verifyAuth(req: Request, res: Response, next: NextFunction, requiredScope?: ApiScope): void {
    const headers = [req.headers['x-api-key'], req.headers.authorization]
        .flatMap((header) => (Array.isArray(header) ? header : [header]))
        .filter((header): header is string => typeof header === 'string')
        .map((header) => header.replace(/^Bearer\s+/i, '').trim())
        .filter(Boolean);

    if (headers.length === 0) {
        res.status(401).json({ success: false, error: 'API key required' });
        return;
    }

    const isMasterKey = headers.some((key) => key === config.API_KEY || (process.env.API_SECRET && key === process.env.API_SECRET));
    if (isMasterKey) {
        next();
        return;
    }

    if (requiredScope) {
        const scopeEnvVar = `API_KEY_${requiredScope.toUpperCase().replace(/[:*]/g, '_')}`;
        const configuredScopeKey = process.env[scopeEnvVar];
        if (configuredScopeKey && headers.includes(configuredScopeKey)) {
            next();
            return;
        }
    }

    res.status(403).json({ success: false, error: 'Invalid or insufficient API key' });
}

export function authMiddleware(scopeOrReq?: ApiScope | Request, res?: Response, next?: NextFunction): RequestHandler | void {
    if (typeof scopeOrReq === 'string') {
        const scope = scopeOrReq;
        return (req: Request, res: Response, next: NextFunction) => verifyAuth(req, res, next, scope);
    }

    if (scopeOrReq && res && next) {
        return verifyAuth(scopeOrReq as Request, res, next);
    }

    return (req: Request, res: Response, next: NextFunction) => verifyAuth(req, res, next);
}
