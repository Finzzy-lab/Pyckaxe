# Pyckaxe

Paper Minecraft sunucusu kurulumunu ve Hangar üzerinden plugin yönetimini
birkaç tıka indiren masaüstü uygulaması. Electron + React + TailwindCSS.

## Kurulum

```bash
npm install
```

## Geliştirme modunda çalıştırma

```bash
npm run dev
```

Bu komut Vite dev sunucusunu ve Electron'u birlikte başlatır.

## Dağıtım paketi oluşturma

```bash
npm run build
```

`electron-builder` Windows/macOS/Linux için paket üretir (platforma göre
ilgili işletim sisteminde derlemek gerekir).

## Önemli notlar / yapılacaklar

0. **PaperMC v2 API kaldırıldı**: Eski `api.papermc.io/v2` artık HTTP 410
   dönüyor. `electron/services/paper.js` artık PaperMC'nin güncel "Fill"
   API'sini (`fill.papermc.io/v3`) kullanıyor. Build listesi çağrısı
   indirme URL'sini, dosya adını ve SHA256'ı doğrudan içeriyor, ayrı bir
   istek gerekmiyor.

1. **net.fetch kullanımı**: `electron/services/paper.js` ve `hangar.js`
   global `fetch()` yerine Electron'un `net.fetch()`'ini kullanıyor. Sebep:
   ana süreçteki global `fetch()` Chromium'un Fetch spesifikasyonunu takip
   eder ve bu spec `User-Agent` başlığının elle set edilmesini yasaklar
   (forbidden header) — sessizce yok sayılır. `net.fetch` bu kısıtlamayı
   bypass ediyor.

2. **User-Agent zorunlu**: `electron/main.js` içindeki `USER_AGENT`
   sabitini kendi proje adın ve iletişim bilginle güncelle. Hem PaperMC hem
   Hangar API'leri jenerik olmayan, iletişim bilgisi içeren bir User-Agent
   bekliyor; aksi halde istekler reddedilebilir.

3. **Hangar uç noktalarını doğrula**: `electron/services/hangar.js`
   içindeki `/api/v1/projects`, `/versions`, `/download` uç noktaları
   Hangar'ın genel API yapısına dayanıyor ve henüz PaperMC'nin resmi
   Fill API'si gibi teyit edilmedi. Hangar hâlâ "Open Beta" aşamasında
   olduğundan kodlamaya devam etmeden önce güncel Swagger dokümanından
   (hangar.papermc.io üzerinde) alan adlarını ve uç noktaları doğrula —
   `paper:versions` hatasına benzer bir 410/404 alırsan muhtemelen sebep bu.

4. **DevTools artık otomatik açılmıyor**: `npm run dev` çalıştırdığında
   artık ayrı bir DevTools penceresi belirmiyor. İstersen
   `Ctrl/Cmd+Shift+I` ile elle aç, ya da `PYCKAXE_DEVTOOLS=1 npm run dev`
   ile otomatik açılmasını iste. Eğer hâlâ tarayıcıda bir
   `localhost:5173` sekmesi/penceresi açılıyorsa bu Vite'tan değil,
   kullandığın terminal/IDE'nin (VS Code Simple Browser, Cursor önizleme
   paneli vb.) portu algılayıp otomatik önizleme açmasından kaynaklanıyor
   olabilir — o davranış bu proje kodunun dışında.

5. **İsim hakkında**: "Pyckaxe" ismi araması sırasında GitHub'da benzer
   yazılışta ("pickaxe"), küçük ve ilgisiz bir altyapı (Pulumi/IaC) projesi
   bulundu — düşük görünürlüklü, farklı bir niş, gerçek bir marka
   çakışması riski taşımıyor gibi görünüyor ama tamamen yayınlamadan önce
   npm/GitHub'da bir kez daha kontrol etmen iyi olur.

6. **Logo/ikon**: `build/icon.svg` amblemden `build/icon.png` (Linux) ve
   `build/icon.ico` (Windows) üretildi, `package.json`'daki
   `build.linux.icon` / `build.win.icon` bunlara işaret ediyor. macOS için
   gereken `build/icon.icns` sandbox'ta üretilemedi (gerekli araçlar
   Linux'ta yok) — bunu bir Mac'te `iconutil` ile ya da online bir
   SVG→ICNS dönüştürücüyle kendin eklemen gerekecek, yoksa `npm run build`
   mac hedefinde hata verir.

7. **Konsol/oyuncu state'i artık merkezi**: `src/RuntimeContext.jsx`
   loglar, çevrimiçi oyuncu listesi ve çalışma durumunu App kökünde tek
   bir yerde tutuyor, tek bir `process:log`/`process:exit` dinleyicisiyle
   güncelleniyor. Önceki sürümde her `ConsoleTab` kendi dinleyicisini
   kaydediyordu ve temizlenmediği için (React StrictMode'da özellikle)
   dinleyiciler birikip aynı satırın birden fazla kez görünmesine yol
   açıyordu; ayrıca tab/sunucu değişince component unmount olduğu için
   state sıfırlanıyordu. İkisi de bu merkezi state ile çözüldü.

8. **Oyuncu listesi konsol log'undan çıkarılıyor**: `RuntimeContext`
   `"X joined the game"` / `"X left the game"` / `"X lost connection:"`
   satırlarını regex ile yakalayıp oyuncu listesini güncelliyor — RCON ya
   da Mojang API kullanmıyor, sadece konsol metnini okuyor. Bu yüzden
   Paper'ın log formatı önemli ölçüde değişirse (nadir) regex'lerin
   güncellenmesi gerekebilir. Oyuncu adları `mc-heads.net` üzerinden kafa
   görseline çevriliyor (harici, ücretsiz, anahtar gerektirmeyen bir
   servis — internet bağlantısı gerekir).

9. **OP durumu**: `ops.json` dosyasını okuyarak belirleniyor. `op`/`deop`
   komutu gönderildikten ~800ms sonra dosya tekrar okunuyor (sunucunun
   dosyayı yazması için kabaca bir bekleme) — çok yoğun sunucularda bu
   gecikme yetersiz kalabilir, "Yetkileri yenile" butonuyla elle
   tazeleyebilirsin.

10. **Yedekleme**: Ayarlar sekmesindeki "Şimdi yedekle" `world` /
    `world_nether` / `world_the_end` klasörlerini ve birkaç ayar
    dosyasını `<sunucu>/backups/backup-<tarih>.zip` olarak paketliyor.
    Sunucu çalışırken yedek almak (world dosyaları o an yazılıyor olabilir)
    teorik olarak tutarsız bir anlık görüntü verebilir — kritik yedekler
    için sunucuyu durdurup öyle yedeklemeni öneririm.

11. **İçe aktarılan sunucularda MC sürümü opsiyonel**: Sürüm
    belirtilmezse Hangar araması sürüm-uyumluluk filtresi olmadan çalışır
    (PluginsTab'da bunu belirten bir uyarı var). Ayarlar sekmesinden
    sonradan eklenebilir.

12. **Java kontrolü yok**: Uygulama şu an kullanıcıda Java kurulu olduğunu
    varsayıyor. İstersen `process:start` öncesi `java -version` çalıştırıp
    kurulu değilse kullanıcıyı yönlendiren bir kontrol eklenebilir.

13. **Test edilmedi**: Bu sandbox'ta internet erişimi ve GUI olmadığı için
    `npm install` / `npm run dev` çalıştırılıp uçtan uca doğrulanamadı —
    tüm dosyaları syntax açısından taradım (hepsi temiz) ama gerçek
    çalıştırmada küçük sürprizler çıkabilir.

## Klasör yapısı

```
build/
  icon.svg         → Amblem kaynağı
  icon.png/.ico    → Üretilmiş ikonlar (Linux/Windows) — .icns eksik
electron/
  main.js          → Ana süreç: pencere, IPC, sunucu process yönetimi
  preload.js       → Renderer'a güvenli API köprüsü
  store.js         → Sunucu kayıtları (yerel JSON)
  services/
    paper.js       → PaperMC (Fill v3) API entegrasyonu
    hangar.js      → Hangar API entegrasyonu
    backup.js      → World yedekleme (zip)
src/
  App.jsx             → RuntimeProvider + ana layout/ekran yönlendirme
  RuntimeContext.jsx  → Merkezi log/oyuncu/çalışma-durumu state'i
  components/         → Sidebar, Logo, sekmeler (Konsol/Oyuncular/Dosyalar/Pluginler/Ayarlar)
  screens/            → Karşılama, kurulum sihirbazı, içe aktarma, sunucu detay ekranı
```

## Fikir aşamasında kalanlar (istersen sonra ekleriz)

- **TPS/performans göstergesi**: `/tps` komutunu periyodik gönderip
  konsol çıktısından parse ederek başlıkta küçük bir gösterge — RCON
  olmadan mümkün ama fragile, log formatına bağımlı.
- **Otomatik yeniden başlatma**: Çökme durumunda `process:exit`
  kodu 0 değilse otomatik `startServer` çağırmak, açık/kapalı toggle'lı.
- **Zamanlanmış yedekleme**: Mevcut `backup:create`'i `setInterval` ile
  periyodik çağırmak, ayarlardan aralık seçilebilir.
- **Whitelist yönetimi**: Oyuncular sekmesine ops.json'a benzer şekilde
  whitelist.json okuma/yazma ve UI'dan ekleme/çıkarma.
