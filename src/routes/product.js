import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isAuthorized } from '../middlewares/isAuthorized.js'
import { ROLES } from '../constants/roles.js'
import { createProduct, deleteProduct, exportProduct, getAllProduct, getProductById, updateProduct, updateProductStatus } from '../controllers/product.js'

const router = express()
router.get('/', isAuthenticated, isAuthorized(ROLES.ADMIN), getAllProduct)
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createProduct)
router.put('/update-status', isAuthenticated, isAuthorized(ROLES.ADMIN), updateProductStatus);
router.delete('/delete', isAuthenticated, isAuthorized(ROLES.ADMIN), deleteProduct)
router.get('/get-product/:id', isAuthenticated, isAuthorized(ROLES.ADMIN), getProductById)
router.put('/update', isAuthenticated, isAuthorized(ROLES.ADMIN), updateProduct)
router.get('/export', isAuthenticated, isAuthorized(ROLES.ADMIN), exportProduct)
export default router