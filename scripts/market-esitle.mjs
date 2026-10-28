// Numex Market sayılarını (toplam uygulama, kategori dağılımı) numexai.com.tr vitrininden yeniler; README'ler ve kart geride kalmasın.
// Kaynak: https://www.numexai.com.tr/api/hub/apps — yalnız sahibi olmayan (Numex'in otonom ürettiği) uygulamalar sayılır.
// YALNIZ SAYILARI DEĞİŞTİRİR: metnin geri kalanına dokunulmaz. Kaynak okunamaz ya da sayı %20'den çok düşerse hiçbir şey yazılmaz.
// Aynı dosya numex-market, numex_nedir ve .github repolarında durur; hangi dosyaların yenileneceği MARKET_DOSYALAR ile verilir.
//   MARKET_SAYAC   önceki sayıların tutulduğu JSON (varsayılan scripts/market-sayac.json)
//   MARKET_DOSYALAR virgülle ayrılmış dosyalar (varsayılan README.md)
//   --kart         gorseller/kaynak/banner.html'den gorseller/banner.png çizer (yalnız numex-market; playwright gerekir)
//   --yerel        kaynağa gitmeden, sayaçtaki veriyle yalnız kartı çizer
// Yerel deneme: MARKET_KAYNAK=/yol/apps.json node scripts/market-esitle.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const KAYNAK = process.env.MARKET_KAYNAK || 'https://www.numexai.com.tr/api/hub/apps';
const SAYAC = process.env.MARKET_SAYAC || 'scripts/market-sayac.json';
const DOSYALAR = (process.env.MARKET_DOSYALAR || 'README.md').split(',').map((s) => s.trim()).filter(Boolean);

// Sıra karttaki sıradır; "Diğer" hep sonda (tek kalırsa kartta tam genişlik kaplar).
export const KOVALAR = [
  { ad: 'Oyunlar', simge: '🎮', anahtar: /\b(oyun\w*|games?)\b/ },
  { ad: 'Simülasyon', simge: '🧪', anahtar: /\b(simulasyon\w*|simulations?|gorsellestirme)\b/ },
  { ad: 'Yapay Zekâ', simge: '🤖', anahtar: /\b(yapay zeka|ai|ml|llm)\b/ },
  { ad: 'Araçlar', simge: '🛠️', anahtar: /\b(arac\w*|yardimci|tools?|utilit\w*)\b/ },
  { ad: 'Üretkenlik', simge: '⚡', anahtar: /\b(uretkenlik|productivity|is araclari|business)\b/ },
  { ad: 'Web / OS', simge: '🖥️', anahtar: /\b(web|os|isletim sistemi|desktop|masaustu)\b/ },
  { ad: 'Diğer', simge: '📦', anahtar: null, aciklama: 'tanıtım sayfaları, ilan platformu ve daha fazlası' },
];
// README kategori tablolarındaki satır adları (yalnız bunlar güncellenir; "Oyun Bahçesi" gibi başka satırlara dokunulmaz)
const TABLO_ADLARI = ['Oyunlar', 'Simülasyon', 'Yapay Zeka', 'Yapay Zekâ', 'Araçlar', 'Araçlar / Yardımcı', 'Üretkenlik', 'Web / OS', 'Diğer'];

const sade = (s) => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

export function kova(kategori) {
  const s = sade(kategori);
  // İlk eşleşen kova kazanır (sıra KOVALAR'daki gibi); hiçbirine uymayan "Diğer"e düşer
  return KOVALAR.find((k) => k.anahtar && k.anahtar.test(s))?.ad || 'Diğer';
}

export function say(uygulamalar) {
  const numex = uygulamalar.filter((u) => !u.owner && u.is_private !== true);
  const sayi = Object.fromEntries(KOVALAR.map((k) => [k.ad, 0]));
  for (const u of numex) sayi[kova(u.category)]++;
  return {
    toplam: numex.length,
    kategoriler: KOVALAR.map(({ ad, simge, aciklama }) => ({ ad, simge, sayi: sayi[ad], ...(aciklama ? { aciklama } : {}) })),
  };
}

const kategoriSayisi = (v) => v.kategoriler.filter((k) => k.sayi > 0).length;
const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Metindeki eski sayıları yenileriyle değiştirir; yalnız Market'ten söz eden satırlara bakar.
export function metniGuncelle(md, eski, yeni) {
  const eT = eski.toplam, yT = yeni.toplam, eK = kategoriSayisi(eski), yK = kategoriSayisi(yeni);
  const toplamRe = new RegExp(`(?<![\\d.v])${eT}(?![\\d.])`, 'g');
  const kategoriRe = new RegExp(`(?<![\\d.'’])${eK}(?= (kategori|categor))`, 'g');
  const statRe = new RegExp(`\\|\\s*\\*\\*${eT}\\*\\*\\s*\\|\\s*\\*\\*${eK}\\*\\*\\s*\\|\\s*\\*\\*₺0\\*\\*\\s*\\|`, 'g');
  const satirRe = new RegExp(`^(\\|\\s*\\S+\\s+\\*\\*)(${TABLO_ADLARI.map(kacis).join('|')})(\\*\\*\\s*\\|\\s*)(\\d+)(\\s*\\|)`);
  const yeniSayi = Object.fromEntries(yeni.kategoriler.map((k) => [k.ad, k.sayi]));
  return md.split('\n').map((satir) => {
    satir = satir.replace(statRe, (m) => m.replace(`**${eT}**`, `**${yT}**`).replace(`**${eK}**`, `**${yK}**`));
    satir = satir.replace(satirRe, (m, a, ad, b, n, c) => a + ad + b + yeniSayi[kova(ad)] + c);
    if (/market|uygulama|\bapps\b/i.test(satir)) satir = satir.replace(toplamRe, String(yT)).replace(kategoriRe, String(yK));
    return satir;
  }).join('\n');
}

async function oku(kaynak) {
  if (/^https?:/.test(kaynak)) {
    const r = await fetch(kaynak, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`${kaynak} → HTTP ${r.status}`);
    return r.json();
  }
  return JSON.parse(readFileSync(kaynak, 'utf8'));
}

async function kartCiz(veri) {
  const { chromium } = await import('playwright');
  const tarayici = await chromium.launch();
  const sayfa = await tarayici.newPage({ viewport: { width: 1280, height: 640 } });
  await sayfa.addInitScript((v) => { window.MARKET = v; }, veri);
  await sayfa.goto(pathToFileURL(resolve('gorseller/kaynak/banner.html')).href, { waitUntil: 'networkidle' });
  await sayfa.evaluate(() => document.fonts.ready);
  await sayfa.screenshot({ path: 'gorseller/banner.png' });
  await tarayici.close();
  console.log('Kart çizildi: gorseller/banner.png');
}

if (process.argv[1]?.endsWith('market-esitle.mjs')) {
  const eski = JSON.parse(readFileSync(SAYAC, 'utf8'));
  if (process.argv.includes('--yerel')) { await kartCiz(eski); process.exit(0); }

  const liste = await oku(KAYNAK);
  if (!Array.isArray(liste)) throw new Error('Kaynak beklenmedik biçimde (dizi değil) — hiçbir şey değiştirilmedi');
  const yeni = say(liste);
  if (yeni.toplam < 1 || yeni.toplam < eski.toplam * 0.8) {
    throw new Error(`Kaynakta ${yeni.toplam} uygulama var, önceki ${eski.toplam} — beklenmedik düşüş, hiçbir şey değiştirilmedi`);
  }
  if (JSON.stringify(yeni) === JSON.stringify(eski)) { console.log(`Market — değişiklik yok (${yeni.toplam} uygulama)`); process.exit(0); }

  for (const dosya of DOSYALAR) {
    const md = readFileSync(dosya, 'utf8');
    const guncel = metniGuncelle(md, eski, yeni);
    if (guncel !== md) { writeFileSync(dosya, guncel); console.log(`${dosya} güncellendi`); }
  }
  writeFileSync(SAYAC, JSON.stringify(yeni, null, 2) + '\n');
  console.log(`Market: ${eski.toplam} → ${yeni.toplam} uygulama, ${kategoriSayisi(yeni)} kategori`);
  if (process.argv.includes('--kart')) await kartCiz(yeni);
}
