import express from 'express'
import { login, register, resendOtp, verifyEmail, verifyOtp } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', register)
router.post('/login', login)
router.post('/verify-email', verifyEmail)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)

export default router