// ─────────────────────────────────────────────────────────────────────────────
// SJABBAT WIDGET — app.js
// ─────────────────────────────────────────────────────────────────────────────

let currentZone = "1";
let pickerIndex = 2; // default: show week after next in picker

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getFridayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  // Friday = day 5; go to this week's Friday
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function formatShortDate(date) {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function formatLongDate(date) {
  return date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Find the SJABBAT_DATA entry whose key is <= fridayISO (closest match)
function getEntry(fridayISO) {
  const keys = Object.keys(SJABBAT_DATA).sort();
  // Find exact match first
  if (SJABBAT_DATA[fridayISO]) return { iso: fridayISO, ...SJABBAT_DATA[fridayISO] };
  // Otherwise find closest Friday on or before
  let best = null;
  for (const k of keys) {
    if (k <= fridayISO) best = k;
    else break;
  }
  if (best) return { iso: best, ...SJABBAT_DATA[best] };
  return null;
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
  let dataAvailable = false;

  if (entry) {
    naam = entry.naam || "—";
    isJomtov = !!entry.jomtov;
    beginTijd = entry.begin?.[currentZone] || null;
    eindeTijd = entry.einde?.[currentZone] || null;
    dataAvailable = !!(beginTijd && eindeTijd);
  }

  const cardClass = ['week-card', isCurrent ? 'current' : '', isJomtov ? 'jomtov' : ''].filter(Boolean).join(' ');
  const badgeClass = isCurrent ? 'week-badge' : 'week-badge muted';

  const jomtovTag = isJomtov ? `<span class="jomtov-tag">Jomtov</span><br>` : '';

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
  const today = new Date();
  // Current week: find this Friday (or next Friday if today is Saturday/Sunday)
  let thisFriday = getFridayOfWeek(today);
  // If we're past Friday evening (Saturday/Sunday), move to next week
  if (today.getDay() === 6 || (today.getDay() === 0)) {
    thisFriday = addWeeks(thisFriday, 1);
  }
  const nextFriday = addWeeks(thisFriday, 1);

  document.getElementById('weeksGrid').innerHTML =
    buildCard(thisFriday, 'Deze week', true) +
    buildCard(nextFriday, 'Volgende week', false);
}

function populatePicker() {
  const picker = document.getElementById('weekPicker');
  const today = new Date();
  let thisFriday = getFridayOfWeek(today);
  if (today.getDay() === 6 || today.getDay() === 0) {
    thisFriday = addWeeks(thisFriday, 1);
  }

  picker.innerHTML = '';
  for (let i = -8; i <= 30; i++) {
    const fri = addWeeks(thisFriday, i);
    const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    const label = `${formatShortDate(fri)} – ${formatShortDate(sat)}`;
    const opt = document.createElement('option');
    opt.value = i;
    let text = label;
    if (i === 0) text += ' (deze week)';
    if (i === 1) text += ' (volgende week)';
    opt.textContent = text;
    picker.appendChild(opt);
  }
  picker.value = pickerIndex;
}

function renderExtraWeek() {
  const today = new Date();
  let thisFriday = getFridayOfWeek(today);
  if (today.getDay() === 6 || today.getDay() === 0) {
    thisFriday = addWeeks(thisFriday, 1);
  }
  const targetFriday = addWeeks(thisFriday, pickerIndex);

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
