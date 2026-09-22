# Agent, MCP ve REST entegrasyonu

Akış iki yerel entegrasyon yüzeyi sağlar:

1. Chatbot ve agent istemcileri için standart MCP `stdio` sunucusu.
2. PWA ile aynı görev dosyasını eşitlemek veya klasik otomasyonlar yazmak için REST köprüsü.

Her ikisi de varsayılan olarak `~/.akis/tasks.json` dosyasını kullanır. Farklı bir konum için `AKIS_DATA_FILE` ortam değişkenini ayarlayabilirsin.

## MCP sunucusu

Sunucuyu doğrudan başlatmak için:

```bash
npm run agent:mcp
```

MCP istemcilerinin çoğu aşağıdaki yapılandırma biçimini kabul eder. `/absolute/path/akis-daily-planner` bölümünü kendi repo yolunla değiştir:

```json
{
  "mcpServers": {
    "akis": {
      "command": "npm",
      "args": ["--prefix", "/absolute/path/akis-daily-planner", "run", "agent:mcp"]
    }
  }
}
```

### MCP araçları

| Araç | Amaç |
| --- | --- |
| `list_tasks` | Tarih, tamamlanma durumu veya metne göre görevleri listeler. |
| `get_daily_plan` | Bir günün zaman sıralı planını döndürür. |
| `create_task` | Takvimde veya gelen kutusunda görev oluşturur. |
| `update_task` | Başlık, zaman, süre, not, öncelik ve etiketleri günceller. |
| `complete_task` | Görevin tamamlanma durumunu değiştirir. |
| `delete_task` | Onay sonrasında görevi siler. |

Tarihler `YYYY-MM-DD`, saatler `HH:mm` biçimindedir.

## PWA Agent Bridge

```bash
npm run agent:bridge
```

Köprü yalnızca `127.0.0.1:4318` üzerinde dinler. Uygulamada **Ayarlar → Agent Bridge** alanındaki varsayılan adresi kullanıp **Şimdi eşitle** düğmesine bas.

Chrome/Edge, canlı HTTPS uygulamasından loopback adresine ilk bağlantıda **Yerel ağ erişimi** izni sorar. İzni kabul et; daha önce reddettiysen adres çubuğundaki site izinlerinden açıp tekrar eşitle. `localhost` geliştirme görünümünde bu izin akışı tarayıcı sürümüne göre değişebilir.

İsteğe bağlı API anahtarıyla başlatmak için:

```bash
AKIS_API_KEY="guclu-bir-yerel-anahtar" npm run agent:bridge
```

Aynı anahtarı PWA ayarlarındaki API anahtarı alanına gir.

### REST API

| Yöntem | Endpoint | İşlem |
| --- | --- | --- |
| `GET` | `/health` | Köprü durumunu döndürür. |
| `GET` | `/v1/tasks` | Tüm görevleri döndürür. |
| `PUT` | `/v1/tasks` | Görev listesini eşitler/değiştirir. |
| `POST` | `/v1/tasks` | Yeni görev oluşturur. |
| `PATCH` | `/v1/tasks/:id` | Görevi günceller. |
| `DELETE` | `/v1/tasks/:id` | Görevi siler. |
| `POST` | `/v1/ai/subtasks` | Yapılandırılmış AI sağlayıcısından alt görev önerileri alır. |

Anahtar etkinse `Authorization: Bearer <anahtar>` başlığı zorunludur.

Örnek:

```bash
curl -X POST http://127.0.0.1:4318/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Sunumu hazırla","date":"2026-09-22","start":"14:00","duration":60,"priority":"high"}'
```

## İsteğe bağlı AI

AI varsayılan olarak kapalı ve yapılandırılmamıştır. OpenAI uyumlu bir servisle alt görev önerilerini etkinleştirmek için Bridge'i şu değişkenlerle başlat:

```bash
AKIS_AI_BASE_URL="http://127.0.0.1:11434/v1" \
AKIS_AI_MODEL="qwen3:8b" \
npm run agent:bridge
```

Uzak bir sağlayıcı kullanıyorsan `AKIS_AI_API_KEY` değişkenini de ekle. Anahtar PWA'ya aktarılmaz; Bridge sunucu tarafında `Authorization` başlığını ekler. Ardından uygulamada **Ayarlar → İsteğe bağlı AI** seçeneğini aç. AI yalnızca görev düzenleyicide **AI ile öner** düğmesine basıldığında çağrılır.

## Güvenlik sınırı

- Köprü dış ağ arayüzlerinde dinlemez; yalnızca cihazın loopback adresine bağlanır.
- Tarayıcı erişimi yalnızca resmi canlı uygulama ile `localhost` geliştirme origin’lerine izin verir.
- API anahtarı isteğe bağlıdır ancak paylaşımlı bilgisayarlarda önerilir.
- MCP silme aracı `destructiveHint` bildirir ve sunucu talimatı agent’ın kullanıcı onayı almasını ister.
- Bulut eşitlemesi veya uzak MCP endpoint’i bu sürümde yoktur; bunun için kimlik doğrulamalı kalıcı bir veri deposu gerekir.
