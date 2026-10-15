import { Router } from 'express';
import {
  getAllLeaves,
  getLeavesByStudent,
  createLeave,
  deleteLeave
} from './student-leave.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('parent-leave'));

router.get('/', getAllLeaves);
router.get('/student/:studentId', getLeavesByStudent);
router.post('/', createLeave);
router.delete('/:id', deleteLeave);

export default router;
