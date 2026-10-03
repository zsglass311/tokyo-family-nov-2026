(() => {
  'use strict';

  const state = {
    trip: null,
    selectedDay: null
  };

  const el = {
    metaChips: document.getElementById('meta-chips'),
    overviewChips: document.getElementById('overview-chips'),
    auditStats: document.getElementById('audit-stats'),
    auditList: document.getElementById('audit-list'),
    checklistList: document.getElementById('checklist-list'),
    dayList: document.getElementById('day-list'),
    briefing: document.getElementById('briefing'),
    briefingTitle: document.getElementById('briefing-title'),
    briefingBody: document.getElementById('briefing-body'),
    closeBriefing: document.getElementById('close-briefing'),
    loadStatus: document.getElementById('load-status')
  };

  const LOCKED = [
    { date: '2026-11-26', label: '26 Nov · DisneySea' },
    { date: '2026-12-01', label: '01 Dec · Mt. Fuji overnight' },
    { date: '2026-12-03', label: '03 Dec · Disneyland' },
    { date: '2026-12-04', label: '04 Dec · Bell Sushi + Sip' },
    { date: '2026-12-05', label: '05 Dec · teamLab + Odaiba' },
    { date: '2026-12-07', label: '07 Dec · Departure' }
  ];

  function paceClass(pace) {
    const key = String(pace || '')
      .toLowerCase()
      .replace(/\s*\/\s*/g, ' ')
      .replace(/[^a-z ]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    if (key.includes('very-light') || key === 'very-light') return 'pace-very-light';
    if (key.startsWith('light')) return 'pace-light';
    if (key.startsWith('moderate')) return 'pace-moderate';
    if (key.startsWith('heavy')) return 'pace-heavy';
    return 'pace-light';
  }

  function formatDayLabel(dateStr, weekday) {
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const wd = weekday || d.toLocaleDateString('en-US', { weekday: 'short' });
    return `${wd} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMeta() {
    const meta = state.trip.itinerary.meta;
    el.metaChips.innerHTML = `
      <span class="chip"><strong>${meta.days}</strong> days in Japan</span>
      <span class="chip"><strong>1</strong> night in Kawaguchiko</span>
      <span class="chip"><strong>Toddler + infant</strong> pace</span>
    `;
  }

  function renderOverview() {
    el.overviewChips.innerHTML = LOCKED.map((item) => {
      const day = state.trip.itinerary.days.find((d) => d.date === item.date);
      const booked = day && day.tags && day.tags.includes('booked');
      return `<span class="chip locked">${escapeHtml(item.label)}${booked ? ' · booked' : ''}</span>`;
    }).join('');
  }

  function renderAudit() {
    const audit = state.trip.audit;
    const s = audit.summary || {};
    el.auditStats.innerHTML = `
      <span class="stat open"><strong>${s.open || 0}</strong> open</span>
      <span class="stat booked"><strong>${s.booked || 0}</strong> booked</span>
      <span class="stat confirmed"><strong>${s.confirmed || 0}</strong> confirmed</span>
      <span class="stat done"><strong>${s.done || 0}</strong> done</span>
    `;

    el.auditList.innerHTML = audit.items.map((item) => `
      <li data-id="${escapeHtml(item.id)}">
        <div class="item-top">
          <p class="item-title">${escapeHtml(item.title)}</p>
          <span class="badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
        </div>
        <div class="item-meta">
          <span>${escapeHtml(item.category)}</span>
          <span>·</span>
          <span>${escapeHtml(item.dueHint || '')}</span>
          ${item.relatedDay ? `<span>·</span><span>${escapeHtml(item.relatedDay)}</span>` : ''}
        </div>
        ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ''}
      </li>
    `).join('');
  }

  function renderChecklist() {
    const items = state.trip.checklist.items.slice().sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
    });

    el.checklistList.innerHTML = items.map((item) => `
      <li data-id="${escapeHtml(item.id)}">
        <div class="item-top">
          <p class="item-title">${escapeHtml(item.title)}</p>
          <span class="badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
        </div>
        <div class="item-meta">
          <span class="badge ${item.priority === 'high' ? 'open' : 'confirmed'}">${escapeHtml(item.priority)} priority</span>
          <span>${escapeHtml(item.deadlineHint || '')}</span>
        </div>
      </li>
    `).join('');
  }

  function renderDays() {
    el.dayList.innerHTML = state.trip.itinerary.days.map((day) => {
      const active = state.selectedDay === day.date ? 'is-active' : '';
      const highlight = day.highlight ? 'highlight' : '';
      return `
        <button type="button" class="day-card ${active} ${highlight}" data-day="${escapeHtml(day.date)}">
          <div class="day-card-top">
            <span class="day-date">${escapeHtml(formatDayLabel(day.date, day.weekday))}</span>
            <span class="badge ${paceClass(day.pace)}">${escapeHtml(day.pace)}</span>
          </div>
          <p class="day-title">${escapeHtml(day.title)}</p>
          <p class="day-summary">${escapeHtml(day.summary)}</p>
        </button>
      `;
    }).join('');
  }

  function findBriefing(date) {
    return (state.trip.briefings.days || []).find((d) => d.date === date) || null;
  }

  function findDay(date) {
    return state.trip.itinerary.days.find((d) => d.date === date) || null;
  }

  function renderBriefing() {
    if (!state.selectedDay) {
      el.briefing.hidden = true;
      return;
    }
    const day = findDay(state.selectedDay);
    const brief = findBriefing(state.selectedDay);
    if (!day || !brief) {
      el.briefing.hidden = true;
      return;
    }

    el.briefing.hidden = false;
    el.briefingTitle.textContent = `${formatDayLabel(day.date, day.weekday)} · ${brief.headline}`;

    const activities = (day.activities || []).map((a) => `<li>${escapeHtml(a)}</li>`).join('');
    const packing = (brief.packing || []).map((a) => `<li>${escapeHtml(a)}</li>`).join('');
    const handoffs = (brief.handoffs || []).map((a) => `<li>${escapeHtml(a)}</li>`).join('');
    const questions = (brief.openQuestions || []).map((a) => `<li>${escapeHtml(a)}</li>`).join('');
    const evening = day.adultEvening
      ? `<p><strong>${escapeHtml(day.adultEvening.place)}</strong> · ${escapeHtml(day.adultEvening.time)}</p>
         <p class="muted">Needs: ${(day.adultEvening.needs || []).map(escapeHtml).join(', ')}</p>`
      : '<p class="muted">No adult evening planned.</p>';

    el.briefingBody.innerHTML = `
      <p class="muted" style="margin-top:0">${escapeHtml(day.notes || '')}</p>
      <div class="briefing-grid">
        <div class="brief-block"><h3>Morning</h3><p>${escapeHtml(brief.morning)}</p></div>
        <div class="brief-block"><h3>Afternoon</h3><p>${escapeHtml(brief.afternoon)}</p></div>
        <div class="brief-block"><h3>Evening</h3><p>${escapeHtml(brief.evening)}</p></div>
        <div class="brief-block"><h3>Adult evening</h3>${evening}</div>
        <div class="brief-block"><h3>Plan</h3><ul>${activities}</ul></div>
        <div class="brief-block"><h3>Packing</h3><ul>${packing || '<li class="muted">—</li>'}</ul></div>
        <div class="brief-block"><h3>Handoffs</h3><ul>${handoffs || '<li class="muted">None</li>'}</ul></div>
        <div class="brief-block"><h3>Open questions</h3><ul>${questions || '<li class="muted">None</li>'}</ul></div>
      </div>
    `;

    el.briefing.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    renderMeta();
    renderOverview();
    renderAudit();
    renderChecklist();
    renderDays();
    renderBriefing();
    el.loadStatus.textContent = 'Public read-only copy';
  }

  document.body.addEventListener('click', (e) => {
    const dayBtn = e.target.closest('[data-day].day-card');
    if (!dayBtn) return;
    state.selectedDay = dayBtn.getAttribute('data-day');
    renderDays();
    renderBriefing();
  });

  el.closeBriefing.addEventListener('click', () => {
    state.selectedDay = null;
    renderDays();
    renderBriefing();
  });

  fetch('trip.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load trip');
      return res.json();
    })
    .then((trip) => {
      state.trip = trip;
      render();
    })
    .catch((err) => {
      el.loadStatus.textContent = `Could not load trip data: ${err.message}`;
    });
})();
