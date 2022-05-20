import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const mongoClient = new MongoClient(process.env.MONGO_URI);

app.get("/teste", async (req, res) => {
    console.log("oi")
    let nome = "to no banco mae"
    try {
        await mongoClient.connect()
        const db = mongoClient.db(process.env.DATABASE);
        await db.collection("users").insertOne({
            nome: nome,
        });
        return res.status(201).send("Tudo certo")
    }catch{
        return res.status(404)
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log("Back-end funcionando, nao esquece de desligar")
});
