/* Veri Hikâyesi, ana betik.
   Akış: veriyi oku -> grafikleri çiz -> kaydırma adımı değişince sabit grafiği güncelle. */

const VURGU = "#d55e00";   // CSS'teki --vurgu ile aynı
const NOTR  = "#b8c0c9";

// Sabit grafiğin her adımda alacağı hal.
// d: hangi değişken, v: vurgulanacak kategoriler, t: grafik başlığı (bulgu cümlesi)
// NOT: Adım sayısı index.html'deki .step sayısıyla aynı olmalı.
const ADIMLAR = [
  { d: "Contract",        v: [],                    t: "Sözleşme türüne göre müşteri kaybı oranı (%)" },
  { d: "Contract",        v: ["Month-to-month"],    t: "Aylık sözleşmeliler en çok ayrılan grup" },
  { d: "Contract",        v: ["Two year"],          t: "İki yıllık sözleşmede kayıp çok düşük" },
  { d: "InternetService", v: ["Fiber optic"],       t: "Fiber optik müşterileri öne çıkıyor" },
  { d: "InternetService", v: ["DSL", "No"],         t: "DSL ve internetsiz müşteriler daha sadık" },
  { d: "TechSupport",     v: ["No"],                t: "Teknik destek almayanlar daha çok ayrılıyor" },
  { d: "PaymentMethod",   v: ["Electronic check"],  t: "Elektronik çekle ödeyenlerde kayıp yüksek" },
];

// Ekranda görünen Türkçe etiketler (veri dosyasındaki İngilizce değerlerin karşılığı)
const ETIKET = {
  "Month-to-month": "Aylık", "One year": "1 yıllık", "Two year": "2 yıllık",
  "DSL": "DSL", "Fiber optic": "Fiber optik", "No": "Yok",
  "Yes": "Evet", "No internet service": "İnternet yok",
  "Electronic check": "Elektronik çek", "Mailed check": "Posta çeki",
  "Bank transfer (automatic)": "Havale (otomatik)", "Credit card (automatic)": "Kredi kartı (otomatik)",
};
const tr = (k) => ETIKET[k] || k;

const azalt = matchMedia("(prefers-reduced-motion: reduce)").matches;
const anim = azalt ? false : { duration: 600 };
let KAT;

function renkler(etiketler, vurgu) {
  return etiketler.map(e => (vurgu.includes(e) ? VURGU : NOTR));
}

function cubukGrafik(canvasId, d, vurgu, baslik) {
  const anahtarlar = Object.keys(KAT[d]);
  return new Chart(document.getElementById(canvasId), {
    type: "bar",
    data: {
      labels: anahtarlar.map(tr),
      datasets: [{ data: Object.values(KAT[d]), backgroundColor: renkler(anahtarlar, vurgu) }],
    },
    options: {
      indexAxis: "y", maintainAspectRatio: false, animation: anim,
      plugins: {
        legend: { display: false },
        title: { display: true, text: baslik, font: { size: 16 } },
        tooltip: { callbacks: { label: c => ` %${c.parsed.x.toLocaleString("tr-TR")} ayrıldı` } },
      },
      scales: {
        x: { min: 0, max: 100, title: { display: true, text: "Müşteri kaybı oranı (%)" } },
        y: { title: { display: true, text: "Grup" } },
      },
    },
  });
}

function guncelle(grafik, a) {
  const anahtarlar = Object.keys(KAT[a.d]);
  grafik.data.labels = anahtarlar.map(tr);
  grafik.data.datasets[0].data = Object.values(KAT[a.d]);
  grafik.data.datasets[0].backgroundColor = renkler(anahtarlar, a.v);
  grafik.options.plugins.title.text = a.t;
  grafik.update();
}

async function kidemGrafigi() {
  const metin = await fetch("data/kidem.csv").then(r => r.text());
  const satirlar = metin.trim().split("\n").slice(1).map(s => s.split(","));
  new Chart(document.getElementById("grafik-kidem"), {
    type: "line",
    data: {
      labels: satirlar.map(s => s[0]),
      datasets: [{ data: satirlar.map(s => +s[1]), borderColor: VURGU, backgroundColor: VURGU, tension: 0.2, pointRadius: 5 }],
    },
    options: {
      maintainAspectRatio: false, animation: anim,
      plugins: { legend: { display: false },
        title: { display: true, text: "Yeni müşteriler eskilerden çok daha sık ayrılıyor", font: { size: 16 } } },
      scales: {
        x: { title: { display: true, text: "Abonelik süresi (ay)" } },
        y: { min: 0, max: 100, title: { display: true, text: "Müşteri kaybı oranı (%)" } },
      },
    },
  });
}

async function dagilimGrafigi() {
  const metin = await fetch("data/ornek.csv").then(r => r.text());
  const s = metin.trim().split("\n").slice(1).map(x => x.split(",").map(Number));
  const nokta = (k) => s.filter(r => r[2] === k).map(r => ({ x: r[0], y: r[1] }));
  new Chart(document.getElementById("grafik-dagilim"), {
    type: "scatter",
    data: { datasets: [
      { label: "Kalan müşteri", data: nokta(0), backgroundColor: NOTR, pointRadius: 3 },
      { label: "Ayrılan müşteri", data: nokta(1), backgroundColor: VURGU, pointStyle: "triangle", pointRadius: 5 },
    ] },
    options: {
      maintainAspectRatio: false, animation: anim,
      plugins: { title: { display: true, text: "Ayrılanlar sol üstte toplanıyor: kısa süre, yüksek ücret", font: { size: 16 } } },
      scales: {
        x: { title: { display: true, text: "Abonelik süresi (ay)" } },
        y: { title: { display: true, text: "Aylık ücret ($)" } },
      },
    },
  });
}

async function basla() {
  KAT = await fetch("data/kategoriler.json").then(r => r.json());
  if (KAT._ornek) document.getElementById("ornek-uyari").hidden = false;

  // 1) Sabit grafik + kaydırma adımları
  const sabit = cubukGrafik("grafik", ADIMLAR[0].d, ADIMLAR[0].v, ADIMLAR[0].t);
  const adimlar = document.querySelectorAll(".step");
  const scroller = scrollama();
  scroller.setup({ step: ".step", offset: 0.5 }).onStepEnter(({ index, element }) => {
    adimlar.forEach(s => s.classList.remove("active"));
    element.classList.add("active");
    guncelle(sabit, ADIMLAR[index]);
  });
  window.addEventListener("resize", scroller.resize);

  // 2) Kıdem çizgi grafiği
  kidemGrafigi();

  dagilimGrafigi();

  // 3) Okuyucu etkileşimi: açılır menü
  const kesif = cubukGrafik("grafik-kesif", "Contract", [], "Seçilen değişkene göre müşteri kaybı oranı");
  document.getElementById("secim").addEventListener("change", e => {
    guncelle(kesif, { d: e.target.value, v: [], t: "Seçilen değişkene göre müşteri kaybı oranı" });
  });
}
basla();
