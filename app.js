// ─────────────────────────────────────────────────────────────────────────────
// Sjabbat Tijden Widget — app.js
// ─────────────────────────────────────────────────────────────────────────────

let currentZone  = 'amsterdam';
let pickerIndex  = 0; // index into allEntries array

// ── Datum helpers ─────────────────────────────────────────────────────────────

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getThisFriday() {
  const today = new Date();
  const day   = today.getDay();
  const offset = day === 6 ? 6 : day === 0 ? 5 : 5 - day;
  return addDays(today, offset);
}

function fmtShort(d) {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function fmtDate(d) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtWeekday(d) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short' });
}

// ── Data lookup ───────────────────────────────────────────────────────────────

function getEntry(iso) { return SJABBAT_DATA[iso] || null; }

// Zoek Jomtov in de 6 dagen VÓÓR een bepaalde vrijdag
function getJomtovBeforeFriday(fridayDate) {
  for (let i = 1; i <= 6; i++) {
    const d   = addDays(fridayDate, -i);
    const iso = toISO(d);
    const entry = getEntry(iso);
    if (entry && entry.jomtov) return { date: d, iso, entry };
  }
  return null;
}

// ── Gesorteerde lijst van alle entries ───────────────────────────────────────

// allEntries = array van { iso, date, entry } voor elke rij in SJABBAT_DATA
let allEntries = [];

function buildAllEntries() {
  allEntries = Object.keys(SJABBAT_DATA)
    .sort()
    .map(iso => ({ iso, date: new Date(iso + 'T12:00:00'), entry: SJABBAT_DATA[iso] }));
}

// ── Kaartbouw ─────────────────────────────────────────────────────────────────

function buildCard({ iso, badgeText, badgeClass, isCurrent }) {
  const entry   = getEntry(iso);
  const date    = new Date(iso + 'T12:00:00');

  if (!entry) {
    return `<div class="week-card${isCurrent?' current':''}">
      <span class="week-badge ${badgeClass}">${badgeText}</span>
      <div class="week-parasha">—</div>
      <div class="week-dates">${fmtDate(date)}</div>
      <div class="time-row"><span class="time-label">Begin</span><span class="time-value none">geen data</span></div>
      <div class="time-row"><span class="time-label">Einde</span><span class="time-value none">geen data</span></div>
    </div>`;
  }

  const isJomtov = !!entry.jomtov;
  const cardCls  = ['week-card', isCurrent ? 'current' : '', isJomtov ? 'jomtov' : ''].filter(Boolean).join(' ');
  const jtTag    = isJomtov ? `<span class="jomtov-tag">Jomtov</span><br>` : '';
  const begin    = entry.begin?.[currentZone];
  const einde    = entry.einde?.[currentZone];

  // Determine day labels based on weekday
  const day = date.getDay();
  const dayLabel = date.toLocaleDateString('nl-NL', { weekday: 'short' });
  // Einde is always next day
  const eindDate = addDays(date, 1);
  const eindLabel = eindDate.toLocaleDateString('nl-NL', { weekday: 'short' });

  const beginHtml = begin ? `<span class="time-value">${begin}</span>` : `<span class="time-value none">—</span>`;
  const eindeHtml = einde ? `<span class="time-value">${einde}</span>` : `<span class="time-value none">—</span>`;

  return `
    <div class="${cardCls}">
      <span class="week-badge ${badgeClass}">${badgeText}</span>
      ${jtTag}
      <div class="week-parasha">${entry.naam}</div>
      <div class="week-dates">${fmtDate(date)}</div>
      <div class="time-row">
        <span class="time-label">Begin <span class="time-day">${dayLabel}</span></span>
        ${beginHtml}
      </div>
      <div class="time-row">
        <span class="time-label">Einde <span class="time-day">${eindLabel}</span></span>
        ${eindeHtml}
      </div>
    </div>`;
}

// ── Vind huidig en volgend item op basis van vandaag ─────────────────────────

function findCurrentIndex() {
  const today    = toISO(new Date());
  const thisFri  = toISO(getThisFriday());

  // Zoek de eerstvolgende entry op of na vandaag
  for (let i = 0; i < allEntries.length; i++) {
    if (allEntries[i].iso >= today) return i;
  }
  return allEntries.length - 1;
}

// ── Renderen ──────────────────────────────────────────────────────────────────

function renderWeeks() {
  const curIdx  = findCurrentIndex();
  const nextIdx = Math.min(curIdx + 1, allEntries.length - 1);

  const cur  = allEntries[curIdx];
  const next = allEntries[nextIdx];

  // Check of er een Jomtov valt vlak voor de eerstvolgende Sjabbat
  const thisFri = getThisFriday();
  const jt = getJomtovBeforeFriday(thisFri);

  let card1, card2;

  // Kaart 1: als Jomtov deze week en nog niet in allEntries als "huidige" → toon jomtov
  if (jt && jt.iso < cur.iso) {
    card1 = buildCard({ iso: jt.iso, badgeText: 'Deze week', badgeClass: 'badge-current', isCurrent: true });
    card2 = buildCard({ iso: cur.iso, badgeText: 'Volgende', badgeClass: 'badge-next', isCurrent: false });
  } else {
    card1 = buildCard({ iso: cur.iso,  badgeText: 'Deze week',     badgeClass: 'badge-current', isCurrent: true  });
    card2 = buildCard({ iso: next.iso, badgeText: 'Volgende week', badgeClass: 'badge-next',    isCurrent: false });
  }

  document.getElementById('weeksGrid').innerHTML = card1 + card2;
}

// ── Picker ────────────────────────────────────────────────────────────────────

function populatePicker() {
  const select  = document.getElementById('weekPicker');
  const today   = toISO(new Date());
  select.innerHTML = '';
  let defaultIdx = 0;

  allEntries.forEach(({ iso, entry }, idx) => {
    const d   = new Date(iso + 'T12:00:00');
    const opt = document.createElement('option');
    opt.value = idx;
    const dayStr = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    opt.textContent = `${dayStr}  —  ${entry.naam}`;
    select.appendChild(opt);
    if (iso >= today && defaultIdx === 0) defaultIdx = idx;
  });

  pickerIndex = defaultIdx;
  select.value = pickerIndex;
}

function renderExtraWeek() {
  const entry = allEntries[pickerIndex];
  if (!entry) return;
  const extra = document.getElementById('extraWeek');
  extra.innerHTML = buildCard({ iso: entry.iso, badgeText: 'Gekozen', badgeClass: 'badge-chosen', isCurrent: false });
  extra.classList.add('visible');
}

function refresh() {
  renderWeeks();
  renderExtraWeek();
}

// ── Geolocatie ────────────────────────────────────────────────────────────────

const ZONE_REGIONS = [
  { zone: '5',         latMin: 50.75, latMax: 51.40, lngMin: 5.70, lngMax: 6.20 },
  { zone: '4',         latMin: 51.20, latMax: 51.75, lngMin: 3.30, lngMax: 6.00 },
  { zone: 'amsterdam', latMin: 52.25, latMax: 52.55, lngMin: 4.65, lngMax: 5.15 },
  { zone: '1',         latMin: 52.80, latMax: 53.55, lngMin: 4.70, lngMax: 7.25 },
  { zone: '2',         latMin: 52.20, latMax: 53.20, lngMin: 4.50, lngMax: 7.00 },
  { zone: '3',         latMin: 51.70, latMax: 52.55, lngMin: 3.50, lngMax: 6.20 },
];

const ZONE_NAMES = {
  '1': 'Zone 1 — Noord-Nederland', '2': 'Zone 2 — Noord-Holland / Overijssel',
  'amsterdam': 'Groot Amsterdam',  '3': 'Zone 3 — Zuid-Holland / Utrecht',
  '4': 'Zone 4 — Noord-Brabant / Zeeland', '5': 'Zone 5 — Zuid-Limburg',
};

function detectZone(lat, lng) {
  for (const r of ZONE_REGIONS) {
    if (lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax) return r.zone;
  }
  return null;
}

function setZone(zone, label) {
  currentZone = zone;
  document.querySelectorAll('.zone-pill').forEach(p => p.classList.toggle('active', p.dataset.zone === zone));
  if (label !== null) document.getElementById('locationText').textContent = label;
  refresh();
}

function doGeolocate() {
  if (!navigator.geolocation) { setZone('amsterdam', 'Standaard: Gr. Amsterdam'); return; }
  document.getElementById('locationText').textContent = 'Locatie bepalen…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const zone = detectZone(lat, lng);
      setZone(zone || 'amsterdam', zone ? `Locatie: ${ZONE_NAMES[zone]}` : 'Buiten NL — Gr. Amsterdam');
    },
    () => setZone('amsterdam', 'Standaard: Gr. Amsterdam'),
    { timeout: 6000, maximumAge: 300000 }
  );
}

// ── Events ────────────────────────────────────────────────────────────────────

document.getElementById('locAllow').addEventListener('click', () => {
  document.getElementById('locBanner').classList.add('hidden');
  doGeolocate();
});
document.getElementById('locSkip').addEventListener('click', () => {
  document.getElementById('locBanner').classList.add('hidden');
  setZone('amsterdam', 'Standaard: Gr. Amsterdam');
});
document.getElementById('zonePills').addEventListener('click', e => {
  if (!e.target.classList.contains('zone-pill')) return;
  setZone(e.target.dataset.zone, 'Handmatig gekozen');
});
document.getElementById('weekPicker').addEventListener('change', e => {
  pickerIndex = parseInt(e.target.value);
  renderExtraWeek();
});
document.getElementById('prevWeek').addEventListener('click', () => {
  if (pickerIndex > 0) { pickerIndex--; document.getElementById('weekPicker').value = pickerIndex; renderExtraWeek(); }
});
document.getElementById('nextWeek').addEventListener('click', () => {
  if (pickerIndex < allEntries.length - 1) { pickerIndex++; document.getElementById('weekPicker').value = pickerIndex; renderExtraWeek(); }
});

// ── Init ──────────────────────────────────────────────────────────────────────
setZone('amsterdam', 'Locatie bepalen…');
buildAllEntries();
populatePicker();
refresh();
