export interface PermissionCategory {
  name: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Öğrenci ve Veli İşlemleri',
    permissions: [
      { key: 'students', label: 'Öğrenci Listesi & 360° Kart', description: 'Öğrenci arama, ekleme, düzenleme ve veli iletişimleri' },
      { key: 'parent-leave', label: 'Veli İzin Dilekçeleri', description: 'Veli izin alma dilekçesi hazırlama ve kaydetme' },
      { key: 'petitions', label: 'Veli Genel Dilekçeleri', description: 'Nakil, kayıt silme vb. veli dilekçesi oluşturma' },
      { key: 'matbu-evraklar', label: 'Kayıt ve Matbu Evraklar', description: 'Öğrenci kayıt sözleşmeleri ve resmi matbu formlar' },
      { key: 'parent-meeting', label: 'Veli Toplantısı İmza Sirküsü', description: 'Sınıf veli toplantısı imza tutanağı oluşturma' },
    ],
  },
  {
    name: 'Devamsızlık ve Bildirimler',
    permissions: [
      { key: 'daily-absenteeism', label: 'Anlık Devamsızlık (WhatsApp)', description: 'Sabah ve öğleden sonra gelmeyen öğrencileri anında veliye bildirme' },
      { key: 'absenteeism', label: 'Devamsızlık Mektubu (Resmi)', description: 'Posta/resmi tebligat için devamsızlık mektubu yazdırma' },
      { key: 'parent-notification', label: 'ÖMYK Devamsızlık Bildirimi', description: 'Mesleki eğitim devamsızlık bildirim formları' },
      { key: 'grade-reports', label: 'Başarısızlık Riski Bildirimi', description: 'Ders başarısızlığı riski taşıyan öğrencilerin veli bildirimi' },
    ],
  },
  {
    name: 'Disiplin ve Yaptırımlar',
    permissions: [
      { key: 'warnings', label: 'Yazılı Uyarılar', description: 'Öğrenciye resmi yazılı uyarı düzenleme ve takip' },
      { key: 'violations', label: 'Günlük İhlal Takibi', description: 'Kılık-kıyafet, geç kalma, telefon vb. davranış ihlalleri' },
    ],
  },
  {
    name: 'Eğitim, Ders ve Nöbet',
    permissions: [
      { key: 'duty-schedule', label: 'Nöbet Çizelgesi', description: 'Öğretmen haftalık nöbet dağılımı ve çizelgeleri' },
      { key: 'timetable', label: 'Haftalık Ders Programı', description: 'Sınıf ve öğretmen ders programlarını görüntüleme ve yazdırma' },
      { key: 'cover-assignments', label: 'Boş Ders Doldurma', description: 'Raporlu/sevkli öğretmen yerine boş ders doldurma görevlendirmesi' },
      { key: 'student-club', label: 'Öğrenci Kulüpleri', description: 'Sosyal kulüpler ve öğrenci üye listeleri' },
      { key: 'class-teachers', label: 'Sınıf Rehber Öğretmenleri', description: 'Sınıfların şube rehber öğretmen listesi' },
      { key: 'folder-spines', label: 'Klasör Sırtlığı', description: 'Standart MEB klasör sırtlığı oluşturma' },
    ],
  },
  {
    name: 'Personel ve İdari İşler',
    permissions: [
      { key: 'staff', label: 'Personel Havuzu', description: 'Öğretmen ve memur bilgileri yönetimi' },
      { key: 'attendance-sheet', label: 'Personel İmza Çizelgesi', description: 'Aylık personel imza sirküsü' },
      { key: 'teblig', label: 'Tebliğ – Tebellüğ Belgeleri', description: 'Resmi yazı ve duyuru tebliğ tutanakları' },
      { key: 'commission', label: 'Kurul ve Komisyonlar', description: 'Okul kurul ve komisyon üye dağılımları' },
      { key: 'commemorative-days', label: 'Belirli Gün ve Haftalar', description: 'Yıllık kutlama ve anma günleri çizelgesi' },
      { key: 'holidays', label: 'Resmi Tatiller', description: 'Resmi ve idari tatil takvimi' },
      { key: 'invoice-tracking', label: 'Fatura & Ödenek Takip', description: 'Elektrik, su, doğalgaz fatura ve ödenek izleme' },
    ],
  },
  {
    name: 'İletişim ve Sistem',
    permissions: [
      { key: 'whatsapp', label: 'WhatsApp Bağlantı Yönetimi', description: 'QR kod ile WhatsApp Web oturumu bağlama/kesme' },
      { key: 'whatsapp-consent', label: 'Veli Onay Yönetimi (KVKK)', description: 'Veli açık rıza onay takibi ve manuel onay' },
      { key: 'users', label: 'Kullanıcı ve Yetki Yönetimi', description: 'Yeni kullanıcı tanımlama, şifre sıfırlama ve yetkilendirme' },
      { key: 'settings', label: 'Sistem Ayarları & Yedekleme', description: 'Okul bilgileri, ağ ayarları, veritabanı yedeği indirme/yükleme' },
      { key: 'audit-logs', label: 'Sistem Denetim Logları (Audit)', description: 'Kim, ne zaman, hangi işlemi yaptı kayıtları' },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key));

export const ROLE_PRESETS = [
  {
    id: 'ADMIN',
    name: 'Tam Yetkili Yönetici (Müdür / Başyardımcı)',
    description: 'Tüm modüllere, kullanıcı yönetimine ve sistem ayarlarına tam erişim.',
    permissions: ['*'],
  },
  {
    id: 'STUDENT_AFFAIRS',
    name: 'Öğrenci & Devamsızlık İdarecisi',
    description: 'Öğrenci işleri, anlık devamsızlık bildirimleri, veli izinleri ve disiplin işlemleri.',
    permissions: [
      'students',
      'absenteeism',
      'daily-absenteeism',
      'parent-leave',
      'petitions',
      'warnings',
      'violations',
      'grade-reports',
      'parent-notification',
      'matbu-evraklar',
      'parent-meeting',
    ],
  },
  {
    id: 'SCHEDULE_DUTY',
    name: 'Nöbet & Ders Programı İdarecisi',
    description: 'Nöbet çizelgesi, haftalık ders programı, boş ders doldurma ve personel imza çizelgeleri.',
    permissions: [
      'duty-schedule',
      'timetable',
      'cover-assignments',
      'staff',
      'attendance-sheet',
      'class-teachers',
      'folder-spines',
    ],
  },
  {
    id: 'DISCIPLINE_ONLY',
    name: 'Disiplin ve İhlal Sorumlusu',
    description: 'Yalnızca öğrenci uyarıları, davranış ihlalleri ve devamsızlık mektupları.',
    permissions: ['students', 'warnings', 'violations', 'absenteeism'],
  },
];
