// "Ailede yeni" bölümünü numexai.com.tr'deki tek kaynaktan yeniler (geride kalmasın).
// Kaynak: https://www.numexai.com.tr/numex-aile.json (Numex sayfa kaydından üretilir).
// YALNIZ EKLER (kurucu 24.10: "daha önce yapılmış sayfaları bozma, bundan sonrası için"): README'nin elle yazılmış
// kısmına dokunulmaz; işaretler arasındaki bölüm (<!-- NUMEX-AILE:BAS --> … <!-- NUMEX-AILE:SON -->) yeniden yazılır.
// Kural: README'de hiç geçmeyen YENİ ALAN ADI = yeni ürün satırı; geçen ürünün README'de olmayan yeni sayfası = "yeni sayfalar".
// Kayıttan çıkan site bu bölümden de kendiliğinden düşer. Yeni bir şey yoksa bölüm boş kalır.
// Yerel deneme: AILE_KAYNAK=/yol/numex-aile.json node scripts/aile-esitle.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const README = 'profile/README.md';
const KAYNAK = process.env.AILE_KAYNAK || 'https://www.numexai.com.tr/numex-aile.json';
const BAS = '<!-- NUMEX-AILE:BAS', SON = '<!-- NUMEX-AILE:SON -->';
const SIMGE = { 'numexai.com.tr': '💬', '3d.numexai.com.tr': '🧊', 'pedia.numexai.com.tr': '📖', 'market.numexai.com.tr': '🛍️', 'okul.numexai.com.tr': '🎓',
  'evren.numexai.com.tr': '🌌', 'turkiye.numexai.com.tr': '🗺️', 'cv.numexai.com.tr': '📄', 'codex.numexai.com.tr': '🧩', 'hub.numexai.com.tr': '📦', 'forge.numexai.com.tr': '🏗️' };

const buyuk = (s) => (s ? s[0].toLocaleUpperCase('tr-TR') + s.slice(1) : s);
const gecer = (metin, adres) => metin.includes(adres.replace(/\/+$/, '')) || metin.includes(adres.replace('://www.', '://').replace(/\/+$/, ''));

async function oku(kaynak) {
  if (/^https?:/.test(kaynak)) { const r = await fetch(kaynak); if (!r.ok) throw new Error(`${kaynak} → HTTP ${r.status}`); return r.json(); }
  return JSON.parse(readFileSync(kaynak, 'utf8'));
}

// elle: README'nin işaretler dışındaki metni (orada geçen şey "zaten var" sayılır)
export function blokYaz(aile, elle) {
  const yeniUrun = aile.urunler.filter((u) => !elle.includes(u.alan));
  const yeniSayfa = aile.urunler.filter((u) => elle.includes(u.alan))
    .map((u) => ({ u, sayfalar: (u.icinde || []).filter((i) => !gecer(elle, i.adres)) }))
    .filter((x) => x.sayfalar.length);
  if (!yeniUrun.length && !yeniSayfa.length) return `${BAS} — numexai.com.tr/numex-aile.json'dan her gün kendiliğinden güncellenir; elle düzenleme -->\n${SON}`;
  const satir = [`${BAS} — numexai.com.tr/numex-aile.json'dan her gün kendiliğinden güncellenir; elle düzenleme -->`, '### ✨ Ailede yeni', ''];
  if (yeniUrun.length) {
    satir.push('| Ürün | Ne yapar |', '|---|---|');
    for (const u of yeniUrun) satir.push(`| ${SIMGE[u.alan] || '✨'} [**${u.ad}**](${u.adres}) | ${buyuk(u.amac)} |`);
    satir.push('');
  }
  if (yeniSayfa.length) {
    satir.push('**Yeni sayfalar:**');
    for (const { u, sayfalar } of yeniSayfa) satir.push(`- ${SIMGE[u.alan] || '✨'} **${u.ad}:** ${sayfalar.map((i) => `[${i.ad}](${i.adres})`).join(' · ')}`);
    satir.push('');
  }
  satir.push(SON);
  return satir.join('\n');
}

export function readmeGuncelle(md, aile) {
  const bas = md.indexOf(BAS), son = md.indexOf(SON);
  if (bas < 0 || son < 0 || son < bas) throw new Error('README işaretleri yok (NUMEX-AILE:BAS / SON)');
  const elle = md.slice(0, bas) + md.slice(son + SON.length);
  return md.slice(0, bas) + blokYaz(aile, elle) + md.slice(son + SON.length);
}

if (process.argv[1]?.endsWith('aile-esitle.mjs')) {
  const aile = await oku(KAYNAK);
  if (!Array.isArray(aile.urunler) || aile.urunler.length < 3) throw new Error('Kaynak beklenmedik biçimde (ürün listesi yok/çok kısa) — README değiştirilmedi');
  const eski = readFileSync(README, 'utf8');
  const yeni = readmeGuncelle(eski, aile);
  if (yeni === eski) console.log('Ailede yeni — değişiklik yok');
  else { writeFileSync(README, yeni); console.log('Ailede yeni bölümü güncellendi'); }
}
