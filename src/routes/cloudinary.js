import express from 'express'
import { cloudinarySignature } from '../controllers/cloudinary.js'

const router = express.Router()
router.post('/cloudinary-signature', cloudinarySignature)
export default router