import express, { Request, Response } from 'express';
import verifyAuthToken from '../middlewares/auth';
import { User, UserStore } from '../models/users';
import jwt, { Secret } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config()

const store = new UserStore();

const index = async (_req: Request, res: Response) => {
    try {
        const users = await store.index();
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json(error)
    }
};

const show = async (req: Request, res: Response) => {
    try {
        const user = await store.show(req.params.user_id);
        res.json(user);
    } catch (error) {
        res.status(400).json(error);
    }
};

const create = async (req: Request, res: Response) => {
	try {
        const body = req.body;
		const user: User = {
			firstname: body.firstname,
			lastname: body.lastname,
			username: body.username,
            password: body.password,
            dob: body.dob,
            role_id: body.role_id
        };
        const newUser = await store.create(user);
		res.status(201).json(newUser);
	} catch (error) {
		res.status(400).json(error);
	}
};

const destroy = async (req: Request, res: Response) =>{
    try {
        const user = await store.delete(req.params.user_id);
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json(error);        
    }
}

const authenticate = async (req: Request, res: Response) => {
	const user: User = {
		username: req.body.username,
		password: req.body.password,
	};
	try {
		const u = await store.authenticate(user.username, user.password);
		const token = jwt.sign({ user: u }, process.env.TOKEN_SECRET as Secret);
		res.json(token);
	} catch (error) {
		res.status(401).json({ error });
	}
};

const userRoutes = (app: express.Application): void => {
    app.get('/users', index);
    app.get('/users/:user_id', show);
    app.post('/user/register', create);
    app.delete('/user/:user_id', destroy);
    app.post('/user/login', authenticate);
}

export default userRoutes;
