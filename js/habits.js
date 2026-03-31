/* ===================================
   SEVANI — HABIT CARDS & HABIT MODAL
   Habit storage, rendering, modal open/save/clear
   =================================== */

// ===== HABIT STORAGE =====
function getHabitData() {
  const all = JSON.parse(localStorage.getItem(DB_HABITS)) || {};
  return all[currentUser?.username] || {};
}
function saveHabitData(data) {
  const all = JSON.parse(localStorage.getItem(DB_HABITS)) || {};
  all[currentUser.username] = data;
  localStorage.setItem(DB_HABITS, JSON.stringify(all));
}
function emptyHabitEntry() {
  return { done: false, waktu: '', keterangan: '', mood: '😊', rating: 7 };
}
function getHabitState(date) {
  const raw = getHabitData()[date];
  if (!raw) return Array(7).fill(null).map(emptyHabitEntry);
  return raw.map(e => (typeof e === 'boolean' || e === null)
    ? { ...emptyHabitEntry(), done: !!e }
    : { ...emptyHabitEntry(), ...e });
}
function setHabitState(date, state) {
  const data = getHabitData();
  data[date] = state;
  saveHabitData(data);
}

// ===== STATE =====
let currentHabitIndex = null;
let currentHabitMood  = '😊';

// Listen for date changes on the write page
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jDate').addEventListener('change', () => renderHabitCards());
  // Default mood selection
  const def = document.querySelector('.habit-mood-btn[data-mood="😊"]');
  if (def) def.classList.add('selected');
});

// Mood button clicks (event delegation)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.habit-mood-btn');
  if (!btn) return;
  document.querySelectorAll('.habit-mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  currentHabitMood = btn.dataset.mood;
});

// ===== RENDER CARDS =====
function renderHabitCards() {
  const container  = document.getElementById('habitCards');
  const progressEl = document.getElementById('habitsProgress');
  if (!container) return;

  const date      = document.getElementById('jDate').value || todayStr();
  const state     = getHabitState(date);
  const doneCount = state.filter(e => e.done).length;
  if (progressEl) progressEl.textContent = `${doneCount} / 7 Selesai`;

  container.innerHTML = HABITS.map((h, i) => {
    const entry = state[i];
    const done  = entry.done;
    const detailHtml = done ? `
      <div class="habit-card-detail">
        ${entry.waktu ? `<div class="hcd-waktu"><i class="fas fa-clock"></i> ${entry.waktu}</div>` : ''}
        <div class="hcd-meta-row">
          <span class="hcd-mood">${entry.mood || '😊'}</span>
          <span class="hcd-rating">⭐ ${entry.rating || 7}</span>
        </div>
        ${entry.keterangan ? `<div class="hcd-ket">${escHtml(entry.keterangan.slice(0, 50))}${entry.keterangan.length > 50 ? '…' : ''}</div>` : ''}
      </div>` : '';
    return `
      <div class="habit-card${done ? ' done' : ''}" onclick="openHabitModal(${i})" title="${done ? 'Klik untuk edit' : 'Klik untuk isi'}">
        <div class="habit-card-check"><i class="${done ? 'fas fa-check-circle' : 'far fa-circle'}"></i></div>
        <span class="habit-card-emoji">${h.emoji}</span>
        <div class="habit-card-num">Kebiasaan ${h.num}</div>
        <div class="habit-card-name">${h.name}</div>
        ${detailHtml}
        <span class="habit-card-status ${done ? 'status-done' : 'status-pending'}">
          <i class="fas fa-${done ? 'pen' : 'clock'}"></i>
          ${done ? 'Selesai' : 'Belum Diisi'}
        </span>
      </div>`;
  }).join('');
}

// ===== MODAL OPEN =====
function openHabitModal(index) {
  const date  = document.getElementById('jDate').value || todayStr();
  const entry = getHabitState(date)[index];
  const h     = HABITS[index];
  currentHabitIndex = index;

  document.getElementById('habitModalEmoji').textContent = h.emoji;
  document.getElementById('habitModalNum').textContent   = `Kebiasaan ${h.num}`;
  document.getElementById('habitModalName').textContent  = h.name;
  document.getElementById('habitWaktu').value            = entry.waktu || '';
  document.getElementById('habitKeterangan').value       = entry.keterangan || '';
  document.getElementById('habitModalError').classList.add('hidden');

  // Restore mood
  currentHabitMood = entry.mood || '😊';
  document.querySelectorAll('.habit-mood-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.mood === currentHabitMood));

  // Restore rating
  const ratingVal = entry.rating || 7;
  document.getElementById('habitRating').value       = ratingVal;
  document.getElementById('habitRatingBadge').textContent = ratingVal;

  document.getElementById('habitClearBtn').style.display = entry.done ? 'inline-flex' : 'none';
  document.getElementById('habitModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('habitKeterangan').focus(), 80);
}

function closeHabitModal() {
  document.getElementById('habitModal').classList.add('hidden');
  document.body.style.overflow = '';
  currentHabitIndex = null;
}
function habitModalOutside(e) {
  if (e.target === e.currentTarget) closeHabitModal();
}

// ===== SAVE / CLEAR =====
function saveHabitDetail() {
  const keterangan = document.getElementById('habitKeterangan').value.trim();
  const errEl = document.getElementById('habitModalError');
  if (!keterangan) {
    errEl.textContent = 'Keterangan tidak boleh kosong.';
    errEl.classList.remove('hidden');
    document.getElementById('habitKeterangan').focus();
    return;
  }
  errEl.classList.add('hidden');

  const idx   = currentHabitIndex;
  const date  = document.getElementById('jDate').value || todayStr();
  const state = getHabitState(date);
  state[idx]  = {
    done: true,
    waktu: document.getElementById('habitWaktu').value,
    keterangan,
    mood:   currentHabitMood,
    rating: parseInt(document.getElementById('habitRating').value),
  };
  setHabitState(date, state);
  closeHabitModal();
  renderHabitCards();
  showToast(`"${HABITS[idx].name}" berhasil dicatat! ✅`, 'success');
}

function clearHabitDetail() {
  const idx   = currentHabitIndex;
  const date  = document.getElementById('jDate').value || todayStr();
  const state = getHabitState(date);
  state[idx]  = emptyHabitEntry();
  setHabitState(date, state);
  closeHabitModal();
  renderHabitCards();
}
