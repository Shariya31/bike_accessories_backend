import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';
import { createCategory } from '../controllers/category.js';

const router =  express();

router.post('/create', isAuthenticated, isAuthorized(ROLES.ADMIN), createCategory)

export default router