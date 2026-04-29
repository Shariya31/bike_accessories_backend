import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';
import { createCategory, deleteCategory, exportCategory, getAllCategory, getCategoryById, updateCategory, updateCategoryStatus } from '../controllers/category.js';

const router =  express();

router.get('/', isAuthenticated, isAuthorized(ROLES.ADMIN), getAllCategory);
router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createCategory);
router.put('/update-status', isAuthenticated, isAuthorized(ROLES.ADMIN), updateCategoryStatus);
router.delete('/delete', isAuthenticated, isAuthorized(ROLES.ADMIN), deleteCategory)
router.get('/get-category/:id', isAuthenticated, isAuthorized(ROLES.ADMIN), getCategoryById)
router.put('/update', isAuthenticated, isAuthorized(ROLES.ADMIN), updateCategory)
router.get('/export', isAuthenticated, isAuthorized(ROLES.ADMIN), exportCategory)
export default router