// ─────────────────────────────────────────────────────────────────────────────
// SJABBAT WIDGET — app.js
// ─────────────────────────────────────────────────────────────────────────────

let currentZone = "1";
let pickerIndex = 2;

// ── HELPERS ──────────────────────────────────────────────────────────────────

// Timezone-safe ISO date string (avoids UTC offset shifting the date)
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns the Friday of the CURRENT week (Mon–Sun), or next Friday if today is Sat/Sun
function getThisFriday() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat

  let daysUntilFriday;
  if (day === 6) {
    // Saturday: Sjabbat is ongoing, show next week's Friday
    daysUntilFriday = 6;
  } else if (day === 0) {
    // Sunday: show this coming Friday
    daysUntilFriday = 5;
  } else {
    // Mon(1)–Fri(5): go forward to Friday of this week
    daysUntilFriday = 5 - day;
  }

  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  return friday;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function formatShortDate(date) {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function formatLongDate(date) {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Find the SJABBAT_DATA entry for a given Friday ISO date (exact match first,
// then the closest earlier entry as fallback)
function getEntry(fridayISO) {
  // Exact match
  if (SJABBAT_DATA[fridayISO]) {
    return SJABBAT_DATA[fridayISO];
  }
  // Closest earlier key
  const keys = Object.keys(SJABBAT_DATA).sort();
  let best = null;
  for (const k of keys) {
    if (k <= fridayISO) best = k;
    else break;
  }
  return best ? SJABBAT_DATA[best] : null;
}

// ── CARD BUILDER ─────────────────────────────────────────────────────────────

function buildCard(fridayDate, badgeText, isCurrent) {
  const fridayISO = toISO(fridayDate);
  const saturdayDate = new Date(fridayDate);
  saturdayDate.setDate(fridayDate.getDate() + 1);

  const entry = getEntry(fridayISO);

  const dateRange = `${formatShortDate(fridayDate)} – ${formatShortDate(saturdayDate)}`;

  let naam = "—";
  let beginTijd = null;
  let eindeTijd = null;
  let isJomtov = false;

  if (entry) {
    naam      = entry.naam  || "—";
    isJomtov  = !!entry.jomtov;
    beginTijd = entry.begin?.[currentZone] || null;
    eindeTijd = entry.einde?.[currentZone] || null;
  }

  const cardClass   = ['week-card', isCurrent ? 'current' : '', isJomtov ? 'jomtov' : ''].filter(Boolean).join(' ');
  const badgeClass  = isCurrent ? 'week-badge' : 'week-badge muted';
  const jomtovTag   = isJomtov ? `<span class="jomtov-tag">Jomtov</span><br>` : '';

  const beginHtml = beginTijd
    ? `<span class="time-value">${beginTijd}</span>`
    : `<span class="time-value unavailable">nog niet beschikbaar</span>`;

  const eindeHtml = eindeTijd
    ? `<span class="time-value">${eindeTijd}</span>`
    : `<span class="time-value unavailable">nog niet beschikbaar</span>`;

  return `
    <div class="${cardClass}">
      <span class="${badgeClass}">${badgeText}</span>
      ${jomtovTag}
      <div class="week-parasha">${naam}</div>
      <div class="week-date-range">${dateRange}</div>
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

// ── RENDER FUNCTIONS ─────────────────────────────────────────────────────────

function renderWeeks() {
  const thisFriday = getThisFriday();
  const nextFriday = addWeeks(thisFriday, 1);

  document.getElementById('weeksGrid').innerHTML =
    buildCard(thisFriday, 'Deze week', true) +
    buildCard(nextFriday, 'Volgende week', false);
}

function populatePicker() {
  const picker      = document.getElementById('weekPicker');
  const thisFriday  = getThisFriday();

  picker.innerHTML = '';
  for (let i = -8; i <= 30; i++) {
    const fri = addWeeks(thisFriday, i);
    const sat = new Date(fri);
    sat.setDate(fri.getDate() + 1);

    const opt   = document.createElement('option');
    opt.value   = i;
    let label   = `${formatShortDate(fri)} – ${formatShortDate(sat)}`;
    if (i === 0) label += ' (deze week)';
    if (i === 1) label += ' (volgende week)';
    opt.textContent = label;
    picker.appendChild(opt);
  }
  picker.value = pickerIndex;
}

function renderExtraWeek() {
  const thisFriday    = getThisFriday();
  const targetFriday  = addWeeks(thisFriday, pickerIndex);

  const extraWeek = document.getElementById('extraWeek');
  extraWeek.innerHTML = buildCard(targetFriday, 'Gekozen week', false);
  extraWeek.classList.add('visible');
}

function refresh() {
  renderWeeks();
  renderExtraWeek();
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────

document.getElementById('zonePills').addEventListener('click', e => {
  if (!e.target.classList.contains('zone-pill')) return;
  document.querySelectorAll('.zone-pill').forEach(p => p.classList.remove('active'));
  e.target.classList.add('active');
  currentZone = e.target.dataset.zone;
  refresh();
});

document.getElementById('weekPicker').addEventListener('change', e => {
  pickerIndex = parseInt(e.target.value);
  renderExtraWeek();
});

document.getElementById('prevWeek').addEventListener('click', () => {
  pickerIndex = Math.max(-8, pickerIndex - 1);
  document.getElementById('weekPicker').value = pickerIndex;
  renderExtraWeek();
});

document.getElementById('nextWeek').addEventListener('click', () => {
  pickerIndex = Math.min(30, pickerIndex + 1);
  document.getElementById('weekPicker').value = pickerIndex;
  renderExtraWeek();
});

// ── INIT ──────────────────────────────────────────────────────────────────────

populatePicker();
refresh();
