import prisma from '../utils/prisma';
import { v4 as uuid } from 'uuid';

// ── Yıllık Çalışma Planı ──
class AnnualPlanService {
  async getAll(academicYear: string) {
    return prisma.annualPlanItem.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }]
    });
  }
  async create(d: { academicYear: string; month: number; title: string; description?: string; category?: string; sortOrder?: number; extraData?: string }) {
    return prisma.annualPlanItem.create({
      data: {
        id: uuid(),
        academicYear: d.academicYear,
        month: d.month,
        title: d.title.trim(),
        description: d.description || null,
        category: d.category || 'IDARI',
        sortOrder: d.sortOrder ?? 0,
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.annualPlanItem.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.annualPlanItem.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Belirli Gün ve Haftalar ──
class CommemorativeDaysService {
  async getAll(academicYear: string) {
    const records = await prisma.commemorativeDay.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { startDate: 'asc' },
      include: {
        assignedStaff: { select: { name: true } },
        assignedClub: { select: { name: true } }
      }
    });
    return records.map((r: any) => ({
      ...r,
      assignedStaffName: r.assignedStaff?.name || null,
      assignedClubName: r.assignedClub?.name || null
    }));
  }
  async create(data: { name: string; startDate: string; endDate: string; academicYear: string; description?: string; assignedStaffId?: string; assignedClubId?: string; status?: string; extraData?: string }) {
    return prisma.commemorativeDay.create({
      data: {
        id: uuid(),
        name: data.name.trim(),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        academicYear: data.academicYear,
        description: data.description || null,
        assignedStaffId: data.assignedStaffId || null,
        assignedClubId: data.assignedClubId || null,
        status: data.status || 'PLANLI',
        extraData: data.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.commemorativeDay.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.commemorativeDay.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Sosyal Etkinlik ──
class SocialActivityService {
  async getAll(academicYear: string) {
    const records = await prisma.socialActivity.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { plannedDate: 'asc' },
      include: {
        assignedStaff: { select: { name: true } }
      }
    });
    return records.map((r: any) => ({
      ...r,
      assignedStaffName: r.assignedStaff?.name || null
    }));
  }
  async create(d: { name: string; type?: string; description?: string; plannedDate?: string; academicYear: string; assignedStaffId?: string; status?: string; notes?: string; extraData?: string }) {
    return prisma.socialActivity.create({
      data: {
        id: uuid(),
        name: d.name.trim(),
        type: d.type || 'KULTUREL',
        description: d.description || null,
        plannedDate: d.plannedDate ? new Date(d.plannedDate) : null,
        academicYear: d.academicYear,
        assignedStaffId: d.assignedStaffId || null,
        status: d.status || 'PLANLI',
        notes: d.notes || null,
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.socialActivity.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.socialActivity.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Okul Aile Birliği ──
class ParentAssociationService {
  async getMeetings(academicYear: string) {
    return prisma.parentAssociationMeeting.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { date: 'desc' }
    });
  }
  async createMeeting(d: { date: string; type?: string; meetingNumber?: number; academicYear: string; notes?: string; decisions?: string; extraData?: string }) {
    return prisma.parentAssociationMeeting.create({
      data: {
        id: uuid(),
        date: d.date ? new Date(d.date) : null,
        type: d.type || 'OLAGAN',
        meetingNumber: d.meetingNumber ?? 1,
        academicYear: d.academicYear,
        notes: d.notes || null,
        decisions: d.decisions || null,
        extraData: d.extraData || null
      }
    });
  }
  async updateMeeting(id: string, data: Record<string, any>) {
    return prisma.parentAssociationMeeting.update({ where: { id }, data });
  }
  async deleteMeeting(id: string) {
    return prisma.parentAssociationMeeting.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getMembers(academicYear: string) {
    return prisma.parentAssociationMember.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }]
    });
  }
  async createMember(d: { fullName: string; role?: string; phone?: string; academicYear: string; extraData?: string }) {
    return prisma.parentAssociationMember.create({
      data: {
        id: uuid(),
        fullName: d.fullName.trim(),
        role: d.role || 'UYE',
        phone: d.phone || null,
        academicYear: d.academicYear,
        extraData: d.extraData || null
      }
    });
  }
  async updateMember(id: string, data: Record<string, any>) {
    return prisma.parentAssociationMember.update({ where: { id }, data });
  }
  async deleteMember(id: string) {
    return prisma.parentAssociationMember.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Gezi Planı ──
class FieldTripService {
  async getAll(academicYear: string) {
    const records = await prisma.fieldTrip.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { date: 'asc' },
      include: {
        assignedStaff: { select: { name: true } }
      }
    });
    return records.map((r: any) => ({
      ...r,
      assignedStaffName: r.assignedStaff?.name || null
    }));
  }
  async create(d: Record<string, any>) {
    return prisma.fieldTrip.create({
      data: {
        id: uuid(),
        title: d.title,
        destination: d.destination,
        date: d.date ? new Date(d.date) : null,
        returnDate: d.returnDate ? new Date(d.returnDate) : null,
        purpose: d.purpose || null,
        transportation: d.transportation || null,
        assignedStaffId: d.assignedStaffId || null,
        academicYear: d.academicYear,
        participantClasses: d.participantClasses || null,
        notes: d.notes || null,
        status: d.status || 'PLANLI',
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.fieldTrip.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.fieldTrip.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Ders Dışı Egzersiz ──
class ExtracurricularService {
  async getAll(academicYear: string) {
    const records = await prisma.extracurricular.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { branch: 'asc' },
      include: {
        assignedStaff: { select: { name: true } }
      }
    });
    return records.map((r: any) => ({
      ...r,
      assignedStaffName: r.assignedStaff?.name || null
    }));
  }
  async create(d: { branch: string; assignedStaffId?: string; schedule?: string; academicYear: string; notes?: string; extraData?: string }) {
    return prisma.extracurricular.create({
      data: {
        id: uuid(),
        branch: d.branch.trim(),
        assignedStaffId: d.assignedStaffId || null,
        schedule: d.schedule || null,
        academicYear: d.academicYear,
        notes: d.notes || null,
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.extracurricular.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.extracurricular.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Yolluk Hesaplama ──
class TravelAllowanceService {
  async getAll(academicYear: string) {
    const records = await prisma.travelAllowance.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { departureDate: 'desc' },
      include: {
        staff: { select: { name: true } }
      }
    });
    return records.map((r: any) => ({
      ...r,
      staffName: r.staff?.name || null
    }));
  }
  async create(d: Record<string, any>) {
    const total = (Number(d.transportCost) || 0) + (Number(d.dailyAllowance) || 0) + (Number(d.accommodationCost) || 0);
    return prisma.travelAllowance.create({
      data: {
        id: uuid(),
        staffId: d.staffId || null,
        title: d.title || null,
        purpose: d.purpose,
        departurePlace: d.departurePlace,
        arrivalPlace: d.arrivalPlace,
        departureDate: d.departureDate,
        returnDate: d.returnDate,
        transportType: d.transportType || 'OTOBÜS',
        transportCost: d.transportCost || 0,
        dailyAllowance: d.dailyAllowance || 0,
        accommodationCost: d.accommodationCost || 0,
        totalCost: total,
        academicYear: d.academicYear,
        notes: d.notes || null,
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    if (data.transportCost !== undefined || data.dailyAllowance !== undefined || data.accommodationCost !== undefined) {
      data.totalCost = (Number(data.transportCost) || 0) + (Number(data.dailyAllowance) || 0) + (Number(data.accommodationCost) || 0);
    }
    return prisma.travelAllowance.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.travelAllowance.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Personel Nakil Bildirimi ──
class StaffTransferService {
  async getAll(academicYear: string) {
    return prisma.staffTransfer.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { transferDate: 'desc' }
    });
  }
  async create(d: Record<string, any>) {
    return prisma.staffTransfer.create({
      data: {
        id: uuid(),
        staffName: d.staffName,
        staffTitle: d.staffTitle || null,
        tcKimlikNo: d.tcKimlikNo || null,
        sicilNo: d.sicilNo || null,
        currentSchool: d.currentSchool || null,
        newSchool: d.newSchool || null,
        transferDate: d.transferDate,
        transferReason: d.transferReason || null,
        academicYear: d.academicYear,
        notes: d.notes || null,
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.staffTransfer.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.staffTransfer.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Öğrenci Kulüpleri ──
class StudentClubService {
  async getAll(academicYear: string) {
    const clubs = await prisma.studentClub.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { members: true } }
      }
    });
    return clubs.map((c: any) => ({
      ...c,
      memberCount: c._count?.members || 0
    }));
  }
  async create(d: { name: string; description?: string; assignedStaffId?: string; meetingDay?: string; meetingTime?: string; maxMembers?: number; academicYear: string; extraData?: string }) {
    return prisma.studentClub.create({
      data: {
        id: uuid(),
        name: d.name.trim(),
        description: d.description || null,
        assignedStaffId: d.assignedStaffId || null,
        meetingDay: d.meetingDay || null,
        meetingTime: d.meetingTime || null,
        maxMembers: d.maxMembers ?? 30,
        academicYear: d.academicYear,
        extraData: d.extraData || null
      }
    });
  }
  async update(id: string, data: Record<string, any>) {
    return prisma.studentClub.update({ where: { id }, data });
  }
  async delete(id: string) {
    return prisma.studentClub.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Üyeler
  async getMembers(clubId: string) {
    const members = await prisma.studentClubMember.findMany({
      where: { clubId },
      include: {
        student: { select: { fullName: true, className: true } }
      },
      orderBy: [{ role: 'asc' }, { student: { fullName: 'asc' } }]
    });
    return members.map((m: any) => ({
      ...m,
      studentName: m.student?.fullName || null,
      className: m.student?.className || null
    }));
  }
  async addMember(d: { clubId: string; studentId: string; role?: string }) {
    // INSERT OR IGNORE mantığını unique constraint var kabul ederek veya upsert ile yapabiliriz.
    // Şimdilik findFirst ve Create ile yapıyoruz.
    const exists = await prisma.studentClubMember.findFirst({
      where: { clubId: d.clubId, studentId: d.studentId }
    });
    if (exists) return exists;

    return prisma.studentClubMember.create({
      data: {
        id: uuid(),
        clubId: d.clubId,
        studentId: d.studentId,
        role: d.role || 'UYE'
      }
    });
  }
  async removeMember(id: string) {
    return prisma.studentClubMember.delete({ where: { id } });
  }
}

export const annualPlanService = new AnnualPlanService();
export const commemorativeDaysService = new CommemorativeDaysService();
export const socialActivityService = new SocialActivityService();
export const parentAssociationService = new ParentAssociationService();
export const fieldTripService = new FieldTripService();
export const extracurricularService = new ExtracurricularService();
export const travelAllowanceService = new TravelAllowanceService();
export const staffTransferService = new StaffTransferService();
export const studentClubService = new StudentClubService();
