import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isAuthorized } from '../middlewares/isAuthorized.js'
import { ROLES } from '../constants/roles.js'
import { createProduct, getAllProduct } from '../controllers/product.js'

const router = express()
router.get('/', isAuthenticated, isAuthorized(ROLES.ADMIN), getAllProduct)
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createProduct)

export default router