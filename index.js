import express from 'express';
import cors from 'cors';
import bcrypt from "bcrypt"
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";

import schemaUser from "./schemaUser.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient(process.env.MONGO_URI);
await mongoClient.connect()
const db = mongoClient.db(process.env.DATABASE);

app.post('/signup', async (req, res) => {
    const { name, email, password, confirmPassword, isTeacher, school } = req.body;
    const hashSenha = bcrypt.hashSync(password, 10)
    try {
        const isUserExistOnList = await db.collection("users").findOne({email:email}); //verifica se ja tem usuario
        if (isUserExistOnList) {
            return res.status(409).send("email já cadastrado");
        }
        const validation = await schemaUser.validateAsync({
            name: name,
            email: email,
            password: password,
            confirmPassword: confirmPassword,
            isTeacher:isTeacher,
            school:school
        });
        if (!validation.error) {
            await db.collection("users").insertOne({
                name: name,
                email: email,
                password: hashSenha,
                isTeacher:isTeacher,
                school:school
            });
        } else {
            console.log(validation.error.details)
            //return res.sendStatus(402);
            return res.status(402).send(validation.error.details.map(detail=>detail.message));
        }
        res.status(201).send("Usuario cadastrado com sucesso");
    } catch (e) {
        console.error(e);
        res.sendStatus(422);
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.collection('users').findOne({ email: email }); //encontra usuario
        if (user && bcrypt.compareSync(password, user.password)) {
            const sessao = await db.collection("sessions").insertOne({
                userId: user._id,
            })
            //console.log(sessao.insertedId)
            const sessionId = { session: sessao.insertedId };
            const secretKey = process.env.JWT_SECRET;

            const configurationJwt = {expiresIn: 60*60*24*30 } //30dias em segundos
            const token = jwt.sign(sessionId, secretKey, configurationJwt);
            await db.collection("sessions").updateOne({_id: sessao.insertedId}, {$set: {'token': token}})
            let resposta={token:token, name:user.name}
            res.send(resposta);
        } else {
            console.log("usuario nao encontrado ou senha incorreta")
            res.sendStatus(404);
        }
    } catch (e) {
        console.error("Banco de dados nao foi conectado, tente novamente" + e);
        res.sendStatus(422);
    }
});

app.delete("/logout", async (req,res) => {
    const { authorization } = req.headers;
    const token = authorization?.replace('Bearer ', '');
    const secretKey = process.env.JWT_SECRET;
    if (!token) {
            return res.status(401).send("Sem token");
    } else {
        try {
            const sessionId = jwt.verify(token, secretKey);
            await mongoClient.connect()
            const db = mongoClient.db(process.env.DATABASE);
            console.log(sessionId)
            const del = await db.collection("sessions").deleteOne({_id:new ObjectId(sessionId.session)}, (err) => {
                if(err) {
                    return res.sendStatus(400)
                } else {
                    return res.sendStatus(204)
                }
            })
        } catch (e) {
            console.error("token invalido" + e);
            return res.sendStatus(422);
        }
    }
});

app.post('/subjects', async(req,res) => {
    try{
        await db.collection('subjects').insertOne({
            subject: req.body.subject
        })
        res.sendStatus(201);
    }catch (e) {
        console.log('deu ruim');
    }
}) ;


app.get('/subjects', async(req,res) => {
    try{
        const subjects = await db.collection('subjects').find().toArray();
        res.status(200).send(subjects);
    }catch (e) {
        console.log(e);
        return res._construct.sendStatus(500);
    }
}) ;

async function validateUser(req,res,next){
    try{
        const { authorization } = req.headers;
        const token = authorization?.replace('Bearer ', '');
        const secretKey = process.env.JWT_SECRET;
        const sessionId = jwt.verify(token, secretKey);
	    //console.log(sessionId.session) //sessionId.session mostra o conteudo que veio com o token, q é o id da sessao do usuario.
        const {userId} = await db.collection("sessions").findOne({_id: new ObjectId(sessionId.session)})
        //console.log(userId);
        const user = await db.collection("users").findOne({_id: userId});
        if(user){
            delete user.password;
            res.locals.userData = user;
            next();
        } else {
            return res.status(404).send("Usuario nao encontrado");
        }
    } catch (e){
        console.log(e);
        return res.sendStatus(500);
    }
}

app.post("/subject/:idSubject/questions", validateUser, async (req, res) => {
    const {title, question} = req.body
    const {idSubject} = req.params
    if(!idSubject || !title || !question){
        return res.status(422).send("Dados obrigatorios nao enviados")
    }
    try {
        const subject = await db.collection("subjects").findOne({_id: new ObjectId(idSubject)});
        if (!subject) return res.status(404).send("Disciplina nao encontrada");
        const {userData} = res.locals
        let date = dayjs().format("YYYY-MM-DD HH:mm").toString()
        await db.collection("questions").insertOne({
            userId: userData._id,
            username: userData.name,
            subject: subject.subject,
            title: title,
            question: question,
            createdDate: date,
            answered: false
        })
        return res.status(201).send("")
    } catch (e) {
        console.error("token invalido" + e);
        return res.sendStatus(422);
    }
});

app.post("/questions/:id/answers", validateUser, async (req, res) => {
    const {title, question} = req.body
    const {idSubject} = req.params
    if(!idSubject || !title || !question){
        return res.status(422).send("Dados obrigatorios nao enviados")
    }
    try {
        const subject = await db.collection("subjects").findOne({_id: new ObjectId(idSubject)});
        if (!subject) return res.status(404).send("Disciplina nao encontrada");
        const {userData} = res.locals
        let date = dayjs().format("YYYY-MM-DD HH:mm").toString()
        await db.collection("questions").insertOne({
            userId: userData._id,
            username: userData.name,
            subject: subject.subject,
            title: title,
            question: question,
            createdDate: date,
            answered: false
        })
        return res.status(201).send("")
    } catch (e) {
        console.error("token invalido" + e);
        return res.sendStatus(422);
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("Back-end funcionando, nao esquece de desligar")
});
