# Ders Programı Modülü

Bu belge, OkulDesk içindeki ders programı modülünün veri modeli, API yüzeyi, yükleme akışı ve bilinen sınırlamalarını özetler.

## Amaç

Ders programı modülü, öğretmen ve sınıf bazlı haftalık programları merkezi olarak tutar. Ayrıca Boş Ders Doldurma modülü, izinli öğretmenlerin o güne ait derslerini belirlemek için bu modüle bağımlıdır.

## Ana Bileşenler

- Frontend sayfası: `frontend/src/pages/admin/modules/TimetablePage.tsx`
- Grid bileşeni: `frontend/src/components/ui/TimetableGrid.tsx`
- API route grubu: `backend/src/modules/timetable/timetable.routes.ts`
- İş mantığı: `backend/src/modules/timetable/timetable.service.ts`
- Excel ayrıştırıcı: `backend/src/modules/timetable/utils/timetableParser.util.ts`
- Veri modeli: `backend/prisma/schema.prisma`

## Veri Modeli

### Timetable

- `academicYear`: Eğitim öğretim yılı
- `name`: Program adı
- `isActive`: Yıl içindeki aktif kayıt bayrağı
- `createdAt`: Yükleme zamanı

### TimetableEntry

- `timetableId`: Üst program kaydı
- `staffId`: Öğretmen referansı
- `className`: Sınıf adı
- `dayOfWeek`: 1-5 arası hafta içi gün bilgisi
- `period`: Ders saati sırası
- `subject`: Ders kodu veya kısa adı
- `room`: Derslik bilgisi

## API Uçları

- `GET /api/timetable/active`: Aktif program özeti
- `GET /api/timetable/classes`: Aktif programdaki sınıf listesi
- `GET /api/timetable/history`: Yıl bazlı program geçmişi
- `GET /api/timetable/load-summary`: Öğretmen ders yük özeti
- `GET /api/timetable/teacher/:staffId`: Tek öğretmenin haftalık programı
- `GET /api/timetable/teachers?staffIds=id1,id2`: Birden fazla öğretmenin haftalık programı
- `GET /api/timetable/class/:className`: Tek sınıfın haftalık programı
- `POST /api/timetable/upload`: Excel yükleme ve aktifleştirme
- `PUT /api/timetable/:id/activate`: Eski kaydı yeniden aktif yapma
- `DELETE /api/timetable/:id`: Pasif program silme

Tüm timetable route'ları kimlik doğrulama ve yönetici yetkisi gerektirir.

## Upload Akışı

1. Kullanıcı `.xlsx` veya `.xls` dosyası seçer.
2. Backend, uzantı filtresi, upload rate limit ve magic-byte doğrulaması uygular.
3. Excel parser, Yabil benzeri blok yapısından öğretmen programlarını çıkarır.
4. Var olan aktif program aynı eğitim yılı içinde pasife çekilir.
5. Yeni program kaydı oluşturulur.
6. Tüm ders girişleri transaction içinde topluca eklenir.
7. Sistemle eşleşmeyen öğretmenler için placeholder personel kaydı açılır ve warning döndürülür.

Bu akış atomiktir. Transaction sırasında hata oluşursa yeni program ve satırlar kalıcı hale gelmez.

## Beklenen Excel Özellikleri

- Öğretmen blokları `Adı Soyadı` satırı ile başlamalıdır.
- Gün başlığı satırında `GÜNLER` veya `GUNLER` bulunmalıdır.
- Ders sütunları tercihen `1. Ders`, `2. Ders` gibi başlıklar taşımalıdır.
- Hücre içeriği tipik olarak `SINIF DERSKODU` veya `SINIF DERSKODU (ODA)` formatındadır.
- Dosya Yabil çıktısına yakın bir yapı taşımalıdır.

## Boş Ders Doldurma Bağımlılığı

Boş Ders Doldurma ekranı, izinli öğretmenlerin programını bu modülden çeker. Son güncelleme ile bu veri tek çağrıda toplu olarak alınır; devamsız öğretmen sayısı arttığında istek sayısı artmaz.

## Bilinen Sınırlamalar

- Parser, Yabil benzeri yapıya göre optimize edilmiştir; ciddi format sapmalarında parse başarısı düşebilir.
- Ders saat aralıkları sistem ayarlarından yönetilir; boş bırakılan periyotlar grid'de yalnızca sıra numarası ile gösterilir.
- Aynı eğitim yılı içinde tek aktif program kuralı uygulama mantığıyla ve migration içindeki partial unique index ile korunur.

## Doğrulama

- Backend derleme: `cd backend && npm run build`
- Frontend derleme: `cd frontend && npm run build`
- Parser testleri: `cd backend && npx vitest run src/modules/timetable/utils/timetableParser.util.test.ts`
- Service testleri: `cd backend && npx vitest run src/modules/timetable/timetable.service.test.ts`