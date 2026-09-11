import { Router } from 'express';
import {
  getAllLeaves,
  getLeavesByStudent,
  createLeave,
  deleteLeave
} from './student-leave.controller';

const router = Router();

router.get('/', getAllLeaves);
router.get('/student/:studentId', getLeavesByStudent);
router.post('/', createLeave);
router.delete('/:id', deleteLeave);

export default router;
