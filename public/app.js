// ==========================================================================
// StudySwap — Minimal Professional Client Logic
// CareerSwami Full-Stack Web Development Project 1
// ==========================================================================

const state = {
  sessions: [],
  bookings: [],
  activeSessionFilter: 'all',
  activeBookingFilter: 'all',
  bookingSearchTerm: '',
  activeLogFilter: 'all',
  logs: [],
  currentDetailSessionId: null,
  lastProofSteps: []
};

// DOM References
const healthBadge = document.getElementById('health-badge');
const healthText = document.getElementById('health-text');
const resetBtn = document.getElementById('reset-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const specsModalBtn = document.getElementById('specs-modal-btn');
const specsModal = document.getElementById('specs-modal');
const specsModalCloseBtn = document.getElementById('specs-modal-close-btn');

// Stats DOM
const statTotalSessions = document.getElementById('stat-total-sessions');
const statSeatUtilization = document.getElementById('stat-seat-utilization');
const statAvailableSeats = document.getElementById('stat-available-seats');

// Sessions DOM
const sessionsGrid = document.getElementById('sessions-grid');
const sessionSelect = document.getElementById('session-select');
const sessionCapacityHint = document.getElementById('session-capacity-hint');
const refreshSessionsBtn = document.getElementById('refresh-sessions-btn');
const sessionFilterAll = document.getElementById('session-filter-all');
const sessionFilterAvailable = document.getElementById('session-filter-available');
const sessionFilterFull = document.getElementById('session-filter-full');

// Booking Form DOM
const bookingForm = document.getElementById('booking-form');
const aliasInput = document.getElementById('alias-input');
const randomAliasBtn = document.getElementById('random-alias-btn');
const bookSubmitBtn = document.getElementById('book-submit-btn');
const bookingAlert = document.getElementById('booking-alert');

// Proof Suite DOM
const runWorkedExampleBtn = document.getElementById('run-worked-example-btn');
const runConcurrencyBurstBtn = document.getElementById('run-concurrency-burst-btn');
const runDuplicateTestBtn = document.getElementById('run-duplicate-test-btn');
const runInvalidSessionTestBtn = document.getElementById('run-invalid-session-test-btn');
const clearResultsBtn = document.getElementById('clear-results-btn');
const copyEvidenceBtn = document.getElementById('copy-evidence-btn');
const proofCard = document.getElementById('proof-results');
const proofTitle = document.getElementById('proof-title');
const proofSummary = document.getElementById('proof-summary');
const proofTbody = document.getElementById('proof-tbody');

// Bookings Table DOM
const bookingsTbody = document.getElementById('bookings-tbody');
const refreshBookingsBtn = document.getElementById('refresh-bookings-btn');
const bookingSearchInput = document.getElementById('booking-search-input');
const bookingFilterAll = document.getElementById('booking-filter-all');
const bookingFilterActive = document.getElementById('booking-filter-active');
const bookingFilterCancelled = document.getElementById('booking-filter-cancelled');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Inspector DOM
const logConsole = document.getElementById('log-console');
const clearLogBtn = document.getElementById('clear-log-btn');
const logCounter = document.getElementById('log-counter');
const logFilterAll = document.getElementById('log-filter-all');
const logFilterSuccess = document.getElementById('log-filter-success');
const logFilterError = document.getElementById('log-filter-error');

// Session Detail Modal DOM
const sessionDetailModal = document.getElementById('session-detail-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const detailSessionId = document.getElementById('detail-session-id');
const detailModalTitle = document.getElementById('detail-modal-title');
const detailSchedule = document.getElementById('detail-schedule');
const detailCapacity = document.getElementById('detail-capacity');
const detailConfirmedCount = document.getElementById('detail-confirmed-count');
const detailAvailablePlaces = document.getElementById('detail-available-places');
const detailSeatsMap = document.getElementById('detail-seats-map');
const detailAttendeeCount = document.getElementById('detail-attendee-count');
const detailAttendeesTbody = document.getElementById('detail-attendees-tbody');
const detailBookingBox = document.getElementById('detail-booking-box');
const detailBookingForm = document.getElementById('detail-booking-form');
const detailAliasInput = document.getElementById('detail-alias-input');
const detailRandomAliasBtn = document.getElementById('detail-random-alias-btn');
const detailSubmitBtn = document.getElementById('detail-submit-btn');
const detailAlert = document.getElementById('detail-alert');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// ==========================================================================
// Toast Notification Engine (Minimal)
// ==========================================================================
function showToast(title, message, duration = 3500) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-body">
      <span class="toast-title">${escapeHTML(title)}</span>
      <span class="toast-msg">${escapeHTML(message)}</span>
    </div>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, duration);
  }
}

// ==========================================================================
// HTTP Inspector Logger
// ==========================================================================
function logTraffic(method, path, status, payload) {
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = {
    id: Date.now() + Math.random(),
    time,
    method,
    path,
    status,
    payload
  };

  state.logs.push(entry);
  if (state.logs.length > 80) state.logs.shift();

  renderLogEntry(entry);
  updateLogCounter();
}

function renderLogEntry(entry) {
  const is2xx = entry.status >= 200 && entry.status < 300;
  const is4xx = entry.status >= 400;

  if (state.activeLogFilter === '2xx' && !is2xx) return;
  if (state.activeLogFilter === '4xx' && !is4xx) return;

  const row = document.createElement('div');
  row.className = 'console-line';
  const payloadStr = typeof entry.payload === 'object' ? JSON.stringify(entry.payload) : String(entry.payload);

  row.innerHTML = `
    <span class="c-time">[${entry.time}]</span>
    <span class="c-method">${entry.method}</span>
    <span>${escapeHTML(entry.path)}</span> &rarr;
    <span class="c-${entry.status}">HTTP ${entry.status}</span>
    <span class="text-muted">${escapeHTML(payloadStr)}</span>
  `;

  logConsole.prepend(row);
}

function reRenderLogs() {
  logConsole.innerHTML = '';
  state.logs.forEach(entry => renderLogEntry(entry));
}

function updateLogCounter() {
  if (logCounter) {
    logCounter.textContent = `${state.logs.length} logged`;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================================================
// 1. Health Check
// ==========================================================================
async function checkHealth() {
  const start = performance.now();
  try {
    const res = await fetch('/health');
    const latency = Math.round(performance.now() - start);
    const data = await res.json();

    if (res.ok && data.status === 'ok') {
      healthBadge.className = 'system-status online';
      healthText.textContent = `Online (${latency}ms)`;
    } else {
      healthBadge.className = 'system-status offline';
      healthText.textContent = 'Degraded';
    }
  } catch (err) {
    healthBadge.className = 'system-status offline';
    healthText.textContent = 'Offline';
  }
}

// ==========================================================================
// 2. Metrics & Overview Bar
// ==========================================================================
function updateMetrics() {
  const totalSessions = state.sessions.length;
  let totalCapacity = 0;
  let totalBooked = 0;

  state.sessions.forEach(s => {
    totalCapacity += Number(s.capacity || 0);
    totalBooked += Number(s.booked_count || 0);
  });

  const availablePlaces = Math.max(0, totalCapacity - totalBooked);

  statTotalSessions.textContent = `${totalSessions}`;
  statSeatUtilization.textContent = `${totalBooked} / ${totalCapacity}`;
  statAvailableSeats.textContent = `${availablePlaces} remaining`;
}

// ==========================================================================
// 3. Load & Render Sessions (Flow 1 & 2)
// ==========================================================================
async function loadSessions() {
  try {
    const res = await fetch('/sessions');
    const data = await res.json();
    logTraffic('GET', '/sessions', res.status, `Loaded ${data.length} sessions`);
    state.sessions = data;
    updateMetrics();
    renderSessions();
    renderSessionSelect();

    if (state.currentDetailSessionId && !sessionDetailModal.classList.contains('hidden')) {
      openSessionDetail(state.currentDetailSessionId, false);
    }
  } catch (err) {
    sessionsGrid.innerHTML = `<div class="empty-cell text-danger">Failed to load sessions: ${escapeHTML(err.message)}</div>`;
  }
}

function renderSessions() {
  sessionsGrid.innerHTML = '';

  let filtered = state.sessions.filter(s => {
    if (state.activeSessionFilter === 'available') return s.available_places > 0;
    if (state.activeSessionFilter === 'full') return s.available_places <= 0;
    return true;
  });

  if (filtered.length === 0) {
    sessionsGrid.innerHTML = `<div class="empty-cell">No sessions match current filter.</div>`;
    return;
  }

  filtered.forEach(s => {
    const isFull = s.available_places <= 0;
    const percent = Math.min(100, Math.round((s.booked_count / s.capacity) * 100));

    const row = document.createElement('div');
    row.className = 'session-row';
    row.innerHTML = `
      <div class="session-info">
        <div class="session-top">
          <span class="pill-id">${s.id}</span>
          <span class="session-name">${escapeHTML(s.title)}</span>
        </div>
        <div class="session-details-meta">
          <span>Day ${s.project_day}</span>
          <span>&middot;</span>
          <span>${s.time}</span>
          <span>&middot;</span>
          <span class="${isFull ? 'text-danger' : 'text-muted'}">${isFull ? 'Capacity full' : `${s.available_places} place(s) left`}</span>
        </div>
      </div>

      <div class="session-capacity-col">
        <span class="capacity-text">${s.booked_count} of ${s.capacity} booked</span>
        <div class="capacity-bar">
          <div class="capacity-fill ${isFull ? 'is-full' : ''}" style="width: ${percent}%"></div>
        </div>
      </div>

      <div class="session-row-actions">
        <button class="btn btn-secondary btn-sm btn-view-detail" data-id="${s.id}">
          Details
        </button>
        <button class="btn btn-secondary btn-sm btn-quick-select" data-id="${s.id}">
          ${isFull ? 'Test 409' : 'Select'}
        </button>
      </div>
    `;

    sessionsGrid.appendChild(row);
  });

  // Attach card event listeners
  document.querySelectorAll('.btn-view-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openSessionDetail(id);
    });
  });

  document.querySelectorAll('.btn-quick-select').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      sessionSelect.value = id;
      handleSessionSelectChange();
      bookingForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (!aliasInput.value) generateRandomAlias();
      aliasInput.focus();
    });
  });
}

function renderSessionSelect() {
  const currentVal = sessionSelect.value;
  sessionSelect.innerHTML = '<option value="">Select a session...</option>';

  state.sessions.forEach(s => {
    const isFull = s.available_places <= 0;
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.id} — ${s.title} (${s.booked_count}/${s.capacity})${isFull ? ' [FULL]' : ''}`;
    sessionSelect.appendChild(opt);
  });

  if (currentVal) sessionSelect.value = currentVal;
  handleSessionSelectChange();
}

function handleSessionSelectChange() {
  const selectedId = sessionSelect.value;
  if (!selectedId) {
    sessionCapacityHint.textContent = 'Select a session to view remaining capacity';
    sessionCapacityHint.style.color = '';
    return;
  }

  const session = state.sessions.find(s => s.id === selectedId);
  if (!session) return;

  if (session.available_places <= 0) {
    sessionCapacityHint.textContent = `Full capacity (${session.booked_count}/${session.capacity}). Booking will return HTTP 409 Conflict.`;
    sessionCapacityHint.style.color = 'var(--state-danger)';
  } else {
    sessionCapacityHint.textContent = `${session.available_places} of ${session.capacity} places open for booking.`;
    sessionCapacityHint.style.color = 'var(--state-success)';
  }
}

sessionSelect.addEventListener('change', handleSessionSelectChange);

// ==========================================================================
// 4. Session Details Modal (Flow 2: "Show one in detail")
// ==========================================================================
async function openSessionDetail(sessionId, showLoading = true) {
  state.currentDetailSessionId = sessionId;
  sessionDetailModal.classList.remove('hidden');

  if (showLoading) {
    detailModalTitle.textContent = `Session ${sessionId}`;
    detailAttendeesTbody.innerHTML = `<tr><td colspan="4" class="empty-cell">Loading details...</td></tr>`;
  }

  try {
    const res = await fetch(`/sessions/${sessionId}`);
    const session = await res.json();
    logTraffic('GET', `/sessions/${sessionId}`, res.status, session);

    if (!res.ok) {
      showToast('Error', session.message || 'Could not load details');
      closeSessionDetailModal();
      return;
    }

    detailSessionId.textContent = session.id;
    detailModalTitle.textContent = session.title;
    detailSchedule.textContent = `Day ${session.project_day} · ${session.time}`;
    detailCapacity.textContent = `${session.capacity} seats`;
    detailConfirmedCount.textContent = `${session.booked_count} confirmed`;
    detailAvailablePlaces.textContent = `${session.available_places} remaining`;

    // Render Seats allocation row
    detailSeatsMap.innerHTML = '';
    const activeBookings = (session.bookings || []).filter(b => b.status === 'confirmed');

    for (let i = 1; i <= session.capacity; i++) {
      const booking = activeBookings[i - 1];
      const slot = document.createElement('div');
      slot.className = `seat-slot ${booking ? 'occupied' : ''}`;
      slot.innerHTML = `
        <span class="text-muted">#${i}</span>
        <span>${booking ? escapeHTML(booking.alias) : 'Open'}</span>
      `;
      detailSeatsMap.appendChild(slot);
    }

    // Render Attendees Table
    detailAttendeeCount.textContent = activeBookings.length;
    detailAttendeesTbody.innerHTML = '';

    if (activeBookings.length === 0) {
      detailAttendeesTbody.innerHTML = `<tr><td colspan="4" class="empty-cell">No confirmed bookings.</td></tr>`;
    } else {
      activeBookings.forEach(b => {
        const tr = document.createElement('tr');
        const bookedTime = new Date(b.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
        tr.innerHTML = `
          <td><span class="text-mono">${escapeHTML(b.alias)}</span></td>
          <td><span class="text-mono text-muted">${escapeHTML(b.id)}</span></td>
          <td>${bookedTime}</td>
          <td style="text-align: right;">
            <button class="btn-danger-text btn-modal-cancel" data-id="${b.id}" data-alias="${b.alias}">
              Cancel
            </button>
          </td>
        `;
        detailAttendeesTbody.appendChild(tr);
      });

      detailAttendeesTbody.querySelectorAll('.btn-modal-cancel').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const bookingId = e.currentTarget.dataset.id;
          const alias = e.currentTarget.dataset.alias;
          if (confirm(`Cancel booking for "${alias}"? The seat will be released immediately.`)) {
            await cancelBookingAction(bookingId, false);
            await openSessionDetail(sessionId, false);
          }
        });
      });
    }

    detailAlert.className = 'alert-box hidden';
    if (!detailAliasInput.value) {
      detailAliasInput.value = generateRandomAliasValue();
    }

  } catch (err) {
    detailAttendeesTbody.innerHTML = `<tr><td colspan="4" class="empty-cell text-danger">Error: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function closeSessionDetailModal() {
  sessionDetailModal.classList.add('hidden');
  state.currentDetailSessionId = null;
}

modalCloseBtn.addEventListener('click', closeSessionDetailModal);
sessionDetailModal.addEventListener('click', (e) => {
  if (e.target === sessionDetailModal) closeSessionDetailModal();
});

// In-Modal Quick Book submission
detailBookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sessionId = state.currentDetailSessionId;
  const alias = detailAliasInput.value.trim();

  if (!sessionId || !alias) return;

  try {
    const res = await fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, alias })
    });
    const data = await res.json();
    logTraffic('POST', '/bookings', res.status, data);

    if (res.status === 201) {
      showToast('Booking Created', `${alias} confirmed on ${sessionId}`);
      detailAlert.className = 'alert-box success';
      detailAlert.textContent = `Booked for "${alias}". ID: ${data.id}`;
      detailAlert.classList.remove('hidden');
      detailAliasInput.value = generateRandomAliasValue();
      await Promise.all([loadSessions(), loadBookings()]);
      await openSessionDetail(sessionId, false);
    } else if (res.status === 409) {
      showToast('Conflict (409)', data.message);
      detailAlert.className = 'alert-box error';
      detailAlert.textContent = `HTTP 409 Conflict: ${data.message}`;
      detailAlert.classList.remove('hidden');
      await loadSessions();
    } else {
      showToast('Error', data.message || 'Booking failed');
      detailAlert.className = 'alert-box error';
      detailAlert.textContent = `HTTP ${res.status}: ${data.message || 'Booking failed'}`;
      detailAlert.classList.remove('hidden');
    }
  } catch (err) {
    showToast('Network Error', err.message);
  }
});

detailRandomAliasBtn.addEventListener('click', () => {
  detailAliasInput.value = generateRandomAliasValue();
});

// ==========================================================================
// 5. Booking Form Submission (Flow 3: "Book a place")
// ==========================================================================
bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sessionId = sessionSelect.value;
  const alias = aliasInput.value.trim();

  if (!sessionId) {
    showAlert('error', 'Select a target session.');
    return;
  }
  if (!alias) {
    showAlert('error', 'Enter a fictional alias.');
    return;
  }

  bookSubmitBtn.disabled = true;
  bookSubmitBtn.textContent = 'Processing...';

  try {
    const res = await fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, alias })
    });
    const data = await res.json();
    logTraffic('POST', '/bookings', res.status, data);

    if (res.status === 201) {
      showToast('Confirmed', `Seat booked on ${sessionId} for "${alias}"`);
      showAlert('success', `HTTP 201 Created: Booking confirmed for "${alias}" (${sessionId}). ID: <code>${data.id}</code>`);
      aliasInput.value = '';
      generateRandomAlias();
      await Promise.all([loadSessions(), loadBookings()]);
    } else if (res.status === 409) {
      showToast('Refused (409)', data.message);
      showAlert('error', `HTTP 409 Conflict: ${data.message}`);
      await loadSessions();
    } else if (res.status === 404) {
      showToast('Not Found (404)', data.message);
      showAlert('error', `HTTP 404 Not Found: ${data.message}`);
    } else {
      showToast('Error', data.message || 'Request failed');
      showAlert('error', `HTTP ${res.status}: ${data.message || 'Request failed'}`);
    }
  } catch (err) {
    showToast('Network Error', err.message);
    showAlert('error', `Network error: ${err.message}`);
  } finally {
    bookSubmitBtn.disabled = false;
    bookSubmitBtn.textContent = 'Confirm Booking';
  }
});

function showAlert(type, message) {
  bookingAlert.className = `alert-box ${type}`;
  bookingAlert.innerHTML = message;
  bookingAlert.classList.remove('hidden');
}

// Random Alias Generator
const ALIAS_LIST = [
  'owl42', 'badger99', 'falcon07', 'fox18', 'wolf88', 
  'lynx33', 'panda11', 'bear21', 'otter55', 'hawk90'
];

function generateRandomAliasValue() {
  return ALIAS_LIST[Math.floor(Math.random() * ALIAS_LIST.length)];
}

function generateRandomAlias() {
  aliasInput.value = generateRandomAliasValue();
}

randomAliasBtn.addEventListener('click', generateRandomAlias);

document.querySelectorAll('.alias-tag').forEach(tag => {
  tag.addEventListener('click', (e) => {
    aliasInput.value = e.currentTarget.dataset.alias;
    aliasInput.focus();
  });
});

// ==========================================================================
// 6. Current Bookings & Cancellation (Flow 4: "Cancel a booking")
// ==========================================================================
async function loadBookings() {
  try {
    const res = await fetch('/bookings');
    const data = await res.json();
    logTraffic('GET', '/bookings', res.status, `Loaded ${data.length} bookings`);
    state.bookings = data;
    renderBookings();
  } catch (err) {
    bookingsTbody.innerHTML = `<tr><td colspan="6" class="empty-cell text-danger">Failed to load bookings: ${escapeHTML(err.message)}</td></tr>`;
  }
}

function renderBookings() {
  bookingsTbody.innerHTML = '';

  let filtered = state.bookings.filter(b => {
    if (state.activeBookingFilter === 'active') return b.status === 'confirmed';
    if (state.activeBookingFilter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  if (state.bookingSearchTerm) {
    const term = state.bookingSearchTerm.toLowerCase();
    filtered = filtered.filter(b => 
      b.alias.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term) ||
      b.sessionId.toLowerCase().includes(term) ||
      (b.session_title && b.session_title.toLowerCase().includes(term))
    );
  }

  if (filtered.length === 0) {
    bookingsTbody.innerHTML = `<tr><td colspan="6" class="empty-cell">No bookings found.</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const tr = document.createElement('tr');
    const isCancelled = b.status === 'cancelled';
    const dateFormatted = new Date(b.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    tr.innerHTML = `
      <td>
        <button class="copy-id-link" data-id="${b.id}" title="Click to copy ID">
          ${b.id}
        </button>
      </td>
      <td><strong>${b.sessionId}</strong> &middot; <span class="text-muted">${escapeHTML(b.session_title || 'Session')}</span></td>
      <td><span class="text-mono">${escapeHTML(b.alias)}</span></td>
      <td>
        <span class="status-tag ${isCancelled ? 'cancelled' : 'confirmed'}">
          ${isCancelled ? 'Cancelled' : 'Confirmed'}
        </span>
      </td>
      <td class="text-muted">${dateFormatted}</td>
      <td style="text-align: right;">
        ${isCancelled 
          ? '<span class="text-muted">Released</span>' 
          : `<button class="btn-danger-text btn-cancel-booking" data-id="${b.id}" data-alias="${b.alias}">
               Cancel
             </button>`}
      </td>
    `;
    bookingsTbody.appendChild(tr);
  });

  bookingsTbody.querySelectorAll('.copy-id-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      navigator.clipboard.writeText(id);
      showToast('Copied', `ID: ${id}`);
    });
  });

  bookingsTbody.querySelectorAll('.btn-cancel-booking').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bookingId = e.currentTarget.dataset.id;
      const alias = e.currentTarget.dataset.alias;
      if (confirm(`Cancel booking for "${alias}"? The seat will be released immediately.`)) {
        await cancelBookingAction(bookingId);
      }
    });
  });
}

async function cancelBookingAction(bookingId, showGlobalAlert = true) {
  try {
    const res = await fetch(`/bookings/${bookingId}/cancel`, { method: 'POST' });
    const data = await res.json();
    logTraffic('POST', `/bookings/${bookingId}/cancel`, res.status, data);

    if (res.ok) {
      showToast('Cancelled', `Booking ${bookingId} released.`);
      if (showGlobalAlert) {
        showAlert('success', `Booking ${bookingId} cancelled. Place returned to pool.`);
      }
      await Promise.all([loadSessions(), loadBookings()]);
    } else {
      showToast('Cancel Failed', data.message || 'Unknown error');
      if (showGlobalAlert) {
        showAlert('error', `Cancel failed: ${data.message || 'Unknown error'}`);
      }
    }
  } catch (err) {
    showToast('Network Error', err.message);
    if (showGlobalAlert) {
      showAlert('error', `Network error: ${err.message}`);
    }
  }
}

// ==========================================================================
// 7. Interactive Verification & Proofs Suite
// ==========================================================================

// Test 1: Brief Worked Example
runWorkedExampleBtn.addEventListener('click', async () => {
  proofCard.classList.remove('hidden');
  proofTitle.textContent = 'Worked Example Proof (S1 Capacity 3)';
  proofSummary.textContent = 'Resetting -> Booking 3 places -> 4th rejected with 409 -> Cancel 1 -> Retry 4th succeeds with 201.';
  proofTbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Running test sequence...</td></tr>';

  await fetch('/reset', { method: 'POST' });

  const steps = [
    { desc: 'Book Seat 1 on S1', sessionId: 'S1', alias: 'owl10', expectedStatus: 201 },
    { desc: 'Book Seat 2 on S1', sessionId: 'S1', alias: 'owl20', expectedStatus: 201 },
    { desc: 'Book Seat 3 on S1 (Fills Capacity)', sessionId: 'S1', alias: 'owl30', expectedStatus: 201 },
    { desc: 'Attempt 4th Booking on S1 (Must be rejected)', sessionId: 'S1', alias: 'owl42', expectedStatus: 409 }
  ];

  proofTbody.innerHTML = '';
  state.lastProofSteps = [];
  let seat1BookingId = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const res = await fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: step.sessionId, alias: step.alias })
    });
    const data = await res.json();
    logTraffic('POST', '/bookings', res.status, data);

    if (i === 0 && res.ok) seat1BookingId = data.id;
    addProofRow(i + 1, step.desc, `alias: ${step.alias}`, res.status, data, res.status === step.expectedStatus);
  }

  if (seat1BookingId) {
    const cancelRes = await fetch(`/bookings/${seat1BookingId}/cancel`, { method: 'POST' });
    const cancelData = await cancelRes.json();
    logTraffic('POST', `/bookings/${seat1BookingId}/cancel`, cancelRes.status, cancelData);
    addProofRow(5, 'Cancel Seat 1', `Release 1 place`, cancelRes.status, cancelData, cancelRes.status === 200);

    const retryRes = await fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'S1', alias: 'owl42' })
    });
    const retryData = await retryRes.json();
    logTraffic('POST', '/bookings', retryRes.status, retryData);

    const retryPass = retryRes.status === 201;
    addProofRow(6, 'Re-attempt 4th Booking ("owl42")', 'Place available; succeeds', retryRes.status, retryData, retryPass);
    if (retryPass) showToast('Verification Complete', 'Worked example passed all 6 steps.');
  }

  await Promise.all([loadSessions(), loadBookings()]);
});

// Test 2: Concurrency Burst
runConcurrencyBurstBtn.addEventListener('click', async () => {
  proofCard.classList.remove('hidden');
  proofTitle.textContent = 'Concurrent Race Burst (S2 Capacity 2)';
  proofSummary.textContent = 'Firing 5 simultaneous requests. Exactly 2 must succeed (201) and 3 rejected (409).';
  proofTbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Firing 5 simultaneous requests...</td></tr>';

  await fetch('/reset', { method: 'POST' });

  const aliases = ['racer_a', 'racer_b', 'racer_c', 'racer_d', 'racer_e'];
  state.lastProofSteps = [];

  const promises = aliases.map(alias => 
    fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'S2', alias })
    }).then(async res => ({
      alias,
      status: res.status,
      body: await res.json()
    }))
  );

  const results = await Promise.all(promises);
  proofTbody.innerHTML = '';

  let successCount = 0;
  let rejectedCount = 0;

  results.forEach((r, idx) => {
    if (r.status === 201) successCount++;
    if (r.status === 409) rejectedCount++;

    addProofRow(
      idx + 1,
      `Concurrent Request #${idx + 1}`,
      `alias: ${r.alias}`,
      r.status,
      r.body,
      r.status === 201 || r.status === 409,
      r.status === 201 ? 'BOOKED' : 'BLOCKED'
    );
  });

  const passed = successCount === 2 && rejectedCount === 3;
  proofSummary.textContent = `Result: ${successCount} booked (201), ${rejectedCount} rejected (409). Constraint holds: ${passed ? 'PASSED' : 'FAILED'}`;
  showToast('Burst Complete', `${successCount} accepted, ${rejectedCount} blocked.`);

  await Promise.all([loadSessions(), loadBookings()]);
});

// Test 3: Duplicate Booking
runDuplicateTestBtn.addEventListener('click', async () => {
  proofCard.classList.remove('hidden');
  proofTitle.textContent = 'Duplicate Booking Rule (Case 3)';
  proofSummary.textContent = 'Testing that an alias cannot hold more than 1 active booking on the same session.';
  proofTbody.innerHTML = '';
  state.lastProofSteps = [];

  const alias = 'dup_tester_42';

  const res1 = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'S3', alias })
  });
  const data1 = await res1.json();
  logTraffic('POST', '/bookings', res1.status, data1);
  addProofRow(1, 'Initial Booking for Alias on S3', `alias: ${alias}`, res1.status, data1, res1.status === 201);

  const res2 = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'S3', alias })
  });
  const data2 = await res2.json();
  logTraffic('POST', '/bookings', res2.status, data2);
  const isDuplicateBlocked = res2.status === 409 && data2.error === 'duplicate_booking';
  addProofRow(2, 'Duplicate Attempt on Same Session', 'Must reject with 409', res2.status, data2, isDuplicateBlocked);

  proofSummary.textContent = `Duplicate Prevention: ${isDuplicateBlocked ? 'PASSED (Enforced)' : 'FAILED'}`;
  await Promise.all([loadSessions(), loadBookings()]);
});

// Test 4: Invalid Session ID
runInvalidSessionTestBtn.addEventListener('click', async () => {
  proofCard.classList.remove('hidden');
  proofTitle.textContent = 'Invalid Session ID Rejection (Case 2)';
  proofSummary.textContent = 'Testing that non-existent session ID "S999" returns HTTP 404.';
  proofTbody.innerHTML = '';
  state.lastProofSteps = [];

  const res = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'S999', alias: 'tester' })
  });
  const data = await res.json();
  logTraffic('POST', '/bookings', res.status, data);

  const passed = res.status === 404;
  addProofRow(1, 'POST /bookings with sessionId "S999"', 'Session does not exist', res.status, data, passed);
  proofSummary.textContent = `Validation: ${passed ? 'PASSED (404 Not Found)' : 'FAILED'}`;
});

function addProofRow(stepNum, desc, subtext, status, payload, pass, customVerdict = null) {
  const tr = document.createElement('tr');
  const verdict = customVerdict || (pass ? 'Pass' : 'Fail');
  const verdictClass = pass ? 'confirmed' : 'rejected';
  const statusClass = status === 201 || status === 200 ? 'confirmed' : status === 409 ? 'rejected' : 'cancelled';

  tr.innerHTML = `
    <td class="text-mono">${stepNum}</td>
    <td><strong>${escapeHTML(desc)}</strong> <span class="text-muted">(${subtext})</span></td>
    <td><span class="status-tag ${statusClass}">HTTP ${status}</span></td>
    <td><code class="text-mono">${escapeHTML(JSON.stringify(payload))}</code></td>
    <td style="text-align: right;"><span class="status-tag ${verdictClass}">${verdict}</span></td>
  `;
  proofTbody.appendChild(tr);

  state.lastProofSteps.push({
    step: stepNum,
    desc,
    status,
    payload: JSON.stringify(payload),
    verdict
  });
}

// Copy Markdown
copyEvidenceBtn.addEventListener('click', () => {
  if (state.lastProofSteps.length === 0) {
    showToast('Notice', 'Run a test first to generate evidence.');
    return;
  }

  let md = `### StudySwap Verification Proof\n`;
  md += `**Test:** ${proofTitle.textContent}\n\n`;
  md += `| # | Operation | Status | Response | Result |\n`;
  md += `|---|-----------|--------|----------|--------|\n`;

  state.lastProofSteps.forEach(s => {
    md += `| ${s.step} | ${s.desc} | HTTP ${s.status} | \`${s.payload.replace(/\|/g, '\\|')}\` | **${s.verdict}** |\n`;
  });

  navigator.clipboard.writeText(md);
  showToast('Copied', 'Evidence copied as Markdown table.');
});

clearResultsBtn.addEventListener('click', () => {
  proofCard.classList.add('hidden');
  state.lastProofSteps = [];
});

// ==========================================================================
// 8. Database Reset & Filters
// ==========================================================================
resetBtn.addEventListener('click', async () => {
  if (!confirm('Reset database to clean initial seed data?')) return;
  try {
    const res = await fetch('/reset', { method: 'POST' });
    const data = await res.json();
    logTraffic('POST', '/reset', res.status, data);
    showToast('Database Reset', 'Initial seed data reloaded.');
    showAlert('success', 'Database reset and re-seeded from sessions.csv.');
    await Promise.all([loadSessions(), loadBookings()]);
  } catch (err) {
    showToast('Reset Failed', err.message);
    showAlert('error', `Failed to reset database: ${err.message}`);
  }
});

refreshSessionsBtn.addEventListener('click', loadSessions);
refreshBookingsBtn.addEventListener('click', loadBookings);

sessionFilterAll.addEventListener('click', () => setSessionFilter('all'));
sessionFilterAvailable.addEventListener('click', () => setSessionFilter('available'));
sessionFilterFull.addEventListener('click', () => setSessionFilter('full'));

function setSessionFilter(filter) {
  state.activeSessionFilter = filter;
  [sessionFilterAll, sessionFilterAvailable, sessionFilterFull].forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderSessions();
}

bookingFilterAll.addEventListener('click', () => setBookingFilter('all'));
bookingFilterActive.addEventListener('click', () => setBookingFilter('active'));
bookingFilterCancelled.addEventListener('click', () => setBookingFilter('cancelled'));

function setBookingFilter(filter) {
  state.activeBookingFilter = filter;
  [bookingFilterAll, bookingFilterActive, bookingFilterCancelled].forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderBookings();
}

bookingSearchInput.addEventListener('input', (e) => {
  state.bookingSearchTerm = e.target.value.trim();
  renderBookings();
});

logFilterAll.addEventListener('click', () => setLogFilter('all'));
logFilterSuccess.addEventListener('click', () => setLogFilter('2xx'));
logFilterError.addEventListener('click', () => setLogFilter('4xx'));

function setLogFilter(filter) {
  state.activeLogFilter = filter;
  [logFilterAll, logFilterSuccess, logFilterError].forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  reRenderLogs();
}

clearLogBtn.addEventListener('click', () => {
  state.logs = [];
  logConsole.innerHTML = '<div class="console-line text-muted">[Inspector cleared]</div>';
  updateLogCounter();
});

exportCsvBtn.addEventListener('click', () => {
  if (state.bookings.length === 0) {
    showToast('Notice', 'No bookings to export.');
    return;
  }

  let csv = 'id,sessionId,session_title,alias,status,created_at\n';
  state.bookings.forEach(b => {
    csv += `"${b.id}","${b.sessionId}","${b.session_title || ''}","${b.alias}","${b.status}","${b.created_at}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `studyswap_bookings_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported', 'Bookings exported to CSV.');
});

// ==========================================================================
// 9. Theme Toggle (Minimal)
// ==========================================================================
function initTheme() {
  const saved = localStorage.getItem('studyswap_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.className = 'theme-dark';
    themeToggleBtn.querySelector('.theme-label').textContent = 'Dark';
    localStorage.setItem('studyswap_theme', 'dark');
  } else {
    document.body.className = 'theme-light';
    themeToggleBtn.querySelector('.theme-label').textContent = 'Light';
    localStorage.setItem('studyswap_theme', 'light');
  }
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ==========================================================================
// 10. Specifications Modal
// ==========================================================================
specsModalBtn.addEventListener('click', () => {
  specsModal.classList.remove('hidden');
});

specsModalCloseBtn.addEventListener('click', () => {
  specsModal.classList.add('hidden');
});

specsModal.addEventListener('click', (e) => {
  if (e.target === specsModal) specsModal.classList.add('hidden');
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSessionDetailModal();
    specsModal.classList.add('hidden');
  }
});

// ==========================================================================
// 11. Initial Application Boot
// ==========================================================================
(async function init() {
  initTheme();
  generateRandomAlias();
  await checkHealth();
  await Promise.all([loadSessions(), loadBookings()]);
  setInterval(checkHealth, 15000);
})();
