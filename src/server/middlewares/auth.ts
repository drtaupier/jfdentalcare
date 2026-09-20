import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { AuthTokenPayload } from '../types/auth';
import Client from '../database';

const verifyAuthToken = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const authorizationHeader = req.headers.authorization;
			if (!authorizationHeader?.startsWith('Bearer ')) {
				throw new Error('Missing bearer token');
			}

			const token = authorizationHeader.slice('Bearer '.length);
			const decoded = jwt.verify(
				token,
				process.env.TOKEN_SECRET as Secret
			) as AuthTokenPayload;
			const session = await Client.query(
				`SELECT token_version FROM users
			 WHERE user_id = $1 AND status_id = 1`,
				[decoded.user_id]
			);
			if (
				!session.rowCount ||
				typeof decoded.token_version !== 'number' ||
				session.rows[0].token_version !== decoded.token_version
			) {
				throw new Error('Session has been revoked');
			}
			req.auth = decoded;
			next();
		} catch (error) {
			res.status(401).json({ error: 'Access denied, invalid or expired token' });
		}
	})();
};

export default verifyAuthToken;
