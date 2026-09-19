import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { AuthTokenPayload } from '../types/auth';

const verifyAuthToken = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
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
		req.auth = decoded;
		next();
	} catch (error) {
		res.status(401).json({ error: 'Access denied, invalid or expired token' });
	}
};

export default verifyAuthToken;
