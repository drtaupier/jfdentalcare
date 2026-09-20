import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import verifyAuthToken from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { ManagedUserInput, UserStore } from '../models/users';
import { generateTemporaryPassword, validatePassword } from '../utils/password';

dotenv.config();

const store = new UserStore();

const index = async (_req: Request, res: Response) => {
	try {
		const users = await store.index();
		res.status(200).json(users);
	} catch (error) {
		res.status(400).json(error);
	}
};

const activeUsers = async (_req: Request, res: Response) => {
	try {
		const users = await store.activeUsers();
		res.status(200).json(users);
	} catch (error) {
		res.status(400).json(error);
	}
};

const inactiveUsers = async (_req: Request, res: Response) => {
	try {
		const users = await store.inactiveUsers();
		res.status(200).json(users);
	} catch (error) {
		res.status(400).json(error);
	}
};

const show = async (req: Request, res: Response) => {
	try {
		const user = await store.show(req.params.users_id);
		res.json(user);
	} catch (error) {
		res.status(400).json(error);
	}
};

const create = async (req: Request, res: Response) => {
	try {
		const { firstname, lastname, username, display_name, role } = req.body;
		if (
			![firstname, lastname, username, display_name, role].every(
				(value) => typeof value === 'string' && value.trim().length > 0
			)
		) {
			res.status(400).json({ error: 'All user fields are required' });
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
			res.status(400).json({ error: 'Username must be a valid email address' });
			return;
		}

		const normalizedRole = role.trim().toUpperCase();
		if (!['OWNER', 'MANAGER', 'USER'].includes(normalizedRole)) {
			res.status(403).json({
				error: 'Role must be OWNER, MANAGER, or USER',
			});
			return;
		}

		const user: ManagedUserInput = {
			firstname: firstname.trim(),
			lastname: lastname.trim(),
			username: username.trim().toLowerCase(),
			display_name: display_name.trim(),
			role: normalizedRole as ManagedUserInput['role'],
		};
		const temporaryPassword = generateTemporaryPassword();
		const newUser = await store.createManagedUser(
			user,
			temporaryPassword,
			req.auth!.user_id,
			req.ip
		);
		res.status(201).json({
			user: newUser,
			temporary_password: temporaryPassword,
			message: 'Save this temporary password now; it will not be shown again',
		});
	} catch (error: any) {
		if (error?.code === '23505') {
			res.status(409).json({ error: 'A user with this email already exists' });
		} else if (error?.message === 'ROLE_NOT_ALLOWED') {
			res.status(403).json({ error: 'This role cannot be assigned through the API' });
		} else {
			res.status(500).json({ error: 'Unable to create user' });
		}
	}
};

const destroy = async (req: Request, res: Response) => {
	try {
		const user = await store.delete(req.params.users_id);
		res.status(200).json(user);
	} catch (error) {
		res.status(400).json(error);
	}
};

const active = async (req: Request, res: Response) => {
	try {
		const user = await store.active(req.params.users_id);
		res.status(200).json(user);
	} catch (error) {
		res.status(400).json(error);
	}
};

const authenticate = async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body;
		if (typeof username !== 'string' || typeof password !== 'string') {
			res.status(400).json({ error: 'Username and password are required' });
			return;
		}

		const u = await store.authenticate(username, password);
		if (!u) {
			throw new Error('Usuario no encontrado');
		}
		const payload = {
			user_id: u.user_id,
			username: u.username,
			role: u.user_role,
			token_version: u.token_version,
		};
		const tokenOptions: SignOptions = {
			expiresIn: (process.env.TOKEN_EXPIRES_IN || '8h') as SignOptions['expiresIn'],
		};
		const token = jwt.sign(
			payload,
			process.env.TOKEN_SECRET as Secret,
			tokenOptions
		);
		res.json({
			token,
			user_id: u.user_id,
			role: u.user_role,
			must_change_password: u.must_change_password,
		});
	} catch (error) {
		res.status(401).json(error);
	}
};

const changePassword = async (req: Request, res: Response) => {
	try {
		const { current_password, new_password } = req.body;
		if (typeof current_password !== 'string' || typeof new_password !== 'string') {
			res
				.status(400)
				.json({ error: 'Current password and new password are required' });
			return;
		}

		const passwordErrors = validatePassword(new_password);
		if (passwordErrors.length) {
			res.status(400).json({
				error: `New password must contain ${passwordErrors.join(', ')}`,
			});
			return;
		}

		await store.changePassword(
			req.auth!.user_id,
			current_password,
			new_password,
			req.ip
		);
		res.status(200).json({
			message: 'Password changed successfully',
			must_change_password: false,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		if (message === 'CURRENT_PASSWORD_INCORRECT') {
			res.status(400).json({ error: 'Current password is incorrect' });
			return;
		}
		if (message === 'PASSWORD_UNCHANGED') {
			res.status(400).json({ error: 'New password must be different' });
			return;
		}
		if (message === 'USER_NOT_FOUND') {
			res.status(404).json({ error: 'Active user not found' });
			return;
		}
		res.status(500).json({ error: 'Unable to change password' });
	}
};

const resetPassword = async (req: Request, res: Response) => {
	const targetUserId = Number(req.params.users_id);
	if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
		res.status(400).json({ error: 'A valid user ID is required' });
		return;
	}

	try {
		const temporaryPassword = generateTemporaryPassword();
		const user = await store.resetPassword(
			targetUserId,
			temporaryPassword,
			req.auth!.user_id,
			req.auth!.role,
			req.ip
		);
		res.status(200).json({
			user,
			temporary_password: temporaryPassword,
			must_change_password: true,
			temporary_password_expires_in: '24 hours',
			message: 'Save this temporary password now; it will not be shown again',
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : '';
		if (message === 'USER_NOT_FOUND') {
			res.status(404).json({ error: 'Active user not found' });
			return;
		}
		if (message === 'SELF_RESET_NOT_ALLOWED') {
			res.status(400).json({ error: 'Use change-password for your own account' });
			return;
		}
		if (['RESET_NOT_ALLOWED', 'TARGET_ROLE_NOT_ALLOWED'].includes(message)) {
			res.status(403).json({ error: 'This password reset is not allowed' });
			return;
		}
		res.status(500).json({ error: 'Unable to reset password' });
	}
};

const userRoutes = (app: express.Application): void => {
	const administrativeRoles = requireRole('OWNER', 'TECH_SUPPORT', 'ADMIN');
	const accountManagerRoles = requireRole('OWNER', 'ADMIN');

	app.get('/users', verifyAuthToken, administrativeRoles, index);
	app.get('/user/active', verifyAuthToken, administrativeRoles, activeUsers);
	app.get('/user/inactive', verifyAuthToken, administrativeRoles, inactiveUsers);
	app.get('/users/:users_id', verifyAuthToken, administrativeRoles, show);
	app.post('/api/users', verifyAuthToken, accountManagerRoles, create);
	app.post('/user/register', verifyAuthToken, accountManagerRoles, create);
	app.post('/user/:users_id', verifyAuthToken, administrativeRoles, destroy);
	app.post('/users/:users_id', verifyAuthToken, administrativeRoles, active);
	app.post('/login', authenticate); // Hace la autenticación de nuestras credenciales
	app.post('/api/auth/login', authenticate);
	app.post('/api/auth/change-password', verifyAuthToken, changePassword);
	app.post(
		'/api/users/:users_id/reset-password',
		verifyAuthToken,
		administrativeRoles,
		resetPassword
	);
};

export default userRoutes;
