// Valós magyar közműszámlák (E.ON, EMoGÁ, MVM, távhő-szolgáltatók) alapján
// tanult, mintaillesztéses adatkinyerés feltöltött PDF-ekből.
//
// FONTOS #1: a PDF-szövegkinyerés (pdf-parse) a kétoszlopos számla-elrendezéseknél
// gyakran ugyanahhoz a sorhoz fűzi a bal és jobb oszlop szomszédos celláit
// (pl. "Adószám:13980335-2-18Teljesítés időpontja:2026.05.04"), elválasztó
// karakter nélkül. Emiatt minden mintát úgy terveztünk, hogy csak addig
// fogadjon el karaktereket, amíg az adott mező formátumába illik (pl. pontosan
// 8-1-2 számjegyes adószám-alak), sosem "amíg egy szóköz nem jön".
//
// FONTOS #2: néhány PDF a szavak között NEM sima szóközt (U+0020), hanem
// nem törhető szóközt (U+00A0) tartalmaz (pl. "Számlázott időszak") —
// ezért MINDEN címke-mintában `\s+`-t használunk szóköz helyett, mert a JS
// `\s` osztály az U+00A0-t is lefedi, egy szó szerinti szóköz karakter nem.
//
// A cél NEM egy tökéletes, minden jövőbeli szolgáltatóra érvényes OCR, hanem
// egy megbízható, jó eséllyel általánosító kinyerés a bemutatott formátumokhoz
// — ahol egy mező bizonytalan volna, inkább üresen hagyjuk kézi kitöltésre,
// mint hogy rosszul találjuk ki (SPEC.md: "adatok helyesen jelenjenek meg").

export interface ExtractedInvoiceData {
  providerName: string | null;
  providerTaxNumber: string | null;
  customerTaxNumber: string | null;
  customerName: string | null;
  siteAddress: string | null;
  podCode: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  quantity: number | null;
  unit: string | null;
  netAmount: number | null;
  vatRate: number | null;
  grossAmount: number | null;
  energyTypeGuess: string | null;
  warnings: string[];
}

/** Egy szóközt tartalmazó magyar címke-kifejezést regex-biztonságos, az
 * U+00A0-t is elfogadó mintává alakít. Pl. "Fizetési határidő" ->
 * "Fizetési\s+határidő". */
function flexible(label: string): string {
  return label
    .split(/[  ]+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}

// A `\d+` elöl mohón felfalja az összes egymást követő számjegyet (így egy
// elválasztó nélküli "1510" is teljes egészében illeszkedik, nem csak az
// első 3 karaktere), utána a szóközös ezres-csoportok és a tizedesjegy
// opcionálisan folytatódhatnak.
const NUMBER = "\\d+(?:[\\s\\u00A0]\\d{3})*(?:[.,]\\d+)?";

function huDateToIso(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseHuNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/[\s ]/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function extractDate(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${flexible(label)}\\s*:?\\s*(\\d{4})\\.\\s*(\\d{1,2})\\.\\s*(\\d{1,2})\\.?`, "i");
    const match = text.match(re);
    if (match) return huDateToIso(match[1], match[2], match[3]);
  }
  return null;
}

function extractPeriod(text: string, labels: string[]): { start: string | null; end: string | null } {
  for (const label of labels) {
    const re = new RegExp(
      `${flexible(label)}\\s*:?\\s*(\\d{4})\\.(\\d{1,2})\\.(\\d{1,2})\\.?\\s*-\\s*(\\d{4})\\.(\\d{1,2})\\.(\\d{1,2})\\.?`,
      "i",
    );
    const match = text.match(re);
    if (match) {
      return { start: huDateToIso(match[1], match[2], match[3]), end: huDateToIso(match[4], match[5], match[6]) };
    }
  }
  return { start: null, end: null };
}

/** Egy címke utáni rövid ablakban keres egy legalább 3 jegyű, magyar ezres
 * tagolású számot — mert a glued szövegnél az érték nem mindig közvetlenül
 * a címke után áll (ld. modul-fejléc komment). */
function extractAmountNear(text: string, labelPattern: string, windowChars = 160): number | null {
  const labelRe = new RegExp(labelPattern, "i");
  const labelMatch = text.match(labelRe);
  if (!labelMatch || labelMatch.index === undefined) return null;
  const windowText = text.slice(
    labelMatch.index + labelMatch[0].length,
    labelMatch.index + labelMatch[0].length + windowChars,
  );
  const numberMatch = windowText.match(new RegExp(`(${NUMBER})`));
  if (!numberMatch) return null;
  return parseHuNumber(numberMatch[0]);
}

const TAX_NUMBER_PATTERN = /\d{8}-\d-\d{2}/g;

function extractTaxNumbers(text: string): { provider: string | null; providerIndex: number; customer: string | null } {
  const matches = Array.from(text.matchAll(TAX_NUMBER_PATTERN));
  if (matches.length === 0) return { provider: null, providerIndex: -1, customer: null };
  if (matches.length === 1) return { provider: null, providerIndex: -1, customer: matches[0][0] };
  return {
    provider: matches[0][0],
    providerIndex: matches[0].index ?? -1,
    customer: matches[matches.length - 1][0],
  };
}

function extractPodCode(text: string): string | null {
  // Földgáz POD: mindig "39N" prefix + pontosan 16 karakter (SPEC.md 4.5) —
  // a rögzített hossz miatt biztonságosan levágható, még glued szövegben is.
  const gasMatch = text.match(new RegExp(`(?:POD|${flexible("Mérési pont azonosító")})[^\\d]{0,25}(39N[0-9A-Z]{13})`, "i"));
  if (gasMatch) return gasMatch[1];

  // Villamos energia POD: "HU" prefix, jellemzően 30+ karakter, saját sorban áll.
  const elecMatch = text.match(new RegExp(`${flexible("Mérési pont azonosító")}[^\\n]{0,15}\\n?\\s*(HU[0-9A-Z\\-]{15,45})`, "i"));
  if (elecMatch) return elecMatch[1];

  return null;
}

function extractQuantity(text: string): { quantity: number | null; unit: string | null } {
  // "Fogyasztás összesen: 199 kWh" — a leggyakoribb, egyértelmű összesítő sor.
  const summaryMatch = text.match(
    new RegExp(`${flexible("Fogyasztás összesen")}\\s*:?\\s*(${NUMBER})\\s*(kWh|MWh|m³|GJ|liter|kg)`, "i"),
  );
  if (summaryMatch) return { quantity: parseHuNumber(summaryMatch[1]), unit: summaryMatch[2] };

  // "Mennyiség (kWh):\n389,847" — telephelyi részletező sor. A táblázatfejléc
  // ("Mennyiség\n(kWh)\nEgységár...") nem illeszkedik, mert utána nem szám jön.
  const mennyisegRe = new RegExp(`Mennyiség\\s*\\((kWh|MWh|m³|GJ)\\)\\s*:?\\s*(${NUMBER})`, "gi");
  const match = mennyisegRe.exec(text);
  if (match) return { quantity: parseHuNumber(match[2]), unit: match[1] };

  return { quantity: null, unit: null };
}

function guessEnergyType(text: string, providerName: string | null): string | null {
  const haystack = `${text} ${providerName ?? ""}`.toLowerCase();
  if (haystack.includes("távhő")) return "district_heating";
  if (haystack.includes("gáz kereskedelmi") || haystack.includes("földgáz")) return "gas";
  if (haystack.includes("villamos energia") || haystack.includes("áramhálózati") || haystack.includes("energiakereskedelmi")) {
    return "electricity";
  }
  if (haystack.includes("vízmű") || haystack.includes("vízszolgáltat")) return "water";
  if (haystack.includes("csatorna")) return "sewage";
  return null;
}

const COMPANY_SUFFIX = "(?:Zrt\\.?|Kft\\.?|Rt\\.?|Bt\\.?|Nyrt\\.?|Zártkörűen Működő Részvénytársaság)";
const CUSTOMER_LABEL_WORDS = ["vevő", "felhasználó", "díjfizető", "szerződő", "fizető", "ügyfél"];

function isCustomerLabelledLine(line: string): boolean {
  const lower = line.toLowerCase();
  return CUSTOMER_LABEL_WORDS.some((word) => lower.includes(word));
}

/** A szolgáltató nevét elsősorban a saját adószáma közelében keresi (mert ez
 * a legmegbízhatóbb horgony), explicit címke ("Szolgáltató neve:"/"Eladó:")
 * esetén azt részesíti előnyben. */
function extractProviderName(text: string, providerTaxIndex: number): string | null {
  const szolgaltatoMatch = text.match(new RegExp(`${flexible("Szolgáltató neve")}:\\s*\\n?([\\s\\S]{3,90}?)\\n?Cím`, "i"));
  if (szolgaltatoMatch) return szolgaltatoMatch[1].replace(/\s+/g, " ").trim();

  const eladoMatch = text.match(/Eladó:\s*\n?([^\n]{3,90})/i);
  if (eladoMatch) return eladoMatch[1].trim();

  if (providerTaxIndex >= 0) {
    const before = text.slice(Math.max(0, providerTaxIndex - 250), providerTaxIndex);
    const lines = before.split("\n").filter((line) => line.trim().length > 0);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (new RegExp(`\\b${COMPANY_SUFFIX}\\s*$`, "i").test(line) && !isCustomerLabelledLine(line)) {
        return line;
      }
    }
  }

  const companyLine = text.match(new RegExp(`^(?!.*(?:${CUSTOMER_LABEL_WORDS.join("|")}))[^\\n]*\\b${COMPANY_SUFFIX}\\s*$`, "im"));
  if (companyLine) return companyLine[0].trim();

  return null;
}

// Ha a cím egy sorban glued szöveggel folytatódik egy másik mezővel
// (pl. "...Welther Károly út 4. Elszámolási ciklus:2026.06.01"), ez a minta
// megtalálja, hol kezdődik a következő címke (max. két szóból álló,
// kisbetűs kifejezés, amit kettőspont követ), és ott vágja le az elfogást.
const NEXT_LABEL_HINT = /\s[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+(?:\s[a-záéíóöőúüű]+){0,2}\s*:/;

function extractSiteAddress(text: string): string | null {
  const patterns = [
    new RegExp(`${flexible("Felhasználási hely címe")}\\s*:?\\s*\\n?([^\\n]+)`, "i"),
    new RegExp(`${flexible("Felhasználási hely")}\\s*:?\\s*\\n?([^\\n]+)`, "i"),
    new RegExp(`${flexible("Fogyasztási hely címe")}\\s*:?\\s*\\n?([^\\n]+)`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].replace(/\s+/g, " ").trim();
      const nextLabelMatch = value.match(NEXT_LABEL_HINT);
      return nextLabelMatch && nextLabelMatch.index ? value.slice(0, nextLabelMatch.index).trim() : value;
    }
  }
  return null;
}

/** Az ügyfél neve a "Vevő/Felhasználó/Díjfizető/Szerződő-Fizető neve" címkék
 * valamelyike után áll — ugyanaz a négy változat, mint az adószámnál. */
function extractCustomerName(text: string): string | null {
  const patterns = [
    /Vevő neve\s*:?\s*\n?([^\n]{2,80})/i,
    new RegExp(`${flexible("Felhasználó neve")}\\s*:?\\s*\\n?([^\\n]{2,80})`, "i"),
    new RegExp(`${flexible("Díjfizető neve")}\\s*:?\\s*\\n?([^\\n]{2,80})`, "i"),
    /Szerződő\/Fizető\s*:?\s*\n?([^\n]{2,80})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export function extractInvoiceData(rawText: string): ExtractedInvoiceData {
  const warnings: string[] = [];
  const text = rawText;

  const taxNumbers = extractTaxNumbers(text);
  const providerName = extractProviderName(text, taxNumbers.providerIndex);
  const customerName = extractCustomerName(text);
  // A "...sorszáma" címkéjű mezőt minden eddig látott formátumban (E.ON,
  // VASIVÍZ) tisztán számjegyek alkotják — ezt szándékosan csak számjegyekre
  // illesztjük, mert két oszlop néhol elválasztó nélkül fűződik egybe (pl.
  // "sorszáma:262312160704A szolgáltatás megnevezése:"), és egy betűket is
  // elfogadó minta belelógna a következő mező első karakterébe.
  const invoiceNumberMatch =
    text.match(new RegExp(`${flexible("Számla sorszáma")}\\s*:?\\s*(\\d{4,})`, "i")) ??
    text.match(new RegExp(`${flexible("Számla száma")}\\s*:?\\s*([A-Z0-9\\/]{4,})`, "i")) ??
    text.match(/Sorszám\s*:?\s*\n?\s*([A-Z0-9\/]{4,})/i);
  const issueDate = extractDate(text, ["Számla kelte", "Bizonylatdátum"]);
  const dueDate = extractDate(text, ["Fizetési határidő"]);
  const period = extractPeriod(text, ["Elszámolási időszak", "Számlázott időszak", "Elszámolt időszak"]);
  const podCode = extractPodCode(text);
  const { quantity, unit } = extractQuantity(text);
  const siteAddress = extractSiteAddress(text);
  const energyTypeGuess = guessEnergyType(text, providerName);

  const grossAmount =
    extractAmountNear(text, `${flexible("Bruttó számlaérték összesen")}\\**\\s*:?`) ??
    extractAmountNear(text, `${flexible("Fizetendő összeg")}\\s*:?`) ??
    extractAmountNear(text, "Fizetendő\\s*:?");
  // Csak az egyértelmű "...összesen" jellegű összesítő sorokat fogadjuk el —
  // az önmagában álló "Nettó díj" gyakran táblázatfejléc, nem tényleges érték.
  const netAmount = extractAmountNear(text, `${flexible("Nettó számlaérték összesen")}\\s*:?`);

  let vatRate: number | null = null;
  if (netAmount !== null && grossAmount !== null && netAmount > 0) {
    vatRate = Math.round(((grossAmount - netAmount) / netAmount) * 100);
  } else {
    const vatMatch = text.match(/(\d{1,2})\s*%/);
    vatRate = vatMatch ? Number(vatMatch[1]) : null;
  }

  if (!taxNumbers.customer) warnings.push("Nem sikerült felismerni az ügyfél adószámát.");
  if (!invoiceNumberMatch) warnings.push("Nem sikerült felismerni a számlaszámot.");
  if (!period.start || !period.end) warnings.push("Nem sikerült felismerni a számlázási időszakot.");
  if (!podCode) warnings.push("Nem sikerült felismerni a mérési pont (POD) azonosítót — add meg kézzel.");
  if (quantity === null) {
    warnings.push("Nem sikerült megbízhatóan felismerni a fogyasztott mennyiséget — ellenőrizd és add meg kézzel.");
  }
  if (grossAmount === null) warnings.push("Nem sikerült felismerni a fizetendő (bruttó) összeget.");

  return {
    providerName,
    providerTaxNumber: taxNumbers.provider,
    customerTaxNumber: taxNumbers.customer,
    customerName,
    siteAddress,
    podCode,
    invoiceNumber: invoiceNumberMatch ? invoiceNumberMatch[1] : null,
    issueDate,
    periodStart: period.start,
    periodEnd: period.end,
    dueDate,
    quantity,
    unit,
    netAmount,
    vatRate,
    grossAmount,
    energyTypeGuess,
    warnings,
  };
}
