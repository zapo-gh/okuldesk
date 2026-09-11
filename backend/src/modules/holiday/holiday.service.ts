import prisma from '../shared/utils/prisma';
import { v4 as uuid } from 'uuid';

class HolidayService {
  async getAll(academicYear: string) {
    return prisma.holiday.findMany({
      where: {
        academicYear,
        deletedAt: null
      },
      orderBy: {
        startDate: 'asc'
      }
    });
  }

  async create(data: { name: string; startDate: string; endDate: string; academicYear: string; isRecurring?: boolean }) {
    const extraData = JSON.stringify({ isRecurring: !!data.isRecurring });
    return prisma.holiday.create({
      data: {
        name: data.name.trim(),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        academicYear: data.academicYear,
        extraData
      }
    });
  }

  async update(id: string, data: Partial<{ name: string; startDate: string; endDate: string; isRecurring: boolean }>) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.isRecurring !== undefined) updateData.extraData = JSON.stringify({ isRecurring: !!data.isRecurring });

    if (Object.keys(updateData).length === 0) return;

    await prisma.holiday.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    await prisma.holiday.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async seedDefaults(academicYear: string) {
    const count = await prisma.holiday.count({
      where: { academicYear, deletedAt: null }
    });
    if (count > 0) return;

    const defaults = [
      { name: '29 Ekim Cumhuriyet Bayramı', start: '10-29', end: '10-29' },
      { name: '10 Kasım Atatürk\'ü Anma', start: '11-10', end: '11-10' },
      { name: '24 Kasım Öğretmenler Günü', start: '11-24', end: '11-24' },
      { name: 'Yılbaşı Tatili', start: '01-01', end: '01-01' },
      { name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', start: '04-23', end: '04-23' },
      { name: '1 Mayıs Emek ve Dayanışma Günü', start: '05-01', end: '05-01' },
      { name: '19 Mayıs Gençlik ve Spor Bayramı', start: '05-19', end: '05-19' },
      { name: '15 Temmuz Demokrasi ve Milli Birlik Günü', start: '07-15', end: '07-15' },
      { name: '30 Ağustos Zafer Bayramı', start: '08-30', end: '08-30' },
    ];

    const [startYear, endYear] = academicYear.split('-').map(Number);
    const createManyData = defaults.map(d => {
      const [mm] = d.start.split('-').map(Number);
      const year = mm >= 9 ? startYear : endYear;
      return {
        name: d.name,
        startDate: new Date(`${year}-${d.start}T00:00:00.000Z`),
        endDate: new Date(`${year}-${d.end}T00:00:00.000Z`),
        academicYear,
        extraData: JSON.stringify({ isRecurring: true })
      };
    });

    await prisma.holiday.createMany({
      data: createManyData
    });
  }
}

export const holidayService = new HolidayService();
