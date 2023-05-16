import express, { Request, Response } from 'express';
import verifyAuthToken from '../middlewares/auth';
import { Message_users, Message_usersStore } from '../models/message_users';

const store = new Message_usersStore();

const index = async (_req: Request, res: Response)=>{
    try {
        const message_users = await store.index();
        res.status(200).json(message_users);
    } catch (error) {
        res.status(400).json(error)
    }
}

const show = async (req: Request, res: Response) => {
    try {
        const message_users_id = await store.show(req.params.message_users_id);
        res.json(message_users_id);
    } catch (error) {
        res.status(400).json(error);
    }
};

const showNewMessage = async (req:Request, res: Response) => {
    try{
        const message_users_id = await store.showNewMessage(req.params.message_users_id);
        res.json(message_users_id);
    }catch(error){
        res.status(400).json(error)
    }
}


const showFirstAttempt = async (req: Request, res: Response) => {
    try {
    const message = await store.showFirstAttempt();
        res.status(200).json(message);
    } catch (error){
        res.status(400).json(error);
    }
}

const showSecondAttempt = async (req: Request, res: Response) => {
    try {
    const message = await store.showSecondAttempt();
        res.status(200).json(message);
    } catch (error){
        res.status(400).json(error);
    }
}

const showInProcess = async (req: Request, res: Response) => {
    try {
        const message = await store.showInProcess();
        res.status(200).json(message);
    } catch (error){
        res.status(400).json(error);
    }
}

const showAttended = async (req: Request, res: Response) => {
    try {
        const message = await store.showAttended();
        res.status(200).json(message);
    } catch (error){
        res.status(400).json(error);
    }
}

const showNoContact = async (req: Request, res: Response) => {
    try {
        const message = await store.showNoContact();
        res.status(200).json(message);
    } catch (error){
        res.status(400).json(error);
    }
}

const create = async (req: Request, res: Response) => {
    try {
        const message_id = parseInt(req.params.message_id);
        const status_id = parseInt(req.params.status_id);
        const user_id = parseInt(req.params.user_id);

        const newMessage_users = await store.create(message_id, status_id, user_id);
        res.status(201).json(newMessage_users);
    } catch (error) {
        res.status(400).json(error)
    }
}


const edit = async (req: Request, res: Response) => {
    try {
        const message_user: Message_users = {
            message_users_id: req.body.message_users_id,
            status_id: req.body.status_id,
            user_id: req.body.user_id
        }
        const messageUser = await store.edit(message_user);
        console.log(messageUser);
        res.status(200).json(messageUser);
    } catch (error) {
        res.status(400).json(error)
    }
}

const getMessageUser = async (req: Request, res: Response) => {
    try{
        const message_id = await store.getMessageUser(req.params.message_id);
        res.status(200).json(message_id);
    }catch (error){
        res.status(400).json(error);
    }
}

const message_usersRoutes = (app: express.Application): void => {
    app.get('/messageusers', verifyAuthToken, index); // Muestra todos los mensajes modificados por su status
    app.get('/messageusers/:message_users_id', verifyAuthToken, show);
    app.get('/messageuser-newMessage/:message_users_id', verifyAuthToken, showNewMessage);    
    app.get('/message-users/showfirstattempt', verifyAuthToken, showFirstAttempt); //Primer intento de contacto con el paciente
    app.get('/message-users/showsecondattempt', verifyAuthToken, showSecondAttempt); //Segundo intento de contacto con el paciente
    app.get('/message-users/showinprocess', verifyAuthToken, showInProcess); //Mensaje en proceso de atención
    app.get('/message-users/showattended', verifyAuthToken, showAttended); //Mensaje atendido
    app.get('/message-users/shownocontact', verifyAuthToken, showNoContact); //No se logró tener contacto con el paciente
    app.put('/message-users/edit', verifyAuthToken, edit); //Nos ayuda a modificar el status de cada paciente
    app.post('/message-users/:message_id/:status_id/:user_id', verifyAuthToken, create);
    app.get('/message-user-Message/:message_id', verifyAuthToken, getMessageUser);
}

export default message_usersRoutes;