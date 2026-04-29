// ─────────────────────────────────────────────────────────────────────────────
// Sjabbat Tijden Widget — app.js
// ─────────────────────────────────────────────────────────────────────────────

let currentZone   = '1';
let pickerOffset  = 2;   // weeks offset from "this Friday" shown in picker

// ── Date helpers ──────────────────────────────────────────────────────────────

// Local-timezone ISO date: "YYYY-MM-DD"  (avoids UTC shift)
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// The Friday that anchors "this week".
// Mon–Fri  → this week's Friday
// Sat      → NEXT Friday (Sjabbat is ongoing)
// Sun      → this coming Friday
function getThisFriday() {
  const today = new Date();
  const day   = today.getDay(); // 0=Sun … 6=Sat
  let offset;
  if      (day === 6) offset = 6;   // Sat → +6 days
  else if (day === 0) offset = 5;   // Sun → +5 days
  else                offset = 5 - day; // Mon(1)→+4 … Fri(5)→+0
  const fri = new Date(today);
  fri.setDate(today.getDate() + offset);
  return fri;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function fmtShort(d) {
  return d.toLocaleDateString('nl-NL', { day:'numeric', month:'short' });
}
function fmtLong(d) {
  return d.toLocaleDateString('nl-NL', { day:'numeric', month:'long', year:'numeric' });
}

// ── Data lookup ───────────────────────────────────────────────────────────────

// Returns the SJABBAT_DATA entry whose key exactly matches fridayISO,
// or null if no entry exists for that date.
function getEntry(fridayISO) {
  return SJABBAT_DATA[fridayISO] || null;
}

// ── Card builder ──────────────────────────────────────────────────────────────

function buildCard(fridayDate, badgeText, badgeStyle) {
  const iso = toISO(fridayDate);
  const sat = new Date(fridayDate);
  sat.setDate(fridayDate.getDate() + 1);

  const entry = getEntry(iso);

  // ── No data for this date ──
  if (!entry) {
    return `
      <div class="week-card">
        <span class="week-badge muted">${badgeText}</span>
        <div class="week-parasha">—</div>
        <div class="week-dates">${fmtShort(fridayDate)} – ${fmtShort(sat)}</div>
        <div class="time-row">
          <span class="time-label">Begin Sjabbat <span class="time-day">vr.</span></span>
          <span class="time-value none">geen data</span>
        </div>
        <div class="time-row">
          <span class="time-label">Einde Sjabbat <span class="time-day">za.</span></span>
          <span class="time-value none">geen data</span>
        </div>
      </div>`;
  }

  const isJomtov   = !!entry.jomtov;
  const cardClass  = ['week-card', badgeStyle === 'gold' ? 'current' : '', isJomtov ? 'jomtov' : ''].filter(Boolean).join(' ');
  const jomtovTag  = isJomtov ? `<span class="jomtov-tag">Jomtov</span><br>` : '';

  const begin = entry.begin?.[currentZone];
  const einde = entry.einde?.[currentZone];

  const beginHtml = begin
    ? `<span class="time-value">${begin}</span>`
    : `<span class="time-value none">—</span>`;
  const eindeHtml = einde
    ? `<span class="time-value">${einde}</span>`
    : `<span class="time-value none">—</span>`;

  return `
    <div class="${cardClass}">
      <span class="week-badge ${badgeStyle}">${badgeText}</span>
      ${jomtovTag}
      <div class="week-parasha">${entry.naam}</div>
      <div class="week-dates">${fmtShort(fridayDate)} – ${fmtShort(sat)}</div>
      <div class="time-row">
        <span class="time-label">Begin Sjabbat <span class="time-day">vr.</span></span>
        ${beginHtml}
      </div>
      <div class="time-row">
        <span class="time-label">Einde Sjabbat <span class="time-day">za.</span></span>
        ${eindeHtml}
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderWeeks() {
  const fri1 = getThisFriday();
  const fri2 = addWeeks(fri1, 1);
  document.getElementById('weeksGrid').innerHTML =
    buildCard(fri1, 'Deze week',     'gold') +
    buildCard(fri2, 'Volgende week', 'muted');
}

function populatePicker() {
  const select  = document.getElementById('weekPicker');
  const thisFri = getThisFriday();
  select.innerHTML = '';

  // Show all weeks that exist in the data, plus ±4 weeks around today
  const dataKeys = Object.keys(SJABBAT_DATA).sort();
  const first    = dataKeys[0];
  const last     = dataKeys[dataKeys.length - 1];

  // Range: from 4 weeks before today OR first data entry, to 4 weeks after last data entry
  for (let i = -4; i <= 52; i++) {
    const fri = addWeeks(thisFri, i);
    const iso = toISO(fri);
    if (iso < first && i < -1) continue; // skip far past with no data
    if (iso > last)            continue; // skip future with no data
    const sat = new Date(fri);
    sat.setDate(fri.getDate() + 1);
    const opt = document.createElement('option');
    opt.value = i;
    let label = `${fmtShort(fri)} – ${fmtShort(sat)}`;
    const entry = SJABBAT_DATA[iso];
    if (entry) label += `  —  ${entry.naam}`;
    if (i === 0) label += ' (deze week)';
    if (i === 1) label += ' (volgende week)';
    opt.textContent = label;
    select.appendChild(opt);
  }
  select.value = pickerOffset;
}

function renderExtraWeek() {
  const fri   = addWeeks(getThisFriday(), pickerOffset);
  const sat   = new Date(fri); sat.setDate(fri.getDate() + 1);
  const extra = document.getElementById('extraWeek');

  extra.innerHTML = `<div style="animation:fadeUp 0.2s ease both">
    ${buildCard(fri, 'Gekozen week', 'muted')}
  </div>`;
  extra.classList.add('visible');
}

function refresh() {
  renderWeeks();
  renderExtraWeek();
}

// ── Events ────────────────────────────────────────────────────────────────────

document.getElementById('zonePills').addEventListener('click', e => {
  if (!e.target.classList.contains('zone-pill')) return;
  document.querySelectorAll('.zone-pill').forEach(p => p.classList.remove('active'));
  e.target.classList.add('active');
  currentZone = e.target.dataset.zone;
  refresh();
});

document.getElementById('weekPicker').addEventListener('change', e => {
  pickerOffset = parseInt(e.target.value);
  renderExtraWeek();
});

document.getElementById('prevWeek').addEventListener('click', () => {
  const opts  = Array.from(document.getElementById('weekPicker').options);
  const vals  = opts.map(o => parseInt(o.value));
  const cur   = vals.indexOf(pickerOffset);
  if (cur > 0) {
    pickerOffset = vals[cur - 1];
    document.getElementById('weekPicker').value = pickerOffset;
    renderExtraWeek();
  }
});

document.getElementById('nextWeek').addEventListener('click', () => {
  const opts = Array.from(document.getElementById('weekPicker').options);
  const vals = opts.map(o => parseInt(o.value));
  const cur  = vals.indexOf(pickerOffset);
  if (cur < vals.length - 1) {
    pickerOffset = vals[cur + 1];
    document.getElementById('weekPicker').value = pickerOffset;
    renderExtraWeek();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

populatePicker();
refresh();
