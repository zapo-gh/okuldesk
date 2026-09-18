# Responsive UI Uygulama Planı

## Amaç

OkulDesk arayüzünü küçük ekranlarda taşma yapmayacak, okunabilirliği koruyacak ve modüller arasında tutarlı davranacak şekilde responsive hale getirmek.

## Temel Karar

Bu iş tek seferde tüm ekranlara uygulanmayacak.

Önce ortak kabuk ve paylaşılan bileşenler düzeltilecek, ardından modüller öncelik sırasına göre tek tek ele alınacak. Böylece bir düzeltme birden fazla ekrana yayılacak ve tekrar eden iş azalacak.

## Uygulama Stratejisi

### 1. Ortak İskelet

İlk adımda tüm admin ekranlarını etkileyen ortak yapı düzeltilecek:

- `AdminLayout`
- sayfa dış boşlukları ve içerik genişliği
- sidebar davranışı
- header ve üst bilgi satırları
- yatay taşmayı tetikleyen genel container düzenleri

Hedef: Ekran daraldığında sayfa tamamen kırılmasın, içerik kendi içinde kontrollü küçülsün veya kaydırılabilir hale gelsin.

### 2. Paylaşılan Bileşenler

Sonra ortak kullanılan UI parçaları responsive hale getirilecek:

- `ActionModal`
- tablolar için wrapper yapısı
- `PageHeader`
- form grid düzenleri
- seçim kutuları ve filtre satırları
- buton grupları

Hedef: Bir bileşen düzeltildiğinde onu kullanan tüm modüller otomatik iyileşsin.

### 3. Kritik Modüller

Ortak yapıdan sonra en çok kullanılan ve en çok tablo/kart içeren modüller sırayla ele alınacak:

- Ders Programı
- Boş Ders Doldurma
- Nöbet Çizelgesi
- Personel ekranları
- Öğrenci listeleri
- Rapor ekranları

Hedef: En çok kullanıcı etkisi olan ekranlarda önce toparlanma sağlamak.

### 4. Uzun Kuyruk Modüller

Ana ekranlar toparlandıktan sonra daha az kullanılan modüller tek tek iyileştirilecek.

## Öncelik Sırası

1. Ortak layout ve container davranışı
2. Modal ve tablo bileşenleri
3. Ders programı ve nöbet gibi yoğun ekranlar
4. Personel ve öğrenci listeleri
5. Kalan yardımcı modüller

## Teknik Yaklaşım

- Geniş ekran için mevcut tasarımı bozmayacağız.
- Küçük ekranlarda tek çözüm olarak küçültmek yerine gerektiğinde:
  - yatay scroll
  - kart görünüme geçiş
  - sütun gizleme
  - alt alta yığılma
  - sticky başlıklar
  kullanılacak.
- Responsive kararları mümkün olduğunca ortak bileşenlerde alınacak.

## Başarı Kriterleri

- 1366px, 1280px ve 1024px genişliklerinde ana sayfalar taşmadan çalışır.
- 768px altında modallar ekrana sığar ve yarım görünmez.
- Tablo yoğun modüllerde içerik okunabilir kalır.
- Ortak bileşen düzeltmeleri birden fazla ekranı otomatik iyileştirir.

## Uygulama Planı

### Faz 1: Audit

- Hangi ekranlar yatay taşma üretiyor tespit edilir.
- Ortak bileşen listesi çıkarılır.
- En problemli 5 ekran önceliklendirilir.

### Faz 2: Ortak Düzeltmeler

- `ActionModal` ve diğer modal yapıları responsive yapılır.
- `AdminLayout` ve sayfa container yapıları düzenlenir.
- Tablo sarmalayıcıları standartlaştırılır.

### Faz 3: Kritik Modüller

- Ders Programı
- Boş Ders Doldurma
- Nöbet Çizelgesi
- Personel listeleri
- Öğrenci listeleri

### Faz 4: Kalan Ekranlar

- Daha az kullanılan modüller tek tek gözden geçirilir.

## Notlar

- Bu çalışma tek bir global CSS değişikliği ile bitmeyecek.
- En iyi sonuç, ortak bileşenler + modül bazlı düzenleme kombinasyonuyla alınır.
- Gerekirse her faz sonunda build ile doğrulama yapılır.