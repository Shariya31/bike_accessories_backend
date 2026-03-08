import express from 'express'
import { config } from "dotenv";
import cors from "cors"
import { connectDB } from './utils/feature.js';
import { errorMiddleware } from './middlewares/error.js';
import cookieParser from 'cookie-parser';

// importing routes
import authRoutes from './routes/auth.js'
config({
    path: "./.env"
})

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI || ""
connectDB(mongoURI)

const app = express();

app.use(express.json())
app.use(cookieParser());
app.use(cors({
    origin: process.env.PUBLIC_BASE_URL,
    credentials: true
}))

app.get('/', (req, res) => {
    res.send('running')
})

// using routes
app.use('/api/v1/auth', authRoutes);

app.use(errorMiddleware);

app.listen(port, () => {
    console.log(`App is running on port http://localhost:${port}`)
})