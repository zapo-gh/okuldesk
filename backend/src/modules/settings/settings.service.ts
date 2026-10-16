import prisma from '../shared/utils/prisma';

const SINGLETON_ID = 'singleton';

class SettingsService {
  async get() {
    let settings = await prisma.schoolSettings.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: { id: SINGLETON_ID, schoolName: '', principalName: '', academicYear: '2025-2026' },
      });
    }

    return {
      schoolName: settings.schoolName,
      principalName: settings.principalName,
      academicYear: settings.academicYear ?? '2025-2026',
      waTemplate1: settings.waTemplate1 ?? '',
      waTemplate2: settings.waTemplate2 ?? '',
      waTemplate3: settings.waTemplate3 ?? '',
      waTemplateBep: (settings as any).waTemplateBep ?? '',
      waTemplateDaily: (settings as any).waTemplateDaily ?? '',
      waTemplateWarningNotice: (settings as any).waTemplateWarningNotice ?? '',
      waTemplateConsentRequest: (settings as any).waTemplateConsentRequest ?? '',
      waAntiSpamEnabled: (settings as any).waAntiSpamEnabled ?? true,
      waAntiSpamMinDelay: (settings as any).waAntiSpamMinDelay ?? 4,
      waAntiSpamMaxDelay: (settings as any).waAntiSpamMaxDelay ?? 7,
      dutyRotationFreq: settings.dutyRotationFreq ?? 'weekly',
      dutyRotationDates: settings.dutyRotationDates ?? '[]',
      dutyStartDate: settings.dutyStartDate ?? null,
      dutyRoomStationMap: (settings as any).dutyRoomStationMap ?? '{}',
      classDisplayMap: (settings as any).classDisplayMap ?? '{}',
      lastRotationDate: settings.lastRotationDate?.toISOString() ?? null,
      publicBaseUrl: (settings as any).publicBaseUrl ?? '',
      schoolAddress: (settings as any).schoolAddress ?? '',
      schoolDistrictCity: (settings as any).schoolDistrictCity ?? '',
      schoolEmail: (settings as any).schoolEmail ?? '',
      schoolPhone: (settings as any).schoolPhone ?? '',
    };
  }

  async update(data: {
    schoolName?: string;
    principalName?: string;
    academicYear?: string;
    waTemplate1?: string;
    waTemplate2?: string;
    waTemplate3?: string;
    waTemplateBep?: string;
    waTemplateDaily?: string;
    waTemplateWarningNotice?: string;
    waTemplateConsentRequest?: string;
    waAntiSpamEnabled?: boolean;
    waAntiSpamMinDelay?: number;
    waAntiSpamMaxDelay?: number;
    dutyRotationFreq?: string;
    dutyRotationDates?: string;
    dutyStartDate?: string | null;
    dutyRoomStationMap?: string;
    classDisplayMap?: string;
    lastRotationDate?: string | null;
    publicBaseUrl?: string;
    schoolAddress?: string;
    schoolDistrictCity?: string;
    schoolEmail?: string;
    schoolPhone?: string;
  }) {
    const settings = await prisma.schoolSettings.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        schoolName: data.schoolName ?? '',
        principalName: data.principalName ?? '',
        academicYear: data.academicYear ?? '2025-2026',
        waTemplate1: data.waTemplate1 ?? '',
        waTemplate2: data.waTemplate2 ?? '',
        waTemplate3: data.waTemplate3 ?? '',
        waTemplateBep: data.waTemplateBep ?? '',
        waTemplateDaily: data.waTemplateDaily ?? '',
        waTemplateWarningNotice: data.waTemplateWarningNotice ?? '',
        waTemplateConsentRequest: data.waTemplateConsentRequest ?? '',
        waAntiSpamEnabled: data.waAntiSpamEnabled ?? true,
        waAntiSpamMinDelay: data.waAntiSpamMinDelay ?? 4,
        waAntiSpamMaxDelay: data.waAntiSpamMaxDelay ?? 7,
        dutyRotationFreq: data.dutyRotationFreq ?? 'weekly',
        dutyRotationDates: data.dutyRotationDates ?? '[]',
        dutyStartDate: data.dutyStartDate ?? null,
        dutyRoomStationMap: data.dutyRoomStationMap ?? '{}',
        classDisplayMap: data.classDisplayMap ?? '{}',
        publicBaseUrl: data.publicBaseUrl ?? '',
        schoolAddress: data.schoolAddress ?? '',
        schoolDistrictCity: data.schoolDistrictCity ?? '',
        schoolEmail: data.schoolEmail ?? '',
        schoolPhone: data.schoolPhone ?? '',
      } as any,
      update: {
        ...(data.schoolName !== undefined && { schoolName: data.schoolName }),
        ...(data.principalName !== undefined && { principalName: data.principalName }),
        ...(data.academicYear !== undefined && { academicYear: data.academicYear }),
        ...(data.waTemplate1 !== undefined && { waTemplate1: data.waTemplate1 }),
        ...(data.waTemplate2 !== undefined && { waTemplate2: data.waTemplate2 }),
        ...(data.waTemplate3 !== undefined && { waTemplate3: data.waTemplate3 }),
        ...(data.waTemplateBep !== undefined && { waTemplateBep: data.waTemplateBep }),
        ...(data.waTemplateDaily !== undefined && { waTemplateDaily: data.waTemplateDaily }),
        ...(data.waTemplateWarningNotice !== undefined && { waTemplateWarningNotice: data.waTemplateWarningNotice }),
        ...(data.waTemplateConsentRequest !== undefined && { waTemplateConsentRequest: data.waTemplateConsentRequest }),
        ...(data.waAntiSpamEnabled !== undefined && { waAntiSpamEnabled: data.waAntiSpamEnabled }),
        ...(data.waAntiSpamMinDelay !== undefined && { waAntiSpamMinDelay: data.waAntiSpamMinDelay }),
        ...(data.waAntiSpamMaxDelay !== undefined && { waAntiSpamMaxDelay: data.waAntiSpamMaxDelay }),
        ...(data.dutyRotationFreq !== undefined && { dutyRotationFreq: data.dutyRotationFreq }),
        ...(data.dutyRotationDates !== undefined && { dutyRotationDates: data.dutyRotationDates }),
        ...(data.dutyStartDate !== undefined && { dutyStartDate: data.dutyStartDate }),
        ...(data.dutyRoomStationMap !== undefined && { dutyRoomStationMap: data.dutyRoomStationMap }),
        ...(data.classDisplayMap !== undefined && { classDisplayMap: data.classDisplayMap }),
        ...(data.publicBaseUrl !== undefined && { publicBaseUrl: data.publicBaseUrl }),
        ...(data.schoolAddress !== undefined && { schoolAddress: data.schoolAddress }),
        ...(data.schoolDistrictCity !== undefined && { schoolDistrictCity: data.schoolDistrictCity }),
        ...(data.schoolEmail !== undefined && { schoolEmail: data.schoolEmail }),
        ...(data.schoolPhone !== undefined && { schoolPhone: data.schoolPhone }),
        ...(data.lastRotationDate !== undefined && {
          lastRotationDate: data.lastRotationDate ? new Date(data.lastRotationDate) : null,
        }),
      } as any,
    });

    return {
      schoolName: settings.schoolName,
      principalName: settings.principalName,
      academicYear: settings.academicYear ?? '2025-2026',
      waTemplate1: settings.waTemplate1 ?? '',
      waTemplate2: settings.waTemplate2 ?? '',
      waTemplate3: settings.waTemplate3 ?? '',
      waTemplateBep: (settings as any).waTemplateBep ?? '',
      waTemplateDaily: (settings as any).waTemplateDaily ?? '',
      waTemplateWarningNotice: (settings as any).waTemplateWarningNotice ?? '',
      waTemplateConsentRequest: (settings as any).waTemplateConsentRequest ?? '',
      waAntiSpamEnabled: (settings as any).waAntiSpamEnabled ?? true,
      waAntiSpamMinDelay: (settings as any).waAntiSpamMinDelay ?? 4,
      waAntiSpamMaxDelay: (settings as any).waAntiSpamMaxDelay ?? 7,
      schoolDistrictCity: (settings as any).schoolDistrictCity ?? '',
      schoolEmail: (settings as any).schoolEmail ?? '',
      schoolPhone: (settings as any).schoolPhone ?? '',
    };
  }
}

export const settingsService = new SettingsService();

