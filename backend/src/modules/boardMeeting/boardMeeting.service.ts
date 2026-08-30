import prisma from '../shared/utils/prisma';

class BoardMeetingService {
  async getAll(academicYear: string) {
    return prisma.boardMeeting.findMany({
      where: { academicYear },
      orderBy: { date: 'desc' }
    });
  }

  async getById(id: string) {
    return prisma.boardMeeting.findUnique({
      where: { id }
    });
  }

  async create(data: any) {
    const { type, meetingNumber, ...validData } = data;
    return prisma.boardMeeting.create({ data: validData });
  }

  async update(id: string, data: any) {
    const { type, meetingNumber, ...validData } = data;
    return prisma.boardMeeting.update({ where: { id }, data: validData });
  }

  async delete(id: string) {
    return prisma.boardMeeting.delete({ where: { id } });
  }

  // ── Gündem Maddeleri ── (Eski endpointleri bozmamak için tutuldu)
  async addAgendaItem(data: any) {
    return prisma.boardAgendaItem.create({ data });
  }

  async updateAgendaItem(id: string, data: any) {
    return prisma.boardAgendaItem.update({ where: { id }, data });
  }

  async deleteAgendaItem(id: string) {
    return prisma.boardAgendaItem.delete({ where: { id } });
  }
}

export const boardMeetingService = new BoardMeetingService();
