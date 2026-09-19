import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import verifyAuthToken from '../middlewares/auth';
import { requireRole } from '../middlewares/roles';
import { User, UserStore } from '../models/users';

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
		// intentar crear el usuario
		const user = req.body as User;
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

const userRoutes = (app: express.Application): void => {
	const administrativeRoles = requireRole('OWNER', 'TECH_SUPPORT', 'ADMIN');

	app.get('/users', verifyAuthToken, administrativeRoles, index);
	app.get('/user/active', verifyAuthToken, administrativeRoles, activeUsers);
	app.get('/user/inactive', verifyAuthToken, administrativeRoles, inactiveUsers);
	app.get('/users/:users_id', verifyAuthToken, administrativeRoles, show);
	app.post('/user/register', verifyAuthToken, administrativeRoles, create);
	app.post('/user/:users_id', verifyAuthToken, administrativeRoles, destroy);
	app.post('/users/:users_id', verifyAuthToken, administrativeRoles, active);
	app.post('/login', authenticate); // Hace la autenticación de nuestras credenciales
	app.post('/api/auth/login', authenticate);
};

export default userRoutes;
