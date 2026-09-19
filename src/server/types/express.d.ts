import { AuthTokenPayload } from './auth';

declare global {
	namespace Express {
		interface Request {
			auth?: AuthTokenPayload;
		}
	}
}

export {};
