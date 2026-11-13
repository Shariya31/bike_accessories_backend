import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js'
import { isAuthorized } from '../middlewares/isAuthorized.js'
import { ROLES } from '../constants/roles.js'
import { createProductVariant, deleteProductVariant, exportProductVariant, getAllProductVariant, getProductVariantById, updateProductVariant, updateProductVariantStatus } from '../controllers/product-variant.js'


const router = express()
router.get('/',  getAllProductVariant)
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createProductVariant)
router.put('/update-status', isAuthenticated, isAuthorized(ROLES.ADMIN), updateProductVariantStatus);
router.delete('/delete', isAuthenticated, isAuthorized(ROLES.ADMIN), deleteProductVariant)
router.get('/get-product-variant/:id', isAuthenticated, isAuthorized(ROLES.ADMIN), getProductVariantById)
router.put('/update', isAuthenticated, isAuthorized(ROLES.ADMIN), updateProductVariant)
router.get('/export', isAuthenticated, isAuthorized(ROLES.ADMIN), exportProductVariant)
export default router