import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

class DutyScheduleService {
  // ── Nöbet Noktaları ──
  async getStations() {
    const stations = await prisma.dutyStation.findMany({
      where: { isActive: 1 },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
    return stations;
  }

  async createStation(data: { name: string; sortOrder?: number; shift?: string; capacity?: number }) {
    return prisma.dutyStation.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
        shift: data.shift ?? 'tum',
        capacity: data.capacity ?? 1
      }
    });
  }

  async updateStation(id: string, data: { name?: string; sortOrder?: number; isActive?: boolean; shift?: string; capacity?: number }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive ? 1 : 0;
    if (data.shift !== undefined) updateData.shift = data.shift;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (Object.keys(updateData).length === 0) throw new AppError('Güncellenecek alan bulunamadı.', 400);
    return prisma.dutyStation.update({ where: { id }, data: updateData });
  }

  async deleteStation(id: string) {
    return prisma.dutyStation.delete({ where: { id } });
  }

  // ── Nöbet Atamaları ──
  async getAssignments(options: { academicYear?: string; year?: number; month?: number }) {
    const where: any = {};
    if (options.academicYear) where.academicYear = options.academicYear;
    if (options.year) where.year = options.year;
    if (options.month !== undefined) where.month = options.month;

    const assignments = await prisma.dutyAssignment.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { weekNumber: 'asc' }]
    });

    // Enrich with staff name and station name
    const stationIds = [...new Set(assignments.map(a => a.stationId))];
    const staffIds = [...new Set(assignments.map(a => a.staffId))];

    const [stations, staffList] = await Promise.all([
      stationIds.length ? prisma.dutyStation.findMany({ where: { id: { in: stationIds } } }) : [],
      staffIds.length ? prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : []
    ]);

    const stationMap = new Map(stations.map(s => [s.id, s.name]));
    const staffMap = new Map(staffList.map(s => [s.id, s.name]));

    return assignments.map(a => ({
      ...a,
      staffName: staffMap.get(a.staffId) || '',
      stationName: stationMap.get(a.stationId) || ''
    }));
  }

  async bulkSaveAssignments(options: {
    academicYear: string;
    year: number;
    month: number;
    assignments: { staffId: string; stationId: string; dayOfWeek: number; weekNumber?: number }[]
  }) {
    // Mevcut ay atalamalarını sil
    await prisma.dutyAssignment.deleteMany({
      where: {
        academicYear: options.academicYear,
        year: options.year,
        month: options.month
      }
    });

    // Yeni atamaları toplu ekle
    if (options.assignments.length > 0) {
      await prisma.dutyAssignment.createMany({
        data: options.assignments.map(a => ({
          staffId: a.staffId,
          stationId: a.stationId,
          dayOfWeek: a.dayOfWeek,
          weekNumber: a.weekNumber ?? 0,
          academicYear: options.academicYear,
          year: options.year,
          month: options.month
        }))
      });
    }
  }

  // ── Personel Nöbet Konfigürasyonu ──
  async getStaffConfigs(academicYear: string) {
    return prisma.dutyStaffConfig.findMany({
      where: { academicYear }
    });
  }

  async bulkSaveStaffConfigs(academicYear: string, configs: {
    staffId: string;
    availableDays: string;
    maxPerMonth: number;
    maxPerWeek: number;
    isAdmin: boolean;
    isFixedDay?: boolean;
    fixedDayOfWeek?: number;
    isFixedStation?: boolean;
    fixedStationId?: string;
    isExempt?: boolean;
  }[]) {
    for (const c of configs) {
      await prisma.dutyStaffConfig.upsert({
        where: { staffId_academicYear: { staffId: c.staffId, academicYear } },
        update: {
          availableDays: c.availableDays,
          maxPerMonth: c.maxPerMonth,
          maxPerWeek: c.maxPerWeek,
          isAdmin: c.isAdmin,
          isFixedDay: c.isFixedDay ?? false,
          fixedDayOfWeek: c.fixedDayOfWeek ?? null,
          isFixedStation: c.isFixedStation ?? false,
          fixedStationId: c.fixedStationId ?? null,
          isExempt: c.isExempt ?? false
        },
        create: {
          staffId: c.staffId,
          academicYear,
          availableDays: c.availableDays,
          maxPerMonth: c.maxPerMonth,
          maxPerWeek: c.maxPerWeek,
          isAdmin: c.isAdmin,
          isFixedDay: c.isFixedDay ?? false,
          fixedDayOfWeek: c.fixedDayOfWeek ?? null,
          isFixedStation: c.isFixedStation ?? false,
          fixedStationId: c.fixedStationId ?? null,
          isExempt: c.isExempt ?? false
        }
      });
    }
  }

  // ── Aylık İstatistik ──
  async getMonthlyStats(year: number, month: number, academicYear: string) {
    const assignments = await prisma.dutyAssignment.findMany({
      where: { year, month, academicYear }
    });

    // Her personel için nöbet sayısını hesapla
    const countMap: Record<string, number> = {};
    assignments.forEach(a => {
      countMap[a.staffId] = (countMap[a.staffId] || 0) + 1;
    });

    const staffIds = Object.keys(countMap);
    if (!staffIds.length) return [];

    const staffList = await prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true, unvan: true }
    });

    return staffList.map(s => ({
      staffId: s.id,
      staffName: s.name,
      title: s.unvan || '',
      count: countMap[s.id] || 0
    })).sort((a, b) => b.count - a.count);
  }

  // ── Otomatik Dağıtım ──
  async autoDistribute(options: {
    year: number;
    month: number;
    academicYear: string;
    overwriteExisting: boolean;
    targetWeekNum?: number;
  }) {
    const { year, month, academicYear, targetWeekNum } = options;

    // İş günlerini hesapla (Pzt-Cum)
    let workDays = this._getWorkDays(year, month);

    // Ayarlar, nöbet yerleri ve personel konfigürasyonları
    const [settings, stations, staffConfigs] = await Promise.all([
      prisma.schoolSettings.findUnique({ where: { id: 'singleton' } }),
      this.getStations(),
      this.getStaffConfigs(academicYear)
    ]);
    
    const rotationFreq = settings?.dutyRotationFreq ?? 'weekly'; // weekly, biweekly, monthly, none

    // Öğretmen ve İdareci unvanlıları al
    let allStaff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, name: true, unvan: true, gorev: true }
    });
    
    allStaff = allStaff.filter(s => {
      const g = (s.gorev || '').toLowerCase();
      if (g === 'müdür' || g === 'müdür başyardımcısı') return false;
      return g.includes('öğretmen') || g.includes('müdür yardımcısı');
    });

    const configMap = new Map(staffConfigs.map(c => [c.staffId, c]));
    const monthlyCount: Record<string, number> = {};
    const weeklyCount: Record<string, Record<number, number>> = {};
    
    // Geçmiş (ayni ay/yil) atamaları çek
    let existingAssignments = await prisma.dutyAssignment.findMany({
      where: { academicYear, year, month }
    });
    
    // Eğer tüm ayın üzerine yazılmayacaksa, sadece hedef haftadakileri ezeceğiz.
    let newAssignments: any[] = [];
    if (targetWeekNum !== undefined) {
      newAssignments = existingAssignments.filter(a => a.weekNumber !== targetWeekNum);
    } else if (!options.overwriteExisting) {
      newAssignments = [...existingAssignments];
    }
    
    // Haftayı hesaplayan yerel fonksiyon
    const getWeekNum = (dayDate: Date) => {
      const firstDay = new Date(year, month - 1, 1);
      const diffDays = Math.floor((dayDate.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7);
    };

    // Eğer targetWeekNum verilmişse, dağıtımı sadece o haftanın günleri için yap
    if (targetWeekNum !== undefined) {
      workDays = workDays.filter(d => getWeekNum(d.date) === targetWeekNum);
    }
    
    // Limit hesaplamaları için, ZATEN YERLEŞMİŞ (korunan) atamaların adetlerini state'e ekle
    for (const a of newAssignments) {
      monthlyCount[a.staffId] = (monthlyCount[a.staffId] || 0) + 1;
      if (!weeklyCount[a.staffId]) weeklyCount[a.staffId] = {};
      weeklyCount[a.staffId][a.weekNumber] = (weeklyCount[a.staffId][a.weekNumber] || 0) + 1;
    }
    
    const sortedStations = [...stations].sort((a, b) => a.sortOrder - b.sortOrder);

    // Adım 1: Sabit Gün & Sabit Yer olanları (isFixedDay && isFixedStation) yerleştir
    for (const workDay of workDays) {
      const weekNum = getWeekNum(workDay.date);
      for (const station of sortedStations) {
        for (let slot = 0; slot < (station.capacity || 1); slot++) {
          const assignedCount = newAssignments.filter(a => a.stationId === station.id && a.dayOfWeek === workDay.dayOfWeek && a.weekNumber === weekNum).length;
          if (assignedCount >= (station.capacity || 1)) break;
          
          // Bu nöbet yerine ve bu güne sabitlenmiş, ve bugün BİR YERE atanmamış bir personel var mı?
          const fixedStaff = allStaff.find(s => {
            const cfg = configMap.get(s.id);
            if (cfg?.isExempt) return false;
            if (!(cfg?.isFixedDay && cfg?.fixedDayOfWeek === workDay.dayOfWeek && cfg?.isFixedStation && cfg?.fixedStationId === station.id)) return false;
            
            // Bugün başka bir nöbeti var mı?
            const alreadyAssignedToday = newAssignments.some(a => a.staffId === s.id && a.dayOfWeek === workDay.dayOfWeek && a.weekNumber === weekNum);
            return !alreadyAssignedToday;
          });
          
          if (fixedStaff) {
            newAssignments.push({ staffId: fixedStaff.id, stationId: station.id, dayOfWeek: workDay.dayOfWeek, weekNumber: weekNum });
            monthlyCount[fixedStaff.id] = (monthlyCount[fixedStaff.id] || 0) + 1;
            if (!weeklyCount[fixedStaff.id]) weeklyCount[fixedStaff.id] = {};
            weeklyCount[fixedStaff.id][weekNum] = (weeklyCount[fixedStaff.id][weekNum] || 0) + 1;
          }
        }
      }
    }

    // Adım 2: Kalan boşlukları doldur
    for (const workDay of workDays) {
      const weekNum = getWeekNum(workDay.date);
      
      let rotationOffset = 0;
      if (rotationFreq === 'weekly') rotationOffset = weekNum;
      else if (rotationFreq === 'biweekly') rotationOffset = Math.floor(weekNum / 2);
      
      for (let i = 0; i < sortedStations.length; i++) {
        const station = sortedStations[i];
        
        for (let slot = 0; slot < (station.capacity || 1); slot++) {
          const assignedCount = newAssignments.filter(a => a.stationId === station.id && a.dayOfWeek === workDay.dayOfWeek && a.weekNumber === weekNum).length;
          if (assignedCount >= (station.capacity || 1)) break;

          // Uygun personeli bul
          const eligible = allStaff.filter(s => {
            const config = configMap.get(s.id);
            
            if (config?.isExempt) return false;
            
            // Sabit gün kontrolü
            if (config?.isFixedDay) {
              if (config.fixedDayOfWeek !== workDay.dayOfWeek) return false;
            } else {
              // Müsait gün kontrolü
              const availDays = config?.availableDays ? config.availableDays.split(',').map(Number) : [1, 2, 3, 4, 5];
              if (!availDays.includes(workDay.dayOfWeek)) return false;
            }
            
            // Zaten bu hafta bu personeli başka bir güne atadıysak ve sabit gücü yoksa, 
            // aynı haftada 2 kez nöbet tutmasını engellemek isteyebiliriz (maxPerWeek).
            const mCount = monthlyCount[s.id] || 0;
            if (config?.maxPerMonth && config.maxPerMonth > 0 && mCount >= config.maxPerMonth) return false;

            const wCount = (weeklyCount[s.id]?.[weekNum] || 0);
            if (config?.maxPerWeek && config.maxPerWeek > 0 && wCount >= config.maxPerWeek) return false;

            // İdareciler sadece idare/müdür nöbet yerlerine, öğretmenler diğer yerlere
            const isTeacher = s.gorev?.toLowerCase().includes('öğretmen');
            const isAdminStation = station.name.toLowerCase().includes('idare') || station.name.toLowerCase().includes('müdür');
            
            if (isAdminStation && isTeacher) return false;
            if (!isAdminStation && !isTeacher) return false;

            // Okul öncesi → sadece idareci değilse
            if (station.shift === 'okuloncesi' && config?.isAdmin) return false;
            
            // Aynı gün başka bir yerde nöbeti var mı?
            const hasDutyToday = newAssignments.some(a => a.staffId === s.id && a.dayOfWeek === workDay.dayOfWeek && a.weekNumber === weekNum);
            if (hasDutyToday) return false;

            return true;
          });

          if (eligible.length === 0) continue;

          // Rotasyon mantığı: Personel listesini id'sine göre stabil bir şekilde sırala
          eligible.sort((a, b) => {
            // Önce sabit günü bu gün olanlara öncelik ver
            const aFixed = configMap.get(a.id)?.isFixedDay && configMap.get(a.id)?.fixedDayOfWeek === workDay.dayOfWeek ? 1 : 0;
            const bFixed = configMap.get(b.id)?.isFixedDay && configMap.get(b.id)?.fixedDayOfWeek === workDay.dayOfWeek ? 1 : 0;
            if (aFixed !== bFixed) return bFixed - aFixed;
            
            // Sonra eşitlik ilkesi (en az nöbet tutan)
            const mCountA = monthlyCount[a.id] || 0;
            const mCountB = monthlyCount[b.id] || 0;
            if (mCountA !== mCountB) return mCountA - mCountB;
            
            return a.id.localeCompare(b.id);
          });
          
          // Rotasyon kaydırması
          let selectedIdx = 0;
          if (rotationFreq !== 'none' && eligible.length > 0) {
             selectedIdx = rotationOffset % eligible.length;
          }

          const selected = eligible[selectedIdx];

          newAssignments.push({
            staffId: selected.id,
            stationId: station.id,
            dayOfWeek: workDay.dayOfWeek,
            weekNumber: weekNum
          });

          monthlyCount[selected.id] = (monthlyCount[selected.id] || 0) + 1;
          if (!weeklyCount[selected.id]) weeklyCount[selected.id] = {};
          weeklyCount[selected.id][weekNum] = (weeklyCount[selected.id][weekNum] || 0) + 1;
        }
      }
    }

    // Kaydet
    await this.bulkSaveAssignments({ academicYear, year, month, assignments: newAssignments });

    return { distributed: newAssignments.length };
  }

  // Yardımcı: Aylık iş günleri
  _getWorkDays(year: number, month: number): { date: Date; dayOfWeek: number; dayNum: number }[] {
    const days = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      const dow = date.getDay(); // 0=Pazar, 1=Pzt, ...
      if (dow >= 1 && dow <= 5) {
        days.push({ date: new Date(date), dayOfWeek: dow, dayNum: date.getDate() });
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  }
}

export const dutyScheduleService = new DutyScheduleService();
