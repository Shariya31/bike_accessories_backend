import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isAuthorized } from '../middlewares/isAuthorized.js'
import { ROLES } from '../constants/roles.js'
import { createProduct } from '../controllers/product.js'


const router = express()
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createProduct)

export default router