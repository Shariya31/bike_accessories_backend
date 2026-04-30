import express from 'express'
import { config } from "dotenv";
import cors from "cors"
import { connectDB } from './utils/feature.js';
import { errorMiddleware } from './middlewares/error.js';
import cookieParser from 'cookie-parser';

// importing routes
import authRoutes from './routes/auth.js'
import cloudinaryRoutes from './routes/cloudinary.js'
import mediaRoutes from './routes/media.js'
import categoryRoutes from './routes/category.js'
import productRoutes from './routes/product.js'

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
app.use('/api/v1/cloud', cloudinaryRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/category', categoryRoutes);
app.use('/api/v1/product', productRoutes);

app.use(errorMiddleware);

app.listen(port, () => {
    console.log(`App is running on port http://localhost:${port}`)
})