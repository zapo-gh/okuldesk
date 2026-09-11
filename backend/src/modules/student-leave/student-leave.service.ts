import prisma from '../shared/utils/prisma';

export const getAllLeaves = async (academicYear?: string) => {
  return await prisma.studentLeave.findMany({
    where: {
      deletedAt: null,
      ...(academicYear && { academicYear }),
    },
    include: {
      student: {
        select: {
          fullName: true,
          className: true,
          schoolNumber: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

export const getLeavesByStudent = async (studentId: string) => {
  return await prisma.studentLeave.findMany({
    where: {
      studentId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

export const createLeave = async (data: {
  studentId: string;
  dateRanges: any[];
  reason?: string;
  academicYear: string;
}) => {
  return await prisma.studentLeave.create({
    data: {
      studentId: data.studentId,
      dateRanges: JSON.stringify(data.dateRanges),
      reason: data.reason,
      academicYear: data.academicYear
    },
    include: {
      student: {
        select: {
          fullName: true,
          className: true,
          schoolNumber: true,
        }
      }
    }
  });
};

export const deleteLeave = async (id: string) => {
  return await prisma.studentLeave.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};
