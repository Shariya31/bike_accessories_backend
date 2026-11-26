import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';
import { getAllCustomers } from '../controllers/customers.js';

const router = express();
router.get('/',  isAuthenticated, isAuthorized(ROLES.ADMIN), getAllCustomers)

export default router;