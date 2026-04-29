// ─────────────────────────────────────────────────────────────────────────────
// Sjabbat Tijden Widget — app.js
// Features:
//   • Geolocation → automatische zone-selectie
//   • Feestdagen als ze vóór de aankomende Sjabbat vallen → bovenste vakje
//   • Minimalistisch / Chabad-stijl
// ─────────────────────────────────────────────────────────────────────────────

let currentZone = 'amsterdam'; // default totdat locatie bekend is
let pickerOffset = 2;

// ── Datum helpers ────────────────────────────────────────────────────────────

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Geeft de eerstvolgende Vrijdag terug (of vandaag als het vrijdag is vóór Sjabbat)
// Zaterdag → volgende vrijdag (Sjabbat loopt nog / al voorbij)
function getThisFriday() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun … 6=Sat
  let offset;
  if      (day === 6) offset = 6;
  else if (day === 0) offset = 5;
  else                offset = 5 - day;
  const fri = new Date(today);
  fri.setDate(today.getDate() + offset);
  return fri;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtShort(d) {
  return d.toLocaleDateString('nl-NL', { day:'numeric', month:'short' });
}

function fmtMedium(d) {
  return d.toLocaleDateString('nl-NL', { weekday:'short', day:'numeric', month:'short' });
}

// ── Data lookup ───────────────────────────────────────────────────────────────

function getEntry(iso) {
  return SJABBAT_DATA[iso] || null;
}

// Zoek naar een Jomtov-dag die valt in de 6 dagen VÓÓR een bepaalde Vrijdag.
// Retourneert { iso, entry } of null.
function getJomtovBeforeFriday(fridayDate) {
  for (let i = 1; i <= 6; i++) {
    const d = addDays(fridayDate, -i);
    const iso = toISO(d);
    const entry = getEntry(iso);
    if (entry && entry.jomtov) {
      return { iso, date: d, entry };
    }
  }
  return null;
}

// ── Kaart-builder ─────────────────────────────────────────────────────────────

function buildCard(opts) {
  const { date, badgeText, badgeClass, isCurrent } = opts;
  const iso = typeof date === 'string' ? date : toISO(date);
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const entry = getEntry(iso);

  // Datum weergave
  let dateDisplay;
  if (opts.endDate) {
    dateDisplay = `${fmtShort(dateObj)} – ${fmtShort(opts.endDate)}`;
  } else {
    dateDisplay = fmtMedium(dateObj);
  }

  if (!entry) {
    return `
      <div class="week-card${isCurrent ? ' current' : ''}">
        <span class="week-badge ${badgeClass}">${badgeText}</span>
        <div class="week-parasha">—</div>
        <div class="week-dates">${dateDisplay}</div>
        <div class="time-row">
          <span class="time-label">Begin <span class="time-day">${opts.beginDay || 'vr.'}</span></span>
          <span class="time-value none">geen data</span>
        </div>
        <div class="time-row">
          <span class="time-label">Einde <span class="time-day">${opts.eindeDay || 'za.'}</span></span>
          <span class="time-value none">geen data</span>
        </div>
      </div>`;
  }

  const isJomtov = !!entry.jomtov;
  const cardClass = ['week-card', isCurrent ? 'current' : '', isJomtov ? 'jomtov' : ''].filter(Boolean).join(' ');
  const jomtovTag = isJomtov ? `<span class="jomtov-tag">Jomtov &#x2605;</span><br>` : '';

  const begin = entry.begin?.[currentZone];
  const einde = entry.einde?.[currentZone];

  const beginHtml = begin ? `<span class="time-value">${begin}</span>` : `<span class="time-value none">—</span>`;
  const eindeHtml = einde ? `<span class="time-value">${einde}</span>` : `<span class="time-value none">—</span>`;

  // Dag-labels
  const beginDay = opts.beginDay || (isJomtov ? '' : 'vr.');
  const eindeDay = opts.eindeDay || (isJomtov ? '' : 'za.');

  return `
    <div class="${cardClass}">
      <span class="week-badge ${badgeClass}">${badgeText}</span>
      ${jomtovTag}
      <div class="week-parasha">${entry.naam}</div>
      <div class="week-dates">${dateDisplay}</div>
      <div class="time-row">
        <span class="time-label">Begin <span class="time-day">${beginDay}</span></span>
        ${beginHtml}
      </div>
      <div class="time-row">
        <span class="time-label">Einde <span class="time-day">${eindeDay}</span></span>
        ${eindeHtml}
      </div>
    </div>`;
}

// ── Render weken ──────────────────────────────────────────────────────────────

function renderWeeks() {
  const thisFriday = getThisFriday();
  const nextFriday = addWeeks(thisFriday, 1);
  const satThis    = addDays(thisFriday, 1);
  const satNext    = addDays(nextFriday, 1);

  // Controleer of er een Jomtov is VÓÓR of OP de aankomende Sjabbat
  const jomtovThis = getJomtovBeforeFriday(thisFriday);
  const jomtovNext = getJomtovBeforeFriday(nextFriday);

  let card1, card2;

  if (jomtovThis) {
    // Jomtov vervangt eerste kaart
    card1 = buildCard({
      date: jomtovThis.date,
      endDate: satThis,
      badgeText: 'Deze week',
      badgeClass: 'current-badge',
      isCurrent: true,
      beginDay: fmtMedium(jomtovThis.date).split(' ')[0],
      eindeDay: 'za.',
    });
  } else {
    card1 = buildCard({
      date: thisFriday,
      endDate: satThis,
      badgeText: 'Deze week',
      badgeClass: 'current-badge',
      isCurrent: true,
      beginDay: 'vr.',
      eindeDay: 'za.',
    });
  }

  if (jomtovNext) {
    card2 = buildCard({
      date: jomtovNext.date,
      endDate: satNext,
      badgeText: 'Volgende week',
      badgeClass: 'next-badge',
      isCurrent: false,
      beginDay: fmtMedium(jomtovNext.date).split(' ')[0],
      eindeDay: 'za.',
    });
  } else {
    card2 = buildCard({
      date: nextFriday,
      endDate: satNext,
      badgeText: 'Volgende week',
      badgeClass: 'next-badge',
      isCurrent: false,
      beginDay: 'vr.',
      eindeDay: 'za.',
    });
  }

  document.getElementById('weeksGrid').innerHTML = card1 + card2;
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

function populatePicker() {
  const select   = document.getElementById('weekPicker');
  const thisFri  = getThisFriday();
  const keys     = Object.keys(SJABBAT_DATA).sort();
  const firstKey = keys[0];
  const lastKey  = keys[keys.length - 1];

  select.innerHTML = '';
  for (let i = -4; i <= 60; i++) {
    const fri = addWeeks(thisFri, i);
    const iso = toISO(fri);
    if (iso < firstKey && i < -1) continue;
    if (iso > lastKey) continue;

    const sat = addDays(fri, 1);
    const entry = SJABBAT_DATA[iso];

    // Controleer ook of er een Jomtov vóór deze vrijdag valt
    const jt = getJomtovBeforeFriday(fri);
    const naam = jt ? jt.entry.naam : (entry ? entry.naam : '');

    const opt = document.createElement('option');
    opt.value = i;
    let label = `${fmtShort(fri)} – ${fmtShort(sat)}`;
    if (naam) label += `  —  ${naam}`;
    if (i === 0) label += ' ◀ deze week';
    if (i === 1) label += ' ◀ volgende week';
    opt.textContent = label;
    select.appendChild(opt);
  }
  // Selecteer dichtstbijzijnde beschikbare optie
  const opts = Array.from(select.options).map(o => parseInt(o.value));
  const closest = opts.reduce((a, b) => Math.abs(b - pickerOffset) < Math.abs(a - pickerOffset) ? b : a);
  pickerOffset = closest;
  select.value = pickerOffset;
}

function renderExtraWeek() {
  const fri   = addWeeks(getThisFriday(), pickerOffset);
  const sat   = addDays(fri, 1);
  const extra = document.getElementById('extraWeek');
  const jt    = getJomtovBeforeFriday(fri);

  let card;
  if (jt) {
    card = buildCard({
      date: jt.date,
      endDate: sat,
      badgeText: 'Gekozen week',
      badgeClass: 'chosen-badge',
      isCurrent: false,
      beginDay: fmtMedium(jt.date).split(' ')[0],
      eindeDay: 'za.',
    });
  } else {
    card = buildCard({
      date: fri,
      endDate: sat,
      badgeText: 'Gekozen week',
      badgeClass: 'chosen-badge',
      isCurrent: false,
      beginDay: 'vr.',
      eindeDay: 'za.',
    });
  }

  extra.innerHTML = `<div style="animation:fadeUp 0.2s ease both">${card}</div>`;
  extra.classList.add('visible');
}

function refresh() {
  renderWeeks();
  renderExtraWeek();
}

// ── Geolocation → auto zone ───────────────────────────────────────────────────

// NL bounding boxes per zone (lat min, lat max, lng min, lng max)
// Vereenvoudigd — werkt goed voor het grootste deel van Nederland
const ZONE_REGIONS = [
  // Zone 5: Roermond en Limburg-Zuid (meest zuiden)
  { zone: '5',         latMin: 50.75, latMax: 51.40, lngMin: 5.70, lngMax: 6.20 },
  // Zone 4: Zeeland, Noord-Brabant, Noord-Limburg
  { zone: '4',         latMin: 51.20, latMax: 51.75, lngMin: 3.30, lngMax: 6.00 },
  // Groot Amsterdam
  { zone: 'amsterdam', latMin: 52.25, latMax: 52.55, lngMin: 4.65, lngMax: 5.15 },
  // Zone 1: Groningen, Friesland, Drente (noorden)
  { zone: '1',         latMin: 52.80, latMax: 53.55, lngMin: 4.70, lngMax: 7.25 },
  // Zone 2: Noord-Holland (excl. Amsterdam), Flevoland, Overijssel, etc.
  { zone: '2',         latMin: 52.20, latMax: 53.20, lngMin: 4.50, lngMax: 7.00 },
  // Zone 3: Zuid-Holland, Utrecht, Gelderland (midden)
  { zone: '3',         latMin: 51.70, latMax: 52.55, lngMin: 3.50, lngMax: 6.20 },
];

function detectZoneFromCoords(lat, lng) {
  // Check van meest specifiek (klein) naar algemeen
  for (const r of ZONE_REGIONS) {
    if (lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax) {
      return r.zone;
    }
  }
  return null; // buiten NL → amsterdam als fallback
}

function setZone(zone, label) {
  currentZone = zone;
  document.querySelectorAll('.zone-pill').forEach(p => {
    p.classList.remove('active', 'auto');
    if (p.dataset.zone === zone) {
      p.classList.add('active');
    }
  });
  if (label) {
    document.getElementById('locationText').textContent = label;
    const pill = document.querySelector(`.zone-pill[data-zone="${zone}"]`);
    if (pill) pill.classList.add('auto');
  }
  refresh();
}

function initGeolocation() {
  if (!navigator.geolocation) {
    setZone('amsterdam', 'Standaard: Gr. Amsterdam');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const zone = detectZoneFromCoords(lat, lng);
      if (zone) {
        const names = {
          '1': 'Zone 1 — Noord-Nederland',
          '2': 'Zone 2 — Noord-Holland / Overijssel',
          'amsterdam': 'Groot Amsterdam',
          '3': 'Zone 3 — Zuid-Holland / Utrecht',
          '4': 'Zone 4 — Noord-Brabant / Zeeland',
          '5': 'Zone 5 — Zuid-Limburg',
        };
        setZone(zone, `📍 ${names[zone]}`);
      } else {
        // Buiten Nederland
        setZone('amsterdam', '📍 Buiten NL — Gr. Amsterdam');
      }
    },
    (err) => {
      // Geen toestemming of error → standaard Amsterdam
      setZone('amsterdam', 'Standaard: Gr. Amsterdam');
    },
    { timeout: 6000, maximumAge: 300000 }
  );
}

// ── Events ────────────────────────────────────────────────────────────────────

document.getElementById('zonePills').addEventListener('click', e => {
  if (!e.target.classList.contains('zone-pill')) return;
  const zone = e.target.dataset.zone;
  document.getElementById('locationText').textContent = 'Handmatig gekozen';
  setZone(zone, null);
  document.getElementById('locationText').textContent = 'Handmatig gekozen';
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

// Render meteen met amsterdam als placeholder
setZone('amsterdam', 'Locatie bepalen…');
populatePicker();
refresh();

// Dan locatie detecteren (async)
initGeolocation();
