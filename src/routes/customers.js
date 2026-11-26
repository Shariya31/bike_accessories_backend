import express from 'express'
import { isAuthenticated } from '../middlewares/isAuthenticated.js';
import { isAuthorized } from '../middlewares/isAuthorized.js';
import { ROLES } from '../constants/roles.js';
import { deleteCustomers, exportCustomers, getAllCustomers, updateCustomersStatus } from '../controllers/customers.js';

const router = express();
router.get('/',  isAuthenticated, isAuthorized(ROLES.ADMIN), getAllCustomers)
router.delete('/delete', isAuthenticated, isAuthorized(ROLES.ADMIN), deleteCustomers)
router.put('/update-status', isAuthenticated, isAuthorized(ROLES.ADMIN), updateCustomersStatus);
router.get('/export', isAuthenticated, isAuthorized(ROLES.ADMIN), exportCustomers)

export default router;