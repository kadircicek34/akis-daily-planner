import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = 'http://127.0.0.1:4173'
const candidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean)

async function chromePath() {
  for (const candidate of candidates) {
    try { await access(candidate); return candidate } catch { /* try the next browser */ }
  }
  throw new Error('Chrome/Chromium bulunamadı. CHROME_PATH ortam değişkenini ayarlayın.')
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch { /* preview is still starting */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Üretim önizlemesi başlatılamadı.')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
  process.stdout.write(`✓ ${message}\n`)
}

const server = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], { stdio: 'ignore' })
let browser

try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: await chromePath(), headless: true, args: ['--no-sandbox'] })

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await desktop.goto(url, { waitUntil: 'networkidle' })
  assert(await desktop.title() === 'Akış — Günlük Planlayıcı', 'uygulama başlığı doğru')
  assert(await desktop.locator('.timeline-item').count() === 5, 'örnek zaman çizelgesi yüklendi')
  assert(await desktop.evaluate(() => document.body.scrollWidth === innerWidth), 'masaüstünde yatay taşma yok')
  await desktop.getByRole('button', { name: 'Görevlerde ara' }).click()
  await desktop.locator('.search-box input').fill('odak')
  assert(await desktop.locator('.search-modal').getByText('Odaklanma zamanı').count() === 1, 'arama başlık ve etiketlerde çalışıyor')
  await desktop.locator('.search-modal').getByRole('button', { name: 'Kapat' }).click()

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(url, { waitUntil: 'networkidle' })
  assert(await mobile.evaluate(() => document.body.scrollWidth === innerWidth), 'mobil görünümde yatay taşma yok')
  await mobile.locator('.nav-add').click()
  await mobile.locator('input[placeholder="Ne yapacaksın?"]').fill('Smoke test görevi')
  await mobile.getByRole('button', { name: 'Kaydet' }).click()
  assert(await mobile.getByText('Smoke test görevi').count() === 1, 'görev oluşturma akışı çalışıyor')
  await mobile.getByText('Ayarlar').last().click()
  await mobile.getByRole('button', { name: 'Değiştir' }).click()
  assert(await mobile.evaluate(() => localStorage.getItem('akis-week-start')) === 'monday', 'hafta başlangıcı tercihi kaydediliyor')
  const download = mobile.waitForEvent('download')
  await mobile.getByRole('button', { name: 'Dışa aktar' }).click()
  assert((await download).suggestedFilename().startsWith('akis-yedek-'), 'JSON yedekleme çalışıyor')
  await mobile.locator('.settings-modal').getByRole('button', { name: 'Kapat' }).click()

  const manifest = await (await mobile.request.get(`${url}/manifest.webmanifest`)).json()
  assert(manifest.display === 'standalone' && manifest.icons.length >= 3, 'PWA manifesti geçerli')

  await mobile.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    }
  })
  await mobile.reload({ waitUntil: 'networkidle' })
  await mobile.context().setOffline(true)
  await mobile.reload({ waitUntil: 'domcontentloaded' })
  assert(await mobile.locator('.timeline-item').count() >= 5, 'uygulama çevrimdışı yeniden açılıyor')
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
