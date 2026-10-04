import express from 'express';
import { listMyFarmers, suspendFarmer, reactivateFarmer, removeFarmer } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));
router.get('/farmers', listMyFarmers);
router.patch('/farmers/:id/suspend', suspendFarmer);
router.patch('/farmers/:id/reactivate', reactivateFarmer);
router.delete('/farmers/:id', removeFarmer);

export default router;
