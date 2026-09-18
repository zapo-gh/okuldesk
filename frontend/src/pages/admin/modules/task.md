# Boş Ders Doldurma Modülü - Görev Listesi

- `[/]` **Backend İyileştirmeleri**
  - `[ ]` `coverAssignment.service.ts` - `suggestCovers` içinde aktif programın `academicYear` ile filtrelenmesi
  - `[ ]` `coverAssignment.service.ts` - `isVicePrincipal()` fonksiyonunun regex/dizi ile güçlendirilmesi
  - `[ ]` `coverAssignment.service.ts` - `coverCountMap`'in dönemlik geçmiş verilerle başlatılması (Adil dağıtım)
  - `[ ]` `coverAssignment.service.ts` - `saveCovers` N+1 sorgu probleminin upsert ve `$transaction` ile çözülmesi
  - `[ ]` `dutySchedule.routes.ts` - Gereksiz `/absences/today` rotasının kaldırılması
- `[ ]` **Frontend İyileştirmeleri**
  - `[ ]` `CoverAssignmentPage.tsx` - Okula gelemeyenler kartında dersleri çekmek için `GET /timetable/teacher/:id` kullanımı (Çökme düzeltmesi)
  - `[ ]` `CoverAssignmentPage.tsx` - Gün (`getDay()` vs `dayOfWeek`) hesaplama mantığının düzeltilmesi
  - `[ ]` `CoverAssignmentPage.tsx` - İzin formu sıfırlandığında `reason: 'Raporlu'` kalmasının sağlanması
  - `[ ]` `CoverAssignmentPage.tsx` - `derivedSuggestions` cover count başlatma algoritmasının düzeltilmesi
  - `[ ]` `CoverAssignmentPage.tsx` - Sayfanın üst kısmına istatistik (özet) panelinin eklenmesi
- `[ ]` **Doğrulama ve Test**
  - `[ ]` Backend derlemesi ve çalışabilirliği
  - `[ ]` Frontend derlemesi ve çalışabilirliği
