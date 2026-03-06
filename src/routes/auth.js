import express from 'express'
import { login, register, verifyEmail } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', register)
router.post('/login', login)
router.post('/verify-email', verifyEmail)

export default router