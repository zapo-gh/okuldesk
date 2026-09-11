import { Request, Response } from 'express';
import * as service from './student-leave.service';

export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const { academicYear } = req.query;
    const leaves = await service.getAllLeaves(academicYear as string);
    res.json({ success: true, data: leaves });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLeavesByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const leaves = await service.getLeavesByStudent(studentId);
    res.json({ success: true, data: leaves });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLeave = async (req: Request, res: Response) => {
  try {
    const leave = await service.createLeave(req.body);
    res.status(201).json({ success: true, data: leave });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await service.deleteLeave(id);
    res.json({ success: true, message: 'İzin kaydı başarıyla silindi.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
