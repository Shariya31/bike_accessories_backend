import express from 'express'
import { googleAuth, login, register, resendOtp, sendOtp, updatePassword, verifyEmail, verifyOtp, verifyResetOtp } from '../controllers/auth.js';

const router = express.Router();

router.post('/register', register)
router.post('/login', login)
router.post('/verify-email', verifyEmail)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/reset-password/send-otp', sendOtp)
router.post('/reset-password/verify-otp', verifyResetOtp)
router.put('/reset-password/update-password', updatePassword)
router.post("/google", googleAuth);
export default router