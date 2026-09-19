import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import verifyAuthToken from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { User, UserStore } from '../models/users';
import { validatePassword } from '../utils/password';

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
		const user = req.body as User;
		if (!user.role_id) {
			res.status(400).json({ error: 'Role is required' });
			return;
		}

		const requestedRole = await store.roleNameById(user.role_id);
		if (!requestedRole) {
			res.status(400).json({ error: 'Invalid role' });
			return;
		}
		if (requestedRole === 'TECH_SUPPORT') {
			res.status(403).json({
				error: 'TECH_SUPPORT accounts can only be created by the secure bootstrap command',
			});
			return;
		}

		const newUser = await store.create(user);
		res.status(201).json(newUser);
	} catch (error: any) {
		console.log(error);

		// si el usuario ya existe, devolver un error 409
		if (error.message.includes('duplicate key value violates unique constraint')) {
			res.status(409).json({ error: 'El usuario ya existe en la base de datos' });
		} else {
			// si hay otro error, devolver un error 400
			res.status(400).json({ error: error.message });
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

const userRoutes = (app: express.Application): void => {
	const administrativeRoles = requireRole('OWNER', 'TECH_SUPPORT', 'ADMIN');
	const accountManagerRoles = requireRole('OWNER', 'ADMIN');

	app.get('/users', verifyAuthToken, administrativeRoles, index);
	app.get('/user/active', verifyAuthToken, administrativeRoles, activeUsers);
	app.get('/user/inactive', verifyAuthToken, administrativeRoles, inactiveUsers);
	app.get('/users/:users_id', verifyAuthToken, administrativeRoles, show);
	app.post('/user/register', verifyAuthToken, accountManagerRoles, create);
	app.post('/user/:users_id', verifyAuthToken, administrativeRoles, destroy);
	app.post('/users/:users_id', verifyAuthToken, administrativeRoles, active);
	app.post('/login', authenticate); // Hace la autenticación de nuestras credenciales
	app.post('/api/auth/login', authenticate);
	app.post('/api/auth/change-password', verifyAuthToken, changePassword);
};

export default userRoutes;
