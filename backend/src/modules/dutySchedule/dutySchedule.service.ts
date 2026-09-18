import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

class DutyScheduleService {
  // ── Nöbet Noktaları ──
  async getStations() {
    const stations = await prisma.dutyStation.findMany({
      where: { isActive: true },
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
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
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
    assignments: { staffId: string; stationId: string; dayOfWeek: number; weekNumber?: number; year?: number; month?: number }[]
  }) {
    // Group assignments by year and month
    const groups: Record<string, { year: number; month: number; assignments: any[] }> = {};
    
    // Always ensure the base month is in the groups, so it gets cleared even if empty
    groups[`${options.year}-${options.month}`] = {
      year: options.year,
      month: options.month,
      assignments: []
    };

    for (const a of options.assignments) {
      const y = a.year || options.year;
      const m = a.month || options.month;
      const key = `${y}-${m}`;
      if (!groups[key]) {
        groups[key] = { year: y, month: m, assignments: [] };
      }
      groups[key].assignments.push({
        ...a,
        year: y,
        month: m
      });
    }

    // Process each group
    for (const key in groups) {
      const group = groups[key];
      
      // Delete existing assignments for this month
      await prisma.dutyAssignment.deleteMany({
        where: {
          academicYear: options.academicYear,
          year: group.year,
          month: group.month
        }
      });

      // Insert new assignments
      if (group.assignments.length > 0) {
        await prisma.dutyAssignment.createMany({
          data: group.assignments.map(a => ({
            staffId: a.staffId,
            stationId: a.stationId,
            dayOfWeek: a.dayOfWeek,
            weekNumber: a.weekNumber ?? 0,
            academicYear: options.academicYear,
            year: group.year,
            month: group.month
          }))
        });
      }
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
    exemptionReason?: string;
    exemptionNote?: string;
    exemptionEndDate?: string;
  }[]) {
    for (const c of configs) {
      const exemptData = {
        isExempt: c.isExempt ?? false,
        exemptionReason: c.isExempt ? (c.exemptionReason ?? null) : null,
        exemptionNote: c.isExempt ? (c.exemptionNote ?? null) : null,
        exemptionEndDate: c.isExempt ? (c.exemptionEndDate ?? null) : null,
      };
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
          ...exemptData
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
          ...exemptData
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

    // Muaf personeli de çek (isExempt=true) — nöbet eşitlik raporu için eksiksiz liste
    const exemptConfigs = await prisma.dutyStaffConfig.findMany({
      where: { academicYear, isExempt: true }
    });

    // Hem atama yapılan hem de muaf olanları birleştir
    const allStaffIds = new Set([...Object.keys(countMap), ...exemptConfigs.map(c => c.staffId)]);
    if (!allStaffIds.size) return [];

    const exemptSet = new Set(exemptConfigs.map(c => c.staffId));

    const staffList = await prisma.staff.findMany({
      where: { id: { in: [...allStaffIds] } },
      select: { id: true, name: true, unvan: true }
    });

    return staffList.map(s => ({
      staffId: s.id,
      staffName: s.name,
      title: s.unvan || '',
      count: countMap[s.id] || 0,
      isExempt: exemptSet.has(s.id)
    })).sort((a, b) => {
      // Muaf olanlar en alta
      if (a.isExempt !== b.isExempt) return a.isExempt ? 1 : -1;
      return b.count - a.count;
    });
  }

  // ── Otomatik Dağıtım ──
  async autoDistribute(options: {
    year: number;
    month: number;
    academicYear: string;
    overwriteExisting: boolean;
    targetWeekNum?: number;
    startDate?: string;
    endDate?: string;
    dutyStartDate?: string; // Nöbet başlangıç tarihi (genel ayar)
  }) {
    const { year, month, academicYear, targetWeekNum, startDate, endDate, dutyStartDate } = options;

    // İş günlerini hesapla (Pzt-Cum)
    let workDays = this._getWorkDays(year, month);

    // Nöbet başlangıç tarihine göre filtrele (genel ayar)
    if (dutyStartDate) {
      const startD = new Date(dutyStartDate); startD.setHours(0, 0, 0, 0);
      workDays = workDays.filter(d => d.date >= startD);
    }

    if (startDate && endDate) {
       const sDate = new Date(startDate); sDate.setHours(0,0,0,0);
       const eDate = new Date(endDate); eDate.setHours(23,59,59,999);
       workDays = workDays.filter(d => d.date.getTime() >= sDate.getTime() && d.date.getTime() <= eDate.getTime());
    }

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
    } else if (startDate && endDate && options.overwriteExisting) {
      const targetWeekDays = workDays.map(d => ({ weekNum: d.weekNum, dayOfWeek: d.dayOfWeek }));
      newAssignments = existingAssignments.filter(a => 
        !targetWeekDays.some(tw => tw.weekNum === a.weekNumber && tw.dayOfWeek === a.dayOfWeek)
      );
    } else if (!options.overwriteExisting) {
      newAssignments = [...existingAssignments];
    } else {
      newAssignments = [];
    }
    
    // Eğer targetWeekNum verilmişse, dağıtımı sadece o haftanın günleri için yap
    if (targetWeekNum !== undefined) {
      workDays = workDays.filter(d => d.weekNum === targetWeekNum);
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
      const weekNum = workDay.weekNum;
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
      const weekNum = workDay.weekNum;
      
      // ── Rotasyon Offseti: Mutlak hafta sayısı (aylık sıfırlanmayan) ──
      const absWeekOffset = this._getAbsoluteWeekOffset(year, month, weekNum, academicYear);
      let rotationOffset = 0;
      if (rotationFreq === 'weekly') rotationOffset = absWeekOffset;
      else if (rotationFreq === 'biweekly') rotationOffset = Math.floor(absWeekOffset / 2);
      else if (rotationFreq === 'fourweekly') rotationOffset = Math.floor(absWeekOffset / 4);
      else if (rotationFreq === 'monthly') {
        const parts = academicYear.split('-');
        const startYear = Number(parts[0]);
        const mOffset = (year - startYear) * 12 + (month >= 9 ? month - 9 : month + 3);
        rotationOffset = mOffset;
      }
      else if (rotationFreq === 'custom') {
        try {
          const dates: string[] = JSON.parse((settings as any)?.dutyRotationDates || '[]');
          const wdTime = workDay.date.getTime();
          rotationOffset = dates.filter(d => new Date(d).getTime() <= wdTime).length;
        } catch (e) {
          rotationOffset = 0;
        }
      }
      
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

            // Personel türü eşleştirmesi: isAdmin config flag'i öncelikli,
            // yoksa gorev alanından tespit et
            const isTeacher = s.gorev?.toLowerCase().includes('öğretmen');
            const isAdminByConfig = config?.isAdmin === true;
            const isAdminByRole = s.gorev?.toLowerCase().includes('müdür yardımcısı');
            const isAdmin = isAdminByConfig || isAdminByRole;

            // İdari nöbet yeri (isAdminStation): sadece idareciler
            const isAdminStation = station.name.toLowerCase().includes('idare') || station.name.toLowerCase().includes('müdür');
            if (isAdminStation && !isAdmin) return false;

            // Normal nöbet yeri: öğretmenler veya isAdmin=false idareciler
            // (isAdmin olmayan ama müdür yardımcısı olan personel de normal yerlere atanabilir)
            if (!isAdminStation && isAdmin && !isTeacher) return false;

            // Okul öncesi → idareciler atanamaz
            if (station.shift === 'okuloncesi' && isAdmin) return false;
            
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

    // Kaydetmeden önce follower (kopyalanacak) haftalara çoğaltma işlemi
    if (targetWeekNum !== undefined) {
      let totalDistributed = 0;
      const numWeeks = rotationFreq === 'biweekly' ? 2 : rotationFreq === 'fourweekly' ? 4 : rotationFreq === 'monthly' ? 4 : 1;
      const allMonthWorkDays = this._getWorkDays(year, month);
      const maxWeekNumInMonth = Math.max(0, ...allMonthWorkDays.map(d => d.weekNum));

      // Hedef hafta atamalarını al
      const baseAssignments = newAssignments.filter(a => a.weekNumber === targetWeekNum);

      // Takip eden haftaları hesapla — ay sınırını aşabilirler
      const academicMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
      const parts = academicYear.split('-');

      // Tüm akademik yılın hafta dizisini oluştur: [{year, month, weekNum}]
      const allAcademicWeeks: { year: number; month: number; weekNum: number }[] = [];
      for (const m of academicMonths) {
        const y = m >= 9 ? Number(parts[0]) : (parts[1] ? Number(parts[1]) : Number(parts[0]) + 1);
        const days = this._getWorkDays(y, m);
        const weekNums = [...new Set(days.map(d => d.weekNum))].sort((a, b) => a - b);
        for (const wn of weekNums) {
          allAcademicWeeks.push({ year: y, month: m, weekNum: wn });
        }
      }

      // Şu anki hedef haftanın dizideki konumunu bul
      const baseIdx = allAcademicWeeks.findIndex(w => w.year === year && w.month === month && w.weekNum === targetWeekNum);
      console.log('[DEBUG] targetWeekNum:', targetWeekNum, 'year:', year, 'month:', month, 'baseIdx:', baseIdx, 'numWeeks:', numWeeks);
      console.log('[DEBUG] baseAssignments.length:', baseAssignments.length);
      console.log('[DEBUG] allAcademicWeeks around base:', allAcademicWeeks.slice(Math.max(0,baseIdx-1), baseIdx+5));

      if (baseIdx !== -1) {
        // Aynı ay içindeki follower haftaları temizle (eski kayıtlar)
        for (let i = 1; i < numWeeks; i++) {
          const nextW = targetWeekNum + i;
          if (nextW <= maxWeekNumInMonth) {
            newAssignments = newAssignments.filter(a => a.weekNumber !== nextW);
          }
        }

        // Her follower haftası için kopyalama yap
        const crossMonthBatch: { year: number; month: number; assignments: typeof newAssignments }[] = [];

        for (let i = 1; i < numWeeks; i++) {
          const followerIdx = baseIdx + i;
          if (followerIdx >= allAcademicWeeks.length) break;
          const fw = allAcademicWeeks[followerIdx];
          console.log(`[DEBUG] follower i=${i} followerIdx=${followerIdx} fw=`, fw);

          if (fw.year === year && fw.month === month) {
            // Aynı ay — newAssignments'a direkt ekle
            for (const baseA of baseAssignments) {
              const fWeekDays = allMonthWorkDays.filter(d => d.weekNum === fw.weekNum);
              if (fWeekDays.some(d => d.dayOfWeek === baseA.dayOfWeek)) {
                newAssignments.push({
                  staffId: baseA.staffId,
                  stationId: baseA.stationId,
                  dayOfWeek: baseA.dayOfWeek,
                  weekNumber: fw.weekNum
                });
              }
            }
          } else {
            // Farklı ay — ayrı batch olarak grupla
            const existingBatch = crossMonthBatch.find(b => b.year === fw.year && b.month === fw.month);
            const fMonthDays = this._getWorkDays(fw.year, fw.month);
            const fAssignments: typeof newAssignments = [];
            for (const baseA of baseAssignments) {
              const fWeekDays = fMonthDays.filter(d => d.weekNum === fw.weekNum);
              if (fWeekDays.some(d => d.dayOfWeek === baseA.dayOfWeek)) {
                fAssignments.push({
                  staffId: baseA.staffId,
                  stationId: baseA.stationId,
                  dayOfWeek: baseA.dayOfWeek,
                  weekNumber: fw.weekNum
                });
              }
            }
            console.log(`[DEBUG] cross-month fAssignments.length=${fAssignments.length} for`, fw);
            if (existingBatch) {
              existingBatch.assignments.push(...fAssignments);
            } else {
              crossMonthBatch.push({ year: fw.year, month: fw.month, assignments: fAssignments });
            }
          }
        }

        console.log('[DEBUG] crossMonthBatch:', JSON.stringify(crossMonthBatch.map(b => ({ year: b.year, month: b.month, count: b.assignments.length }))));

        // Farklı aylara ait atamaları hafta bazında kaydet (tüm ayı silmeden)
        for (const batch of crossMonthBatch) {
          // Sadece bu haftanın atalamalarını sil, tüm ayı değil
          const weekNumsToWrite = [...new Set(batch.assignments.map(a => a.weekNumber))];
          console.log('[DEBUG] saving cross-month batch year:', batch.year, 'month:', batch.month, 'weekNums:', weekNumsToWrite, 'count:', batch.assignments.length);
          for (const wn of weekNumsToWrite) {
            await prisma.dutyAssignment.deleteMany({
              where: {
                academicYear,
                year: batch.year,
                month: batch.month,
                weekNumber: wn
              }
            });
          }
          if (batch.assignments.length > 0) {
            await prisma.dutyAssignment.createMany({
              data: batch.assignments.map(a => ({
                staffId: a.staffId,
                stationId: a.stationId,
                dayOfWeek: a.dayOfWeek,
                weekNumber: a.weekNumber ?? 0,
                academicYear,
                year: batch.year,
                month: batch.month
              }))
            });
          }
          totalDistributed += batch.assignments.length;
        }
      }
    }

    // Mevcut ayı kaydet
    await this.bulkSaveAssignments({ academicYear, year, month, assignments: newAssignments });

    return { distributed: newAssignments.length };
  }

  // Tarih aralığına göre çoklu ay dağıtımı
  async autoDistributeRange(options: { startDate: string, endDate: string, academicYear: string, overwriteExisting: boolean }) {
    const start = new Date(options.startDate);
    const end = new Date(options.endDate);
    
    const monthsSet = new Set<string>();
    let curr = new Date(start);
    while (curr <= end) {
      monthsSet.add(`${curr.getFullYear()}-${curr.getMonth() + 1}`);
      curr.setDate(curr.getDate() + 1);
    }
    
    let totalDistributed = 0;
    
    for (const ym of monthsSet) {
      const [yStr, mStr] = ym.split('-');
      const year = parseInt(yStr);
      const month = parseInt(mStr);
      
      const res = await this.autoDistribute({
         year, month, academicYear: options.academicYear, overwriteExisting: options.overwriteExisting,
         startDate: options.startDate, endDate: options.endDate
      });
      totalDistributed += res.distributed;
    }
    return { distributed: totalDistributed };
  }

  // Yardımcı: Yıl başından (Eylül) itibaren mutlak hafta numarasını hesapla
  // Bu değer, rotasyon offsetinin aylık sıfırlanmasını önler.
  _getAbsoluteWeekOffset(year: number, month: number, weekNum: number, academicYear: string): number {
    const months = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
    const parts = academicYear.split('-');
    let absoluteWeek = 0;
    for (const m of months) {
      const y = m >= 9 ? Number(parts[0]) : (parts[1] ? Number(parts[1]) : Number(parts[0]) + 1);
      if (y === year && m === month) {
        absoluteWeek += weekNum;
        break;
      }
      const w = this._getWorkDays(y, m);
      const maxW = w.length > 0 ? Math.max(...w.map(d => d.weekNum)) : 0;
      absoluteWeek += (maxW + 1);
    }
    return absoluteWeek;
  }

  // Yardımcı: Aylık iş günleri
  _getWorkDays(year: number, month: number): { date: Date; dayOfWeek: number; dayNum: number; weekNum: number }[] {
    const days: any[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startOfWeek = new Date(firstDay);
    const dow = startOfWeek.getDay();
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    let current = new Date(startOfWeek);
    let weekNum = 0;
    while (current.getTime() <= lastDay.getTime()) {
      const weekDays = [];
      
      // Perşembe gününü bul (Pzt + 3 gün = Perşembe)
      const thursday = new Date(current);
      thursday.setDate(current.getDate() + 3);
      
      // Eğer Perşembe günü bu aya aitse, haftayı bu aya dahil et
      if (thursday.getMonth() === month - 1) {
        for (let i = 0; i < 5; i++) {
          const d = new Date(current);
          d.setDate(current.getDate() + i);
          weekDays.push({
            date: d,
            dayOfWeek: d.getDay(),
            dayNum: d.getDate(),
            weekNum: weekNum,
          });
        }
        days.push(...weekDays);
        weekNum++;
      }
      
      current.setDate(current.getDate() + 7);
    }
    return days;
  }

  // ── Excel Upload ──
  async uploadExcel(buffer: Buffer, academicYear: string) {
    const xlsx = await import('xlsx');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let stationsRowIdx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i].length > 0 && typeof data[i][0] === 'string' && data[i][0].trim().toLowerCase() === 'pazartesi') {
        stationsRowIdx = i - 1;
        break;
      }
    }
    
    if (stationsRowIdx === -1 || stationsRowIdx < 0) {
      throw new AppError('Excel formatı geçersiz: Nöbet yerleri ve günlerin bulunduğu satırlar tespit edilemedi.', 400);
    }
    
    const stationsRow = data[stationsRowIdx];
    const stationNames: { index: number, name: string }[] = [];
    for (let i = 1; i < stationsRow.length; i++) {
      if (stationsRow[i] && typeof stationsRow[i] === 'string' && stationsRow[i].trim()) {
        stationNames.push({ index: i, name: stationsRow[i].trim() });
      }
    }
    
    const dayMap: Record<string, number> = {
      'pazartesi': 1, 'salı': 2, 'çarşamba': 3, 'perşembe': 4, 'cuma': 5
    };
    
    const allStaff = await prisma.staff.findMany({ select: { id: true, name: true } });
    const sortedStaff = [...allStaff].sort((a, b) => b.name.length - a.name.length);
    
    const warnings: string[] = [];
    const parsedAssignments: { dayIndex: number, stIndex: number, staffIds: string[] }[] = [];
    const stationCapacities = new Map<number, number>();
    for (const st of stationNames) { stationCapacities.set(st.index, 1); }
    
    // Parse the data and calculate capacities
    for (let i = stationsRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      const dayStr = typeof row[0] === 'string' ? row[0].toLowerCase().trim() : '';
      const dayIndex = dayMap[dayStr];
      if (!dayIndex) continue; // Not a day row
      
      for (const st of stationNames) {
        const cellContent = row[st.index];
        if (typeof cellContent === 'string' && cellContent.trim()) {
          const foundStaffIds = new Set<string>();
          let remainingText = cellContent.toLocaleLowerCase('tr-TR');
          
          for (const staff of sortedStaff) {
            const staffNameLower = staff.name.toLocaleLowerCase('tr-TR');
            if (remainingText.includes(staffNameLower)) {
              foundStaffIds.add(staff.id);
              remainingText = remainingText.replace(staffNameLower, '');
            }
          }
          
          const leftover = remainingText.replace(/[\s\n\-\.]/g, '');
          if (foundStaffIds.size === 0) {
            warnings.push(`${dayStr.toUpperCase()} - ${st.name} hücresindeki "${cellContent}" personellerle eşleştirilemedi.`);
          } else if (leftover.length > 5) {
            warnings.push(`${dayStr.toUpperCase()} - ${st.name} hücresinde tam eşleşmeyen kısımlar olabilir: "${cellContent}"`);
          }
          
          if (foundStaffIds.size > stationCapacities.get(st.index)!) {
            stationCapacities.set(st.index, foundStaffIds.size);
          }
          
          parsedAssignments.push({ dayIndex, stIndex: st.index, staffIds: Array.from(foundStaffIds) });
        }
      }
    }
    
    // Fetch settings for dates and rotation
    const settings = await prisma.schoolSettings.findFirst();
    const parts = academicYear.split('-');
    const dutyStartDate = settings?.dutyStartDate ? new Date(settings.dutyStartDate) : new Date(`${parts[0]}-09-01`);
    const rotationFreq = settings?.dutyRotationFreq || 'weekly';
    const numWeeksToFill = rotationFreq === 'biweekly' ? 2 : rotationFreq === 'fourweekly' ? 4 : rotationFreq === 'monthly' ? 4 : 1;
    
    // Calculate target weeks
    const academicMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
    const allAcademicWeeks: { year: number; month: number; weekNum: number; days: any[] }[] = [];
    for (const m of academicMonths) {
      const y = m >= 9 ? Number(parts[0]) : (parts[1] ? Number(parts[1]) : Number(parts[0]) + 1);
      const days = this._getWorkDays(y, m);
      const weekNums = [...new Set(days.map(d => d.weekNum))].sort((a, b) => a - b);
      for (const wn of weekNums) {
        allAcademicWeeks.push({ year: y, month: m, weekNum: wn, days: days.filter(d => d.weekNum === wn) });
      }
    }
    
    let startIdx = 0;
    for (let i = 0; i < allAcademicWeeks.length; i++) {
      const w = allAcademicWeeks[i];
      if (w.days.some(d => d.date.getTime() >= dutyStartDate.getTime())) {
        startIdx = i;
        break;
      }
    }
    const targetWeeks = allAcademicWeeks.slice(startIdx, startIdx + numWeeksToFill);
    let assignmentsToCreate: any[] = [];
    
    await prisma.$transaction(async (tx) => {
      // Deactivate all active stations (to hide them, but keep history)
      await tx.dutyStation.updateMany({
        where: { isActive: true },
        data: { isActive: false, sortOrder: 999 }
      });
      
      const newStationsMap = new Map<number, string>();
      for (const st of stationNames) {
        let station = await tx.dutyStation.findFirst({ where: { name: st.name } });
        const cap = stationCapacities.get(st.index)!;
        if (station) {
          station = await tx.dutyStation.update({ where: { id: station.id }, data: { isActive: true, sortOrder: st.index, capacity: cap } });
        } else {
          station = await tx.dutyStation.create({ data: { name: st.name, isActive: true, sortOrder: st.index, capacity: cap } });
        }
        newStationsMap.set(st.index, station.id);
      }
      
      // Delete existing assignments for the target weeks to replace them fresh
      for (const tw of targetWeeks) {
        await tx.dutyAssignment.deleteMany({
          where: { academicYear, year: tw.year, month: tw.month, weekNumber: tw.weekNum }
        });
        
        for (const pa of parsedAssignments) {
           for (const sId of pa.staffIds) {
             assignmentsToCreate.push({
               staffId: sId,
               stationId: newStationsMap.get(pa.stIndex)!,
               dayOfWeek: pa.dayIndex,
               weekNumber: tw.weekNum,
               academicYear,
               year: tw.year,
               month: tw.month
             });
           }
        }
      }
      
      if (assignmentsToCreate.length > 0) {
        await tx.dutyAssignment.createMany({
          data: assignmentsToCreate
        });
      }
    });
    
    return {
      message: `Nöbet çizelgesi yüklendi. Nöbet başlangıç tarihi (${dutyStartDate.toLocaleDateString('tr-TR')}) baz alınarak ${numWeeksToFill} haftalık başlangıç rotasyonu dolduruldu.`,
      stationsCount: stationNames.length,
      assignmentsCount: assignmentsToCreate.length,
      warnings
    };
  }
}

export const dutyScheduleService = new DutyScheduleService();
