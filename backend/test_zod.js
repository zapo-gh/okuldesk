const { z } = require('zod');

const clubSchema = z.object({
  name: z.string().min(1), description: z.string().optional(),
  assignedStaffId: z.string().optional(), meetingDay: z.string().optional(),
  meetingTime: z.string().optional(), maxMembers: z.number().optional(),
  academicYear: z.string().min(1),
  extraData: z.string().optional(),
});

const reqBody = {
  name: 'Kültür ve Edebiyat Kulübü',
  description: 'Şiir, kompozisyon, okuma faaliyetleri vb.',
  academicYear: '2024-2025',
  meetingDay: 'Cuma',
  meetingTime: '15:00',
  maxMembers: 30,
  extraData: JSON.stringify({ activities: [] })
};

const p = clubSchema.safeParse(reqBody);
console.log('Success:', p.success);
if (!p.success) {
  console.log(p.error.errors);
} else {
  console.log('Parsed data:', p.data);
}
