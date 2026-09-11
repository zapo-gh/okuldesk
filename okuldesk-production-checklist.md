# OkulDesk — Production Hazırlık Kontrol Listesi
**Stack:** Tauri v2 + TypeScript + SQLite (çok modüllü okul idare uygulaması)

Bu liste; fonksiyonel doğruluk, veri bütünlüğü, güvenlik, performans, Tauri'ye özgü paketleme sorunları ve Türkiye'deki okul verisi (KVKK) yükümlülüklerini kapsar. Her modülü ayrı ayrı test etmeden önce **altyapı ve güvenlik** bölümlerini tamamlamanı öneririm — bunlar tüm modülleri etkiler.

---

## 1. Tauri Paketleme & Dağıtım

- [ ] **Backend başlatma doğrulaması**: `lib.rs`/`main.rs` içinde sidecar veya gömülü backend'in uygulama açılışında gerçekten start edildiği doğrulandı (senin notlarına göre bu daha önce regresyona uğramıştı — öncelik bu).
- [ ] Release build (`tauri build`) temiz bir makinede (geliştirme ortamı olmayan) çalıştırıldı ve kuruldu.
- [ ] Windows: NSIS/MSI installer, imzasız durumda SmartScreen uyarısı test edildi; code signing sertifikası varsa doğrulandı.
- [ ] macOS/Linux hedefleniyorsa, o platformlarda da build ve ilk açılış test edildi.
- [ ] Uygulama ilk kurulumda gerekli klasörleri (veritabanı, loglar, yedekler) doğru işletim sistemi dizinlerinde (`AppData`/`~/.local/share` vb.) oluşturuyor.
- [ ] Auto-updater (varsa) gerçek bir sürüm artışıyla uçtan uca test edildi.
- [ ] Uygulama ikonu, sürüm numarası, `tauri.conf.json` içindeki `productName`/`identifier` üretim değerlerine göre güncel.
- [ ] Tauri `allowlist`/capabilities dosyasında sadece gerçekten kullanılan API'ler açık (gereksiz `fs`, `shell`, `http` izinleri kapalı).
- [ ] CSP (Content Security Policy) tanımlı ve gereksiz `unsafe-eval`/`unsafe-inline` yok.

## 2. SQLite Veri Katmanı

- [ ] Migration sistemi (Prisma/kendi çözümün) production'da **sıfırdan kurulum** ve **eski sürümden yükseltme** senaryolarının ikisinde de test edildi.
- [ ] WAL modu (varsa) aktif ve eşzamanlı yazma/okuma senaryoları (örn. iki pencere/iki kullanıcı aynı anda kayıt girerken) çakışma yaratmıyor.
- [ ] Foreign key kısıtlamaları (`PRAGMA foreign_keys = ON`) production build'de de aktif.
- [ ] Soft-delete uygulanan tablolarda silinen kayıtlar raporlarda/aramalarda gerçekten filtreleniyor.
- [ ] Veritabanı dosyası bozulmasına karşı (ani kapanma, elektrik kesintisi) davranış test edildi — açılışta bütünlük kontrolü (`PRAGMA integrity_check`) var mı?
- [ ] Otomatik yedekleme servisi: zamanlaması, yedek dosyalarının konumu, eski yedeklerin rotasyonu (disk şişmesin) doğrulandı.
- [ ] Yedekten geri yükleme (restore) fiilen bir kez denendi ve veri kaybı olmadan çalıştığı görüldü.
- [ ] Büyük veri hacminde (örn. 2000+ öğrenci, çok yıllık kayıt) sorgu performansı kabul edilebilir; kritik listelerde (öğrenci listesi, not/devamsızlık raporu) index'ler var.

## 3. Güvenlik

- [ ] Kullanıcı şifreleri (öğretmen/veli/idareci hesapları) hash'lenmiş (bcrypt/argon2), düz metin saklanmıyor.
- [ ] "Beni hatırla" (rememberMe) ve oturum (session) süresi/geçerliliği doğru şekilde sona eriyor; token'lar disk üzerinde açık metin tutulmuyor.
- [ ] Yetkilendirme (rol bazlı erişim: müdür/müdür yardımcısı/öğretmen/veli) her modülde backend tarafında da kontrol ediliyor — sadece arayüzde gizlemek yeterli değil.
- [ ] Dosya yükleme özellikleri (varsa: belge, fotoğraf) magic-byte doğrulaması yapıyor, sadece uzantıya güvenmiyor.
- [ ] SQL sorguları parametreli (prepared statement); string birleştirmeyle oluşturulan sorgu yok.
- [ ] Denetim kaydı (audit log): kim, ne zaman, hangi kaydı değiştirdi/sildi bilgisi tutuluyor ve manipüle edilemiyor.
- [ ] Hassas veriler (T.C. kimlik no, veli telefon/adres, sağlık/disiplin bilgisi gibi) veritabanında gereksiz yere düz metin dolaşmıyor; en azından erişim loglanıyor.
- [ ] WhatsApp/SMS entegrasyonu varsa: veli onayı (KVKK açık rıza) alınmadan bildirim gönderilmiyor; onay kaydı tutuluyor.
- [ ] KVKK kapsamında: veri saklama süresi, silme talebi işleme, veri ihracı (export) fonksiyonları düşünüldü mü?

## 4. Modül Bazlı Fonksiyonel Test (her modül için tekrarla)

Aşağıdaki matrisi öğrenci, öğretmen, devamsızlık, not, disiplin, pansiyon vb. **her modül için ayrı ayrı** doldur:

- [ ] **CRUD**: Ekleme, düzenleme, silme (soft/hard), listeleme uçtan uca çalışıyor.
- [ ] **Doğrulama**: Zorunlu alanlar, format kontrolleri (T.C. no algoritması, telefon formatı, tarih aralıkları) hem arayüzde hem backend'de var.
- [ ] **Sınır durumları**: Boş liste, tek kayıt, binlerce kayıt, çok uzun metin girişi, özel karakter (Türkçe İ/ı/ğ/ş sorunları dahil) test edildi.
- [ ] **Eşzamanlılık**: Aynı kaydı iki farklı ekrandan/oturumdan aynı anda düzenleme senaryosu makul şekilde ele alınıyor (son yazan kazanır mı, kilit mi var, uyarı mı çıkıyor?).
- [ ] **İlişkili veri silme**: Bir öğretmen/öğrenci silindiğinde bağlı kayıtlar (ders, not, devamsızlık) tutarsız kalmıyor.
- [ ] **Raporlama/çıktı**: Modülün ürettiği PDF/Excel/yazı çıktıları MEB mevzuatına uygun formatta ve doğru veriyle üretiliyor.
- [ ] **Yetki testi**: Farklı rollerle giriş yapıldığında modül doğru şekilde kısıtlanıyor (örn. öğretmen sadece kendi dersini görüyor).

## 5. Türkiye'ye Özgü / MEB Mevzuatı Uyumu

- [ ] Öğrenci/öğretmen numaraları, sınıf-şube yapısı MEBBİS/e-Okul formatlarıyla tutarlı.
- [ ] Resmi yazı/rapor şablonları güncel mevzuata (yazışma kuralları, imza bloğu) uygun.
- [ ] Dönem/yıl geçişi (yeni eğitim-öğretim yılı başlangıcı) senaryosu test edildi — eski yıl verileri arşivleniyor, yeni yıl temiz başlıyor mu?
- [ ] Nakil gelen/giden öğrenci senaryosu (kayıt taşıma) test edildi.

## 6. Performans & Kararlılık

- [ ] Uygulama soğuk başlatma (cold start) süresi kabul edilebilir (özellikle düşük donanımlı okul bilgisayarlarında).
- [ ] Bellek sızıntısı yok — uygulama uzun süre (bir tam iş günü) açık bırakılarak izlendi.
- [ ] Büyük liste/tablo render'ları (500+ satır) arayüzü kilitlemiyor (virtualization var mı?).
- [ ] Ağ bağlantısı olmayan ortamda (offline-first ise) uygulama düzgün çalışıyor; bağlantı geri geldiğinde senkronizasyon (varsa) sorunsuz.

## 7. Hata Yönetimi & Loglama

- [ ] Beklenmeyen hatalarda uygulama çökmüyor; kullanıcıya anlaşılır bir hata mesajı gösteriliyor.
- [ ] Hata logları dosyaya yazılıyor ve gerektiğinde destek için kolayca toplanabiliyor.
- [ ] Kritik işlemler (silme, toplu güncelleme) öncesi onay adımı var.
- [ ] Uygulama çökse bile veritabanı bozulmuyor (transaction kullanımı doğrulandı).

## 8. Kullanıcı Kabul Testi (UAT)

- [ ] En az bir gerçek idareci/öğretmen ile pilot kullanım yapıldı, geri bildirim toplandı.
- [ ] Klavye kısayolları/erişilebilirlik (yaşlı/az deneyimli kullanıcılar için) gözden geçirildi.
- [ ] Kurulum ve ilk kullanım (onboarding) adımları teknik bilgisi az bir kullanıcı tarafından test edildi.

## 9. Yayın Öncesi Son Kontroller

- [ ] Versiyon numarası, changelog ve kurulum kılavuzu hazır.
- [ ] Geri alma (rollback) planı var: yeni sürüm sorun çıkarırsa eski sürüme/yedeğe dönüş prosedürü net.
- [ ] Destek/iletişim kanalı (senin okulun için) kullanıcıya belirtilmiş.
- [ ] Lisans/dağıtım şekli (okul içi mi, diğer okullara mı) netleşti.

---

**Öncelik sıralaması önerim:** 1 (Tauri backend başlatma) → 2 (SQLite bütünlük/yedek) → 3 (güvenlik) → 4 (modül testleri) → geri kalanı. Backend başlamıyorsa diğer hiçbir test anlamlı olmaz.
