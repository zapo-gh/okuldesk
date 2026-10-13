# 📋 Gelecekte Geliştirilecek Modüller Listesi (Backlog)

Bu belgede, OkulDesk projesinde menü kalabalığını önlemek ve öncelikli modüllere odaklanmak amacıyla **geçici olarak menüden kaldırılan** ancak **ilerleyen süreçte geliştirilmesi planlanan** modüller kayıt altına alınmıştır.

---

## 📌 Modül Özeti ve Durum Tablosu

| # | Modül Adı | Kategori | Rota (URL) | Frontend Dosyası | Durum / Açıklama |
|---|---|---|---|---|---|
| 1 | **Öğretmenler Kurulu** | Eğitim & Öğretim | `/admin/board-meeting` | `frontend/src/pages/admin/modules/BoardMeetingPage.tsx` | Sene başı, 2. dönem başı ve sene sonu kurul toplantı tutanakları ve gündem maddeleri yönetimi. |
| 2 | **Sosyal Etkinlik Planı** | Eğitim & Öğretim | `/admin/social-activity` | `frontend/src/pages/admin/modules/SocialActivityPage.tsx` | MEB Sosyal Etkinlikler Yönetmeliği'ne uygun yıllık okul ve zümre sosyal etkinlik planları. |
| 3 | **Personel Nakil Bildirimi** | Personel & İnsan Kayn. | `/admin/staff-transfer` | `frontend/src/pages/admin/modules/StaffTransferPage.tsx` | Okula yeni gelen veya ayrılan öğretmen/personel için resmi nakil bildirim ve devir-teslim formları. |
| 4 | **Okul Gezi Planı** | Kurullar & Planlama | `/admin/field-trip` | `frontend/src/pages/admin/modules/FieldTripPage.tsx` | İl/İlçe MEM onayına sunulacak okul gezisi izin belgeleri, veli izinleri ve kafile listesi. |
| 5 | **Doğrudan Temin (22/d)** | Satın Alma & Mali İşler | `/admin/procurement` | `frontend/src/pages/admin/modules/ProcurementPage.tsx` | 4734 sayılı KİK 22/d doğrudan temin süreçleri: onay belgesi, piyasa araştırma tutanağı, teklif mektupları. |
| 6 | **Firma Rehberi** | Satın Alma & Mali İşler | `/admin/supplier` | `frontend/src/pages/admin/modules/SupplierPage.tsx` | Doğrudan temin ve okul ihtiyaçlarında teklif alınan tedarikçi/firma iletişim ve vergi no havuzu. |
| 7 | **Yıllık Çalışma Planı** | Kurullar & Planlama | `/admin/annual-plan` | `frontend/src/pages/admin/modules/AnnualPlanPage.tsx` | Okul yıllık çalışma ve eylem planı şablonları. |
| 8 | **Okul Aile Birliği** | Kurullar & Planlama | `/admin/parent-association` | `frontend/src/pages/admin/modules/ParentAssociationPage.tsx` | Okul Aile Birliği genel kurul ve yönetim kurulu evrakları. |
| 9 | **Ders Dışı Egzersiz Planı** | Eğitim & Öğretim | `/admin/extracurricular` | `frontend/src/pages/admin/modules/ExtracurricularPage.tsx` | Ders dışı eğitim ve egzersiz onay/planlama belgeleri. |
| 10 | **Yolluk Hesaplama** | Personel & İnsan Kayn. | `/admin/travel-allowance` | `frontend/src/pages/admin/modules/TravelAllowancePage.tsx` | Sürekli ve geçici görev yolluğu hesaplama tablosu. |

---

## 🔍 Kod İçerisindeki İşaretleme Noktaları

Bu modüller kod tabanından tamamen silinmemiş, ileride kolaylıkla bulunabilmesi ve tekrar açılabilmesi için aşağıdaki dosyalarda özel etiketlerle yorum satırına alınmıştır:

1. **Menü Yapısı:** [`frontend/src/components/AdminLayout.tsx`](file:///frontend/src/components/AdminLayout.tsx)  
   - İlgili `<NavItem>` bileşenleri `{/* [GELECEKTE GELİŞTİRİLECEK] ... */}` etiketiyle yorum satırına alınmıştır.
2. **Hızlı Arama (Komut Paleti):** [`frontend/src/components/ui/CommandPalette.tsx`](file:///frontend/src/components/ui/CommandPalette.tsx)  
   - Arama sonuçlarında kafa karışıklığı yaratmaması için `// [GELECEKTE GELİŞTİRİLECEK]` olarak işaretlenmiştir.
3. **Sayfa Rotaları:** [`frontend/src/App.tsx`](file:///frontend/src/App.tsx)  
   - Sayfa bileşenleri ve yönlendirme rotaları muhafaza edilmiştir (doğrudan link ile erişilebilir veya test edilebilir).

---

## 🚀 Bir Modülü Yeniden Menüye Eklemek İçin

Bir modülü geliştirip yeniden aktif etmek istediğinizde:
1. [`AdminLayout.tsx`](file:///frontend/src/components/AdminLayout.tsx) dosyasını açın.
2. İlgili modülün üzerindeki `{/* [GELECEKTE GELİŞTİRİLECEK] ... */}` yorum işaretini kaldırarak `<NavItem>` bileşenini aktif edin.
3. İsteğe bağlı olarak [`CommandPalette.tsx`](file:///frontend/src/components/ui/CommandPalette.tsx) listesindeki yorum satırını da açarak hızlı aramaya dahil edin.
