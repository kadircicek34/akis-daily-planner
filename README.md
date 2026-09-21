<div align="center">
  <img src="public/pwa-192x192.png" width="112" alt="Akış uygulaması ikonu">
  <h1>Akış</h1>
  <p>Görevlerini, gelen kutunu ve günlük programını<br>tek bir görsel zaman çizgisinde buluşturan açık kaynak planlayıcı.</p>

  [![PWA](https://img.shields.io/badge/PWA-offline%20ready-ff8f86?logo=pwa&logoColor=white)](https://takvim-app-chi.vercel.app)
  [![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=111)](https://react.dev/)
  [![Tests](https://img.shields.io/badge/tests-16%20passing-2b9772)](#testler)
  [![License](https://img.shields.io/badge/license-MIT-9176bb)](LICENSE)

  **[Canlı uygulamayı aç](https://takvim-app-chi.vercel.app)**
</div>

![Akış masaüstü zaman çizelgesi](docs/images/desktop.png)

## Özellikler

- **Görsel zaman çizelgesi:** Günün görevlerini saat, süre, renk ve durum bilgileriyle tek akışta gör.
- **Hızlı gelen kutusu:** Aklına gelen işi zaman belirlemeden kaydet, hazır olduğunda tek dokunuşla bugüne planla.
- **Haftalık gezinme:** Haftanın günleri arasında geçiş yap ve yoğunluğu renkli göstergelerle takip et.
- **Eksiksiz görev yönetimi:** Başlık, tarih, başlangıç saati, süre, renk ve not alanlarıyla görev oluştur, düzenle veya sil.
- **Arama ve sınıflandırma:** Başlık, not ve etiketlerde ara; görevleri öncelik, etiket, renk ve simgeyle düzenle.
- **İlerleme takibi:** Tamamlanan görevleri işaretle ve günün ilerlemesini anlık gör.
- **Açık ve koyu tema:** Tercih edilen görünüm cihazda kalıcı olarak saklanır.
- **Yedekleme:** Tüm planı JSON olarak dışa aktar veya daha önceki bir yedeği içe al.
- **Çevrimdışı PWA:** Ana ekrana kurulabilir; uygulama kabuğu ve tipografi internet olmadan çalışır.
- **Yerel ve özel:** Görevler dış servise gönderilmez, yalnızca tarayıcının yerel depolamasında tutulur.
- **AI içermez, agent uyumludur:** Uygulamada üretken AI yoktur; isteğe bağlı MCP ve REST köprüsüyle harici agent’lar görevleri yönetebilir.

## Mobil deneyim

<p align="center">
  <img src="docs/images/mobile.png" width="390" alt="Akış mobil günlük planlayıcı görünümü">
</p>

Mobil görünüm; kompakt haftalık seçici, dokunmatik görev kontrolleri, kayan gelen kutusu ve hızlı ekleme navigasyonuyla bağımsız bir uygulama hissi verir.

## Kurulum

Gereksinimler: Node.js 20 veya üzeri ve npm.

```bash
git clone https://github.com/kadircicek34/akis-daily-planner.git
cd akis-daily-planner
npm ci
npm run dev
```

Üretim paketini oluşturmak ve yerel olarak görüntülemek için:

```bash
npm run build
npm run preview
```

## PWA olarak kurma

Canlı uygulamayı Chrome, Edge veya Safari ile aç. Tarayıcının **Uygulamayı yükle** ya da **Ana Ekrana Ekle** seçeneğini kullan. İlk ziyaretin ardından uygulama çevrimdışı olarak yeniden açılabilir.

## Testler

Üretim önizlemesi; masaüstü ve mobil yerleşim, yatay taşma, görev oluşturma, manifest ve çevrimdışı service worker davranışı açısından gerçek Chromium oturumunda doğrulanır. Ayrı agent paketi MCP araç keşfini, MCP üzerinden görev oluşturma/okuma ve REST köprüsü yazma/okuma akışlarını test eder.

```bash
npm run test:ci
```

## MCP ve chatbot entegrasyonu

Akış, resmi Model Context Protocol TypeScript SDK’sıyla hazırlanmış yerel bir `stdio` sunucusu sunar. Claude Desktop, Cursor, Codex ve diğer MCP istemcileri altı aracı kullanabilir: görev listeleme, günlük plan, oluşturma, güncelleme, tamamlama ve silme.

```bash
npm run agent:mcp
```

PWA ile agent’ın aynı görev dosyasını kullanması için yerel REST köprüsünü başlat:

```bash
npm run agent:bridge
```

Ardından uygulamada **Ayarlar → Agent Bridge → Şimdi eşitle** seçeneğini kullan. Ayrıntılı istemci yapılandırmaları ve API endpoint’leri için [Agent ve MCP entegrasyon rehberine](docs/agent-integration.md) bak.

## Teknik yapı

- React 19 ve TypeScript
- Vite 7 üretim derlemesi
- `vite-plugin-pwa` ve Workbox service worker
- Resmi Model Context Protocol TypeScript SDK v2
- Loopback ile sınırlandırılmış REST Agent Bridge
- Lucide SVG ikonları
- Harici API veya sunucu gerektirmeyen `localStorage` veri katmanı
- Masaüstü, tablet ve telefon için duyarlı CSS
- Vercel üzerinde otomatik statik dağıtım

## Veri ve gizlilik

Akış hesap oluşturmaz ve analitik kodu içermez. Varsayılan kullanımda görevler, notlar ve tema tercihi yalnızca kullanılan tarayıcıda saklanır. Agent Bridge isteğe bağlıdır, yalnızca `127.0.0.1` üzerinde dinler ve veriyi `~/.akis/tasks.json` dosyasında tutar. Tarayıcı verileri temizlendiğinde eşitlenmemiş yerel plan silinir.

## Katkı

Hata bildirimi ve geliştirme önerileri için issue açabilir, değişiklikler için pull request gönderebilirsin.

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile yayımlanmıştır.
