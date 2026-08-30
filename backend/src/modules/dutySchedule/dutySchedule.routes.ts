import { Router } from 'express';
import { dutyScheduleController } from './dutySchedule.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Stations
router.get('/stations', (req, res, next) => dutyScheduleController.getStations(req, res, next));
router.post('/stations', (req, res, next) => dutyScheduleController.createStation(req, res, next));
router.put('/stations/:id', (req, res, next) => dutyScheduleController.updateStation(req, res, next));
router.delete('/stations/:id', (req, res, next) => dutyScheduleController.deleteStation(req, res, next));

// Assignments
router.get('/assignments', (req, res, next) => dutyScheduleController.getAssignments(req, res, next));
router.post('/assignments', (req, res, next) => dutyScheduleController.bulkSaveAssignments(req, res, next));

// Staff Config
router.get('/staff-config', (req, res, next) => dutyScheduleController.getStaffConfigs(req, res, next));
router.post('/staff-config', (req, res, next) => dutyScheduleController.bulkSaveStaffConfigs(req, res, next));

// Stats
router.get('/stats', (req, res, next) => dutyScheduleController.getMonthlyStats(req, res, next));

// Auto Distribute
router.post('/auto-distribute', (req, res, next) => dutyScheduleController.autoDistribute(req, res, next));

export default router;
