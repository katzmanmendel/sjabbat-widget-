// ─────────────────────────────────────────────────────────────────────────────
// Sjabbat Tijden Widget — app.js
// ─────────────────────────────────────────────────────────────────────────────

let currentZone  = 'amsterdam';
let pickerOffset = 2;

// ── Datum helpers ─────────────────────────────────────────────────────────────

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addWeeks(date, n) {
  return addDays(date, n * 7);
}

// Vrijdag van de lopende week (Zat/Zo → volgende vrijdag)
function getThisFriday() {
  const today = new Date();
  const day   = today.getDay(); // 0=Zo … 6=Za
  const offset = day === 6 ? 6 : day === 0 ? 5 : 5 - day;
  return addDays(today, offset);
}

function fmtShort(d) {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function fmtWeekday(d) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short' });
}

// ── Data lookup ───────────────────────────────────────────────────────────────

function getEntry(iso) {
  return SJABBAT_DATA[iso] || null;
}

// Zoek Jomtov-dag in de 6 dagen VÓÓR een bepaalde vrijdag
function getJomtovBeforeFriday(fridayDate) {
  for (let i = 1; i <= 6; i++) {
    const d   = addDays(fridayDate, -i);
    const iso = toISO(d);
    const entry = getEntry(iso);
    if (entry && entry.jomtov) return { date: d, iso, entry };
  }
  return null;
}

// ── Kaartbouw ─────────────────────────────────────────────────────────────────

function buildCard({ date, endDate, badgeText, badgeClass, isCurrent, beginDay, eindeDay }) {
  const iso     = toISO(date);
  const entry   = getEntry(iso);
  const dateStr = endDate
    ? `${fmtShort(date)} – ${fmtShort(endDate)}`
    : `${fmtWeekday(date)} ${fmtShort(date)}`;

  if (!entry) {
    return `
      <div class="week-card${isCurrent ? ' current' : ''}">
        <span class="week-badge ${badgeClass}">${badgeText}</span>
        <div class="week-parasha">—</div>
        <div class="week-dates">${dateStr}</div>
        <div class="time-row">
          <span class="time-label">Begin Sjabbat <span class="time-day">${beginDay || 'vr.'}</span></span>
          <span class="time-value none">geen data</span>
        </div>
        <div class="time-row">
          <span class="time-label">Einde Sjabbat <span class="time-day">${eindeDay || 'za.'}</span></span>
          <span class="time-value none">geen data</span>
        </div>
      </div>`;
  }

  const isJomtov = !!entry.jomtov;
  const cardCls  = ['week-card', isCurrent ? 'current' : '', isJomtov ? 'jomtov' : ''].filter(Boolean).join(' ');
  const jtTag    = isJomtov ? `<span class="jomtov-tag">Jomtov</span><br>` : '';

  const begin = entry.begin?.[currentZone];
  const einde = entry.einde?.[currentZone];

  const beginLabel = isJomtov ? (beginDay || fmtWeekday(date)) : (beginDay || 'vr.');
  const eindeLabel = isJomtov ? (eindeDay || 'za.')            : (eindeDay || 'za.');

  const beginHtml = begin
    ? `<span class="time-value">${begin}</span>`
    : `<span class="time-value none">—</span>`;
  const eindeHtml = einde
    ? `<span class="time-value">${einde}</span>`
    : `<span class="time-value none">—</span>`;

  return `
    <div class="${cardCls}">
      <span class="week-badge ${badgeClass}">${badgeText}</span>
      ${jtTag}
      <div class="week-parasha">${entry.naam}</div>
      <div class="week-dates">${dateStr}</div>
      <div class="time-row">
        <span class="time-label">Begin <span class="time-day">${beginLabel}</span></span>
        ${beginHtml}
      </div>
      <div class="time-row">
        <span class="time-label">Einde <span class="time-day">${eindeLabel}</span></span>
        ${eindeHtml}
      </div>
    </div>`;
}

// ── Renderen ──────────────────────────────────────────────────────────────────

function renderWeeks() {
  const fri1 = getThisFriday();
  const fri2 = addWeeks(fri1, 1);
  const sat1 = addDays(fri1, 1);
  const sat2 = addDays(fri2, 1);

  const jt1 = getJomtovBeforeFriday(fri1);
  const jt2 = getJomtovBeforeFriday(fri2);

  const card1 = jt1
    ? buildCard({ date: jt1.date, endDate: sat1, badgeText: 'Deze week',     badgeClass: 'badge-current', isCurrent: true,  beginDay: fmtWeekday(jt1.date), eindeDay: 'za.' })
    : buildCard({ date: fri1,     endDate: sat1, badgeText: 'Deze week',     badgeClass: 'badge-current', isCurrent: true,  beginDay: 'vr.', eindeDay: 'za.' });

  const card2 = jt2
    ? buildCard({ date: jt2.date, endDate: sat2, badgeText: 'Volgende week', badgeClass: 'badge-next',    isCurrent: false, beginDay: fmtWeekday(jt2.date), eindeDay: 'za.' })
    : buildCard({ date: fri2,     endDate: sat2, badgeText: 'Volgende week', badgeClass: 'badge-next',    isCurrent: false, beginDay: 'vr.', eindeDay: 'za.' });

  document.getElementById('weeksGrid').innerHTML = card1 + card2;
}

function populatePicker() {
  const select  = document.getElementById('weekPicker');
  const thisFri = getThisFriday();
  const keys    = Object.keys(SJABBAT_DATA).sort();
  const first   = keys[0];
  const last    = keys[keys.length - 1];

  select.innerHTML = '';
  for (let i = -4; i <= 60; i++) {
    const fri = addWeeks(thisFri, i);
    const iso = toISO(fri);
    if (iso < first && i < -1) continue;
    if (iso > last) continue;

    const sat   = addDays(fri, 1);
    const jt    = getJomtovBeforeFriday(fri);
    const entry = SJABBAT_DATA[iso];
    const naam  = jt ? jt.entry.naam : (entry ? entry.naam : '');

    const opt = document.createElement('option');
    opt.value = i;
    let label = `${fmtShort(fri)} – ${fmtShort(sat)}`;
    if (naam) label += `  —  ${naam}`;
    if (i === 0) label += ' ◀ deze week';
    if (i === 1) label += ' ◀ volgende week';
    opt.textContent = label;
    select.appendChild(opt);
  }

  // Selecteer dichtsbijzijnde beschikbare optie
  const vals    = Array.from(select.options).map(o => parseInt(o.value));
  const closest = vals.reduce((a, b) => Math.abs(b - pickerOffset) < Math.abs(a - pickerOffset) ? b : a);
  pickerOffset  = closest;
  select.value  = pickerOffset;
}

function renderExtraWeek() {
  const fri   = addWeeks(getThisFriday(), pickerOffset);
  const sat   = addDays(fri, 1);
  const jt    = getJomtovBeforeFriday(fri);
  const extra = document.getElementById('extraWeek');

  const card = jt
    ? buildCard({ date: jt.date, endDate: sat, badgeText: 'Gekozen week', badgeClass: 'badge-chosen', isCurrent: false, beginDay: fmtWeekday(jt.date), eindeDay: 'za.' })
    : buildCard({ date: fri,     endDate: sat, badgeText: 'Gekozen week', badgeClass: 'badge-chosen', isCurrent: false, beginDay: 'vr.', eindeDay: 'za.' });

  extra.innerHTML = card;
  extra.classList.add('visible');
}

function refresh() {
  renderWeeks();
  renderExtraWeek();
}

// ── Geolocatie → automatische zone ───────────────────────────────────────────

const ZONE_REGIONS = [
  { zone: '5',         latMin: 50.75, latMax: 51.40, lngMin: 5.70, lngMax: 6.20 },
  { zone: '4',         latMin: 51.20, latMax: 51.75, lngMin: 3.30, lngMax: 6.00 },
  { zone: 'amsterdam', latMin: 52.25, latMax: 52.55, lngMin: 4.65, lngMax: 5.15 },
  { zone: '1',         latMin: 52.80, latMax: 53.55, lngMin: 4.70, lngMax: 7.25 },
  { zone: '2',         latMin: 52.20, latMax: 53.20, lngMin: 4.50, lngMax: 7.00 },
  { zone: '3',         latMin: 51.70, latMax: 52.55, lngMin: 3.50, lngMax: 6.20 },
];

const ZONE_NAMES = {
  '1':         'Zone 1 — Noord-Nederland',
  '2':         'Zone 2 — Noord-Holland / Overijssel',
  'amsterdam': 'Groot Amsterdam',
  '3':         'Zone 3 — Zuid-Holland / Utrecht',
  '4':         'Zone 4 — Noord-Brabant / Zeeland',
  '5':         'Zone 5 — Zuid-Limburg',
};

function detectZone(lat, lng) {
  for (const r of ZONE_REGIONS) {
    if (lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax) {
      return r.zone;
    }
  }
  return null;
}

function setZone(zone, locationLabel) {
  currentZone = zone;
  document.querySelectorAll('.zone-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.zone === zone);
  });
  if (locationLabel !== null) {
    document.getElementById('locationText').textContent = locationLabel;
  }
  refresh();
}

function doGeolocate() {
  if (!navigator.geolocation) {
    setZone('amsterdam', 'Standaard: Gr. Amsterdam');
    return;
  }
  document.getElementById('locationText').textContent = 'Locatie bepalen…';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const zone = detectZone(lat, lng);
      if (zone) {
        setZone(zone, `Locatie: ${ZONE_NAMES[zone]}`);
      } else {
        setZone('amsterdam', 'Buiten NL — Gr. Amsterdam');
      }
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
  pickerOffset = parseInt(e.target.value);
  renderExtraWeek();
});

document.getElementById('prevWeek').addEventListener('click', () => {
  const opts = Array.from(document.getElementById('weekPicker').options).map(o => parseInt(o.value));
  const cur  = opts.indexOf(pickerOffset);
  if (cur > 0) {
    pickerOffset = opts[cur - 1];
    document.getElementById('weekPicker').value = pickerOffset;
    renderExtraWeek();
  }
});

document.getElementById('nextWeek').addEventListener('click', () => {
  const opts = Array.from(document.getElementById('weekPicker').options).map(o => parseInt(o.value));
  const cur  = opts.indexOf(pickerOffset);
  if (cur < opts.length - 1) {
    pickerOffset = opts[cur + 1];
    document.getElementById('weekPicker').value = pickerOffset;
    renderExtraWeek();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

// Direct renderen met Amsterdam als standaard
setZone('amsterdam', 'Locatie bepalen…');
populatePicker();
refresh();
