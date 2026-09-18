# Responsive UI Audit - Phase 1

Tarih: 2026-09-18

## Amaç

Küçük ekranlarda taşma, yarım görünen modal, gereksiz yatay kaydırma ve yoğun tablolu ekranlarda okunabilirlik kaybı üreten alanları belirlemek.

## İlk Bulgular

### 1. Ortak Kabuk

- [frontend/src/components/AdminLayout.tsx](../frontend/src/components/AdminLayout.tsx)
  - Sidebar genişliği sabit ve mobil davranışı drawer tabanlı; ana içerik `p-6 md:p-8` ile geniş boşluk kullanıyor.
  - Responsive sorunların bir kısmı sayfa bazlı değil, bu kabuktan yayılıyor.

### 2. Ortak Bileşenler

- [frontend/src/components/ui/ActionModal.tsx](../frontend/src/components/ui/ActionModal.tsx)
  - Full-width modal davranışı dar ekranda tam güvenli değil; yükseklik ve içerik taşması için ince ayar gerekiyor.
- [frontend/src/components/ui/DataTable.tsx](../frontend/src/components/ui/DataTable.tsx)
  - Tüm satırlar tek yatay tablo içinde; küçük ekranda hücre yoğunluğu hızlı şekilde taşma üretebilir.
- [frontend/src/components/ui/TimetableGrid.tsx](../frontend/src/components/ui/TimetableGrid.tsx)
  - Zaten yoğun bir grid; dar ekranda hücre yüksekliği ve sütun sayısı temel risk.

### 3. Yüksek Riskli Modüller

- [frontend/src/pages/admin/modules/TimetablePage.tsx](../frontend/src/pages/admin/modules/TimetablePage.tsx)
  - Çok sütunlu haftalık grid, özet kartları ve modal açılımları var.
  - Önceden responsive iyileştirme gerektiren ana ekranlardan biri.
- [frontend/src/pages/admin/modules/CoverAssignmentPage.tsx](../frontend/src/pages/admin/modules/CoverAssignmentPage.tsx)
  - Yoğun filtre satırları, kartlar, tahmin listeleri ve yazdırma görünümü içeriyor.
  - Küçük ekranlarda akışın bozulması çok olası.
- [frontend/src/pages/admin/modules/DutySchedulePage.tsx](../frontend/src/pages/admin/modules/DutySchedulePage.tsx)
  - Büyük tablolar, çok adımlı düzenleme ve print template bağımlılığı var.
  - Mobilde yatay taşma riski yüksek.

### 4. Liste Ekranları

- [frontend/src/pages/admin/StaffPage.tsx](../frontend/src/pages/admin/StaffPage.tsx)
  - Kolon bazlı tablo, çoklu seçim ve aksiyon butonları içeriyor.
  - Bazı kolonlar gizlenmiş olsa da yoğunluk hâlâ yüksek.
- [frontend/src/pages/admin/StudentListPage.tsx](../frontend/src/pages/admin/StudentListPage.tsx)
  - Sınıf sekmeleri + veri tablosu + toplu işlem satırı kombinasyonu dar ekranda zorlayıcı.
- [frontend/src/pages/admin/AuditLogPage.tsx](../frontend/src/pages/admin/AuditLogPage.tsx)
  - Kart tabanlı olsa da üst filtre alanı ve uzun meta satırları dar ekran testine ihtiyaç duyuyor.

## İlk Hipotez

Responsive sorunların ana kaynağı tek bir global CSS sınıfı değil.

Asıl problem, ortak kabuk + ortak tablo/modal bileşenleri + modül bazlı yoğun grid/tablo düzenlerinin bir arada olması.

## İlk Uygulama Sırası

1. `ActionModal` ve `DataTable` gibi ortak bileşenler
2. `AdminLayout` ve ana container düzeni
3. `TimetablePage` ve `CoverAssignmentPage`
4. `DutySchedulePage`
5. `StaffPage` ve `StudentListPage`
6. Kalan modüller

## Not

Bu audit başlangıç düzeyindedir. Bir sonraki adımda her hedef ekran için tek tek taşma nedenleri çıkarılıp kısa düzeltme listesi hazırlanacaktır.