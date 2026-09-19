import { NextFunction, Request, Response } from 'express';

export const requireRole = (...allowedRoles: string[]) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const role = req.auth?.role;

		if (!role || !allowedRoles.includes(role)) {
			res.status(403).json({
				error: 'You do not have permission to perform this action',
			});
			return;
		}

		next();
	};
};
