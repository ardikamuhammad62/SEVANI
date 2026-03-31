/* ===================================
   SEVANI — E-JURNAL 7 KEBIASAAN
   JAVASCRIPT
   =================================== */

'use strict';

// ===== CONSTANTS =====
const DB_USERS     = 'ejournal_users';
const DB_SESSION   = 'ejournal_session';
const DB_JOURNALS  = 'ejournal_journals';
const DB_HABITS    = 'sevani_habits';

// ===== 7 KEBIASAAN =====
const HABITS = [
  { num: 1, emoji: '🌅', name: 'Bangun Pagi' },
  { num: 2, emoji: '🙏', name: 'Beribadah' },
  { num: 3, emoji: '🍎', name: 'Makan Sehat' },
  { num: 4, emoji: '🏃', name: 'Olahraga' },
  { num: 5, emoji: '📚', name: 'Gemar Belajar' },
  { num: 6, emoji: '🤝', name: 'Bermasyarakat' },
  { num: 7, emoji: '😴', name: 'Tidur Tepat Waktu' },
];

// ===== STATE =====
let currentUser      = null;
let currentView      = 'grid';
let selectedMood     = '😊';
let searchFilter     = 'all';
let currentModalId   = null;
let pendingDeleteId  = null;
let currentHabitIndex = null;
let currentHabitMood  = '😊';

// ===== STORAGE HELPERS =====
const getUsers    = () => JSON.parse(localStorage.getItem(DB_USERS)) || [];
const saveUsers   = (u) => localStorage.setItem(DB_USERS, JSON.stringify(u));
const getSession  = () => localStorage.getItem(DB_SESSION);
const setSession  = (u) => localStorage.setItem(DB_SESSION, u);
const clearSession= () => localStorage.removeItem(DB_SESSION);

function getJournals() {
  const all = JSON.parse(localStorage.getItem(DB_JOURNALS)) || {};
  return all[currentUser?.username] || [];
}
function saveJournals(list) {
  const all = JSON.parse(localStorage.getItem(DB_JOURNALS)) || {};
  all[currentUser.username] = list;
  localStorage.setItem(DB_JOURNALS, JSON.stringify(all));
}

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
  return { done: false, agama: '', mapel: '', mood: '😊', rating: 7 };
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

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const session = getSession();
  if (session) {
    const users = getUsers();
    const user = users.find(u => u.username === session);
    if (user) { currentUser = user; launchApp(); return; }
  }
  document.getElementById('authScreen').classList.remove('hidden');
  // set today's date
  document.getElementById('jDate').value = todayStr();
});

// Update habit cards whenever the date changes
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('jDate').addEventListener('change', () => {
    renderHabitCards();
  });
});

// ===== AUTH =====
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register')));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  clearError('loginError'); clearError('registerError');
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) { showError('loginError', 'Username atau password salah.'); return; }
  currentUser = user;
  setSession(user.username);
  launchApp();
}

function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('regName').value.trim();
  const kelas    = document.getElementById('regClass').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;

  if (password.length < 6) { showError('registerError', 'Password minimal 6 karakter.'); return; }

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    showError('registerError', 'Username sudah digunakan. Pilih yang lain.');
    return;
  }
  const newUser = { name, kelas, username, password };
  users.push(newUser);
  saveUsers(users);
  currentUser = newUser;
  setSession(username);
  launchApp();
}

function handleLogout() {
  clearSession();
  currentUser = null;
  location.reload();
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('sevani_theme') || 'light';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sevani_theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.classList.remove('hidden');
}
function clearError(id) {
  const el = document.getElementById(id);
  el.textContent = ''; el.classList.add('hidden');
}

// ===== LAUNCH APP =====
function launchApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  updateUserUI();
  document.getElementById('jDate').value = todayStr();
  showPage('dashboard');
}

function updateUserUI() {
  const initials = getInitials(currentUser.name);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarClass').textContent = currentUser.kelas;
  document.getElementById('topbarAvatar').textContent = initials;
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ===== NAVIGATION =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + page);
    p.classList.toggle('hidden', p.id !== 'page-' + page);
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const map = { dashboard: 0, write: 1, rekap: 2, search: 3, profile: 4 };
  const idx = map[page];
  if (idx !== undefined) {
    document.querySelectorAll('.nav-item')[idx]?.classList.add('active');
  }

  const titles = { dashboard: 'Dashboard', write: 'Tulis Jurnal', journals: 'Jurnal Saya', rekap: 'Rekap Jurnal', search: 'Cari Jurnal', profile: 'Profil' };
  document.getElementById('topbarTitle').textContent = titles[page] || '';

  closeSidebarMobile();

  if (page === 'dashboard')  renderDashboard();
  if (page === 'journals')   renderJournals();
  if (page === 'profile')    renderProfile();
  if (page === 'rekap')      initRekapPage();
  if (page === 'write') {
    renderHabitCards();
    renderJournals();
  }
}

// ===== SIDEBAR MOBILE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebarMobile() {
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

// ===== TOGGLE PASSWORD =====
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}

// ===== DATE HELPERS =====
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function formatDate(str) {
  if (!str) return '-';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateShort(str) {
  if (!str) return '-';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function getWeekStart() {
  const d = new Date(); d.setHours(0,0,0,0);
  const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); return d;
}

// ===== DASHBOARD =====
function renderDashboard() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  document.getElementById('greetingText').textContent = `${greet}, ${currentUser.name.split(' ')[0]}! 👋`;
  document.getElementById('greetingDate').textContent = formatDate(todayStr());

  const journals = getJournals();

  // Stats
  document.getElementById('statTotal').textContent = journals.length;

  const weekStart = getWeekStart();
  const weekJournals = journals.filter(j => new Date(j.date + 'T00:00:00') >= weekStart);
  document.getElementById('statWeek').textContent = weekJournals.length;

  // Streak
  document.getElementById('statStreak').textContent = calcStreak(journals);

  // Subjects
  const subjects = [...new Set(journals.map(j => j.subject))];
  document.getElementById('statSubjects').textContent = subjects.length;

  // Recent
  const recent = [...journals].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const recentEl = document.getElementById('recentJournals');
  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="recent-empty">Belum ada jurnal. Mulai menulis!</div>';
  } else {
    recentEl.innerHTML = recent.map(j => `
      <div class="recent-item" onclick="openModal('${j.id}')">
        <div class="recent-dot"></div>
        <div class="recent-title">${escHtml(j.title)}</div>
        <div class="recent-date">${formatDateShort(j.date)}</div>
      </div>
    `).join('');
  }

  // Mood bars
  const moods = ['😄','😊','😐','😕','😞'];
  const moodCounts = {};
  moods.forEach(m => moodCounts[m] = 0);
  weekJournals.forEach(j => { if (moodCounts[j.mood] !== undefined) moodCounts[j.mood]++; });
  const maxMood = Math.max(...Object.values(moodCounts), 1);
  document.getElementById('moodBars').innerHTML = moods.map(m => `
    <div class="mood-bar-row">
      <span class="mood-emoji">${m}</span>
      <div class="mood-bar-bg"><div class="mood-bar-fill" style="width:${(moodCounts[m]/maxMood)*100}%"></div></div>
      <span class="mood-count">${moodCounts[m]}</span>
    </div>
  `).join('');

  // Subject distribution
  const subjectCount = {};
  journals.forEach(j => { subjectCount[j.subject] = (subjectCount[j.subject] || 0) + 1; });
  const sortedSubs = Object.entries(subjectCount).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const maxSub = sortedSubs.length ? sortedSubs[0][1] : 1;
  document.getElementById('subjectBars').innerHTML = sortedSubs.length
    ? sortedSubs.map(([sub, cnt]) => `
      <div class="sub-bar-row">
        <span class="sub-name">${escHtml(sub)}</span>
        <div class="sub-bar-bg"><div class="sub-bar-fill" style="width:${(cnt/maxSub)*100}%"></div></div>
        <span class="sub-count">${cnt}</span>
      </div>
    `).join('')
    : '<p class="text-muted" style="text-align:center;padding:20px">Belum ada data</p>';
}

function calcStreak(journals) {
  if (!journals.length) return 0;
  const dates = [...new Set(journals.map(j => j.date))].sort((a,b) => b.localeCompare(a));
  let streak = 0;
  let check = new Date(todayStr() + 'T00:00:00');
  for (let d of dates) {
    const jDate = new Date(d + 'T00:00:00');
    const diff = (check - jDate) / (1000*60*60*24);
    if (diff === 0 || diff === 1) { streak++; check = jDate; }
    else break;
  }
  return streak;
}

// ===== HABIT MOOD SELECTOR =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.habit-mood-btn');
  if (!btn) return;
  document.querySelectorAll('.habit-mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  currentHabitMood = btn.dataset.mood;
});

// Default habit mood on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const def = document.querySelector('.habit-mood-btn[data-mood="😊"]');
  if (def) def.classList.add('selected');
});

// ===== HABIT CARDS =====
function renderHabitCards() {
  const container = document.getElementById('habitCards');
  const progressEl = document.getElementById('habitsProgress');
  if (!container) return;

  const date  = document.getElementById('jDate').value || todayStr();
  const state = getHabitState(date);
  const doneCount = state.filter(e => e.done).length;

  if (progressEl) progressEl.textContent = `${doneCount} / 7 Selesai`;

  container.innerHTML = HABITS.map((h, i) => {
    const entry = state[i];
    const done  = entry.done;
    const detailHtml = done ? `
      <div class="habit-card-detail">
        ${entry.waktu ? `<div class="hcd-waktu"><i class="fas fa-clock"></i> ${entry.waktu}</div>` : ''}
        ${entry.keterangan ? `<div class="hcd-ket">${escHtml(entry.keterangan.slice(0, 50))}${entry.keterangan.length > 50 ? '\u2026' : ''}</div>` : ''}
      </div>` : '';
    return `
      <div class="habit-card${done ? ' done' : ''}" onclick="openHabitModal(${i})" title="${done ? 'Klik untuk edit' : 'Klik untuk isi'}">
        <div class="habit-card-check">
          <i class="${done ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
        </div>
        <span class="habit-card-emoji">${h.emoji}</span>
        <div class="habit-card-num">Kebiasaan ${h.num}</div>
        <div class="habit-card-name">${h.name}</div>
        ${detailHtml}
        <span class="habit-card-status ${done ? 'status-done' : 'status-pending'}">
          <i class="fas fa-${done ? 'pen' : 'clock'}"></i>
          ${done ? 'Selesai' : 'Belum Diisi'}
        </span>
      </div>
    `;
  }).join('');
}

function openHabitModal(index) {
  const date  = document.getElementById('jDate').value || todayStr();
  const entry = getHabitState(date)[index];
  const h     = HABITS[index];
  currentHabitIndex = index;

  document.getElementById('habitModalEmoji').textContent = h.emoji;
  document.getElementById('habitModalNum').textContent   = `Kebiasaan ${h.num}`;
  document.getElementById('habitModalName').textContent  = h.name;

  // Always reset form fields (fresh entry each time)
  document.getElementById('habitWaktu').value       = '';
  document.getElementById('habitKeterangan').value  = '';
  document.getElementById('habitModalError').classList.add('hidden');

  // Default mood & rating
  currentHabitMood = '😊';
  document.querySelectorAll('.habit-mood-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.mood === '😊'));
  document.getElementById('habitRating').value           = 7;
  document.getElementById('habitRatingBadge').textContent = 7;

  // Show/hide special sections
  const isBeribadah = index === 1;
  const isBelajar   = index === 4;
  document.getElementById('habitBeribadahSection').classList.toggle('hidden', !isBeribadah);
  document.getElementById('habitBelajarSection').classList.toggle('hidden', !isBelajar);

  if (isBeribadah) {
    const agama = entry.agama || '';
    document.getElementById('habitAgama').value = agama;
    document.querySelectorAll('input[name="sholat"]').forEach(cb => cb.checked = false);
    onAgamaChange(agama);
  } else {
    document.getElementById('habitWaktuGroup').classList.remove('hidden');
  }

  if (isBelajar) {
    document.getElementById('habitMapel').value        = entry.mapel || '';
    document.getElementById('habitTopikBelajar').value = '';
  }

  // Show/hide clear button
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

function onAgamaChange(agama) {
  document.getElementById('sholatSection').classList.toggle('hidden', agama !== 'Islam');
  document.getElementById('habitWaktuGroup').classList.toggle('hidden', agama === 'Islam');
}

function saveHabitDetail() {
  const errEl       = document.getElementById('habitModalError');
  const idx         = currentHabitIndex;
  const isBeribadah = idx === 1;
  const isBelajar   = idx === 4;
  const keterangan  = document.getElementById('habitKeterangan').value.trim();

  let agama = '', sholat = [], mapel = '', topik = '';

  if (isBeribadah) {
    agama = document.getElementById('habitAgama').value;
    if (!agama) {
      errEl.textContent = 'Pilih agama terlebih dahulu.';
      errEl.classList.remove('hidden');
      return;
    }
    if (agama === 'Islam') {
      sholat = [...document.querySelectorAll('input[name="sholat"]:checked')].map(cb => cb.value);
      if (!sholat.length) {
        errEl.textContent = 'Centang minimal satu waktu sholat.';
        errEl.classList.remove('hidden');
        return;
      }
    } else if (!keterangan) {
      errEl.textContent = 'Keterangan tidak boleh kosong.';
      errEl.classList.remove('hidden');
      document.getElementById('habitKeterangan').focus();
      return;
    }
  } else if (isBelajar) {
    mapel = document.getElementById('habitMapel').value;
    topik = document.getElementById('habitTopikBelajar').value.trim();
    if (!mapel) {
      errEl.textContent = 'Pilih mata pelajaran terlebih dahulu.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!topik) {
      errEl.textContent = 'Isi kolom "Yang Dipelajari" terlebih dahulu.';
      errEl.classList.remove('hidden');
      document.getElementById('habitTopikBelajar').focus();
      return;
    }
    if (!keterangan) {
      errEl.textContent = 'Keterangan tidak boleh kosong.';
      errEl.classList.remove('hidden');
      document.getElementById('habitKeterangan').focus();
      return;
    }
  } else {
    if (!keterangan) {
      errEl.textContent = 'Keterangan tidak boleh kosong.';
      errEl.classList.remove('hidden');
      document.getElementById('habitKeterangan').focus();
      return;
    }
  }
  errEl.classList.add('hidden');

  const date   = document.getElementById('jDate').value || todayStr();
  const waktu  = document.getElementById('habitWaktu').value;
  const mood   = currentHabitMood;
  const rating = parseInt(document.getElementById('habitRating').value);
  const state  = getHabitState(date);

  // Mark habit as done (indicator only); store agama/mapel for convenience on re-open
  state[idx] = { done: true, agama, mapel, mood, rating };
  setHabitState(date, state);

  // Create journal entry in DB_JOURNALS so it appears in Daftar Jurnal & Rekap
  createJournalFromHabit(idx, date, { agama, sholat, mapel, topik, keterangan, waktu, mood, rating });

  closeHabitModal();
  renderHabitCards();
  renderHabitHistory();
  renderJournals();
  showToast(`"${HABITS[idx].name}" berhasil dicatat! \u2705`, 'success');
}

function createJournalFromHabit(idx, date, data) {
  const h = HABITS[idx];
  const parts = [];
  let subject = h.name;

  if (idx === 1) { // Beribadah
    parts.push('<b>Agama:</b> ' + escHtml(data.agama));
    if (data.agama === 'Islam') {
      parts.push('<b>Sholat:</b> ' + (data.sholat.length ? data.sholat.join(', ') : '\u2014'));
    } else if (data.waktu) {
      parts.push('<b>Waktu Ibadah:</b> ' + data.waktu);
    }
    if (data.keterangan) parts.push('<b>Keterangan:</b> ' + escHtml(data.keterangan));
  } else if (idx === 4) { // Gemar Belajar
    subject = data.mapel || h.name;
    parts.push('<b>Mata Pelajaran:</b> ' + escHtml(data.mapel));
    parts.push('<b>Yang Dipelajari:</b> ' + escHtml(data.topik));
    if (data.waktu) parts.push('<b>Waktu:</b> ' + data.waktu);
    if (data.keterangan) parts.push('<b>Keterangan:</b> ' + escHtml(data.keterangan));
  } else {
    if (data.waktu) parts.push('<b>Waktu:</b> ' + data.waktu);
    parts.push('<b>Keterangan:</b> ' + escHtml(data.keterangan));
  }

  const entry = {
    id:       Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title:    h.emoji + ' ' + h.name,
    date,
    subject,
    category: h.name,
    mood:     data.mood,
    rating:   data.rating,
    content:  parts.join('<br>'),
    keypoints: '',
    questions: '',
  };

  const journals = getJournals();
  journals.unshift(entry);
  saveJournals(journals);
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

// ===== HABIT HISTORY =====
function renderHabitHistory() {
  const container = document.getElementById('habitHistoryList');
  const emptyEl   = document.getElementById('noHabitHistory');
  if (!container) return;

  const data  = getHabitData();
  const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));

  if (!dates.length) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  container.innerHTML = dates.map(date => {
    const state     = getHabitState(date);
    const doneCount = state.filter(e => e.done).length;
    const allDone   = doneCount === 7;
    const domMood   = getDominantMood(state.filter(e => e.done));
    const ratings   = state.filter(e => e.done && e.rating).map(e => e.rating);
    const avgRating = ratings.length
      ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1)
      : null;
    return `
      <div class="habit-history-card" onclick="openHabitDayView('${date}')">
        <div class="hh-date-str">${formatDateShort(date)}</div>
        <div class="hh-subline">
          <span class="hh-progress-str ${allDone ? 'hh-full' : 'hh-partial'}">
            <i class="fas fa-${allDone ? 'check-circle' : 'circle-half-stroke'}"></i>
            ${doneCount}/7 Selesai
          </span>
          <span class="hh-day-meta">${domMood || ''}${avgRating ? ` ⭐ ${avgRating}` : ''}</span>
        </div>
        <div class="hh-emojis">
          ${HABITS.map((h, i) =>
            `<span class="hh-emoji-item${state[i].done ? ' done' : ''}" title="${h.name}">${h.emoji}</span>`
          ).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function openHabitDayView(date) {
  document.getElementById('jDate').value = date;
  renderHabitCards();
  document.querySelector('.habit-cards-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== RICH EDITOR =====
function formatText(cmd) { document.execCommand(cmd, false, null); }

// ===== SAVE JOURNAL (KEPT FOR EXISTING DATA COMPAT) =====
function saveJournal(e) { e.preventDefault(); }

function clearForm() {
  document.getElementById('jDate').value = todayStr();
  renderHabitCards();
  renderHabitHistory();
}

// ===== RENDER JOURNALS =====
function renderJournals() {
  let journals = getJournals();
  const sortOrd = document.getElementById('sortOrder').value;

  journals = journals.slice().sort((a,b) =>
    sortOrd === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  const container = document.getElementById('journalsList');
  const emptyEl   = document.getElementById('noJournals');

  if (!journals.length) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  container.className = `journals-grid${currentView === 'list' ? ' list-view' : ''}`;
  container.innerHTML = journals.map(j => buildJournalCard(j)).join('');
}

function buildJournalCard(j) {
  const preview = j.content.replace(/<[^>]*>/g, '').slice(0, 120) + (j.content.length > 120 ? '...' : '');
  return `
    <div class="journal-card" onclick="openModal('${j.id}')">
      <div class="jcard-head">
        <div class="jcard-title">${escHtml(j.title)}</div>
        <span class="jcard-mood">${j.mood || '😊'}</span>
      </div>
      <div class="jcard-meta">
        <span class="badge badge-subject"><i class="fas fa-book"></i> ${escHtml(j.subject)}</span>
        <span class="badge badge-category">${escHtml(j.category)}</span>
        <span class="badge badge-rating">⭐ ${j.rating}/10</span>
      </div>
      <div class="jcard-preview">${escHtml(preview)}</div>
      <div class="jcard-footer">
        <span class="jcard-date"><i class="fas fa-calendar-alt"></i> ${formatDateShort(j.date)}</span>
        <div class="jcard-actions" onclick="event.stopPropagation()">
          <button class="jcard-btn edit" onclick="editJournal('${j.id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="jcard-btn del"  onclick="confirmDelete('${j.id}')" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `;
}

function setView(v) {
  currentView = v;
  document.getElementById('gridViewBtn').classList.toggle('active', v === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', v === 'list');
  renderJournals();
}

function populateFilterSubjects() {
  const journals = getJournals();
  const subjects = [...new Set(journals.map(j => j.subject))].sort();
  const sel = document.getElementById('filterSubject');
  const cur = sel?.value;
  if (sel) {
    sel.innerHTML = '<option value="">Semua Mapel</option>' +
      subjects.map(s => `<option value="${escHtml(s)}" ${s === cur ? 'selected' : ''}>${escHtml(s)}</option>`).join('');
  }
}

// ===== MODAL =====
function openModal(id) {
  const journals = getJournals();
  const j = journals.find(x => x.id === id);
  if (!j) return;
  currentModalId = id;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-mood-row">
      <span class="modal-mood">${j.mood || '😊'}</span>
      <div>
        <div class="modal-title">${escHtml(j.title)}</div>
        <div class="modal-date"><i class="fas fa-calendar"></i> ${formatDate(j.date)}</div>
      </div>
    </div>
    <div class="modal-meta">
      <span class="badge badge-subject"><i class="fas fa-book"></i> ${escHtml(j.subject)}</span>
      <span class="badge badge-category">${escHtml(j.category)}</span>
      <span class="badge badge-rating">⭐ ${j.rating}/10</span>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Catatan</div>
      <div class="modal-body">${j.content}</div>
    </div>
    ${j.keypoints ? `
    <div class="modal-section">
      <div class="modal-section-title"><i class="fas fa-lightbulb"></i> Poin Penting</div>
      <div class="modal-keypoints">${escHtml(j.keypoints)}</div>
    </div>` : ''}
    ${j.questions ? `
    <div class="modal-section">
      <div class="modal-section-title"><i class="fas fa-question-circle"></i> Pertanyaan</div>
      <div class="modal-questions">${escHtml(j.questions)}</div>
    </div>` : ''}
  `;

  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target === e.currentTarget) closeModalBtn();
}
function closeModalBtn() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  currentModalId = null;
}

// ===== EDIT JOURNAL =====
function editJournal(id) {
  openModal(id);
}

// ===== DELETE JOURNAL =====
function confirmDelete(id) {
  closeModalBtn();
  pendingDeleteId = id;
  document.getElementById('confirmOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('confirmYes').onclick = () => deleteJournal(id);
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  pendingDeleteId = null;
}
function deleteJournal(id) {
  closeConfirm();
  closeModalBtn();
  let journals = getJournals();
  journals = journals.filter(j => j.id !== id);
  saveJournals(journals);
  showToast('Jurnal dihapus.', 'error');
  renderJournals();
}

// ===== REKAP =====
const MOOD_LABELS = { '😄': 'Sangat Baik', '😊': 'Baik', '😐': 'Biasa', '😕': 'Kurang', '😞': 'Buruk' };

function initRekapPage() {
  const startEl = document.getElementById('rekapStart');
  const endEl   = document.getElementById('rekapEnd');
  // Default: current month
  if (!startEl.value && !endEl.value) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startEl.value = firstDay.toISOString().split('T')[0];
    endEl.value   = todayStr();
    renderRekap();
  }
}

function renderRekap() {
  const start = document.getElementById('rekapStart').value;
  const end   = document.getElementById('rekapEnd').value;

  const statsEl    = document.getElementById('rekapStats');
  const timelineEl = document.getElementById('rekapTimeline');
  const emptyEl    = document.getElementById('rekapEmpty');
  const placeholderEl = document.getElementById('rekapPlaceholder');

  if (!start || !end) {
    showToast('Pilih tanggal awal dan akhir terlebih dahulu!', 'error');
    return;
  }
  if (start > end) {
    showToast('Tanggal awal tidak boleh lebih dari tanggal akhir!', 'error');
    return;
  }

  placeholderEl.classList.add('hidden');

  const journals = getJournals().filter(j => j.date >= start && j.date <= end);

  if (!journals.length) {
    statsEl.style.display = 'none';
    timelineEl.innerHTML  = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  // Stats
  const avgRating = (journals.reduce((s, j) => s + (j.rating || 0), 0) / journals.length).toFixed(1);
  const subjects  = [...new Set(journals.map(j => j.subject))];
  const domMood   = getDominantMood(journals);
  const totalDays = [...new Set(journals.map(j => j.date))].length;

  statsEl.style.display = 'grid';
  statsEl.innerHTML = `
    <div class="stat-card purple">
      <div class="stat-icon"><i class="fas fa-book"></i></div>
      <div class="stat-info">
        <div class="stat-num">${journals.length}</div>
        <div class="stat-label">Total Jurnal</div>
      </div>
    </div>
    <div class="stat-card blue">
      <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
      <div class="stat-info">
        <div class="stat-num">${totalDays}</div>
        <div class="stat-label">Hari Aktif</div>
      </div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
      <div class="stat-info">
        <div class="stat-num">${subjects.length}</div>
        <div class="stat-label">Mata Pelajaran</div>
      </div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon" style="font-size:26px">${domMood}</div>
      <div class="stat-info">
        <div class="stat-num" style="font-size:16px;line-height:1.3">${MOOD_LABELS[domMood] || 'Baik'}</div>
        <div class="stat-label">Mood Dominan</div>
      </div>
    </div>
  `;

  // Group by date
  const grouped = {};
  journals.forEach(j => {
    if (!grouped[j.date]) grouped[j.date] = [];
    grouped[j.date].push(j);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  timelineEl.innerHTML = sortedDates.map(date => `
    <div class="rekap-group">
      <div class="rekap-date-header">
        <div class="rekap-date-badge">
          <i class="fas fa-calendar-day"></i>
          ${formatDate(date)}
        </div>
        <span class="rekap-date-count">${grouped[date].length} jurnal</span>
      </div>
      <div class="journals-grid">
        ${grouped[date].map(j => buildJournalCard(j)).join('')}
      </div>
    </div>
  `).join('');
}

function getDominantMood(journals) {
  const cnt = {};
  journals.forEach(j => { const m = j.mood || '😊'; cnt[m] = (cnt[m] || 0) + 1; });
  return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || '😊';
}

function rekapToday() {
  const today = todayStr();
  document.getElementById('rekapStart').value = today;
  document.getElementById('rekapEnd').value   = today;
  renderRekap();
}

function rekapThisWeek() {
  const ws = getWeekStart();
  document.getElementById('rekapStart').value = ws.toISOString().split('T')[0];
  document.getElementById('rekapEnd').value   = todayStr();
  renderRekap();
}

function rekapThisMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  document.getElementById('rekapStart').value = first.toISOString().split('T')[0];
  document.getElementById('rekapEnd').value   = todayStr();
  renderRekap();
}

// ===== SEARCH =====
function handleSearch() {
  const q = document.getElementById('searchInput').value.trim();
  document.getElementById('searchClear').style.display = q ? 'block' : 'none';

  if (!q) {
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchEmpty').classList.add('hidden');
    document.getElementById('searchPlaceholder').classList.remove('hidden');
    return;
  }

  document.getElementById('searchPlaceholder').classList.add('hidden');
  const ql = q.toLowerCase();
  const journals = getJournals();

  const results = journals.filter(j => {
    if (searchFilter === 'title')   return j.title.toLowerCase().includes(ql);
    if (searchFilter === 'subject') return j.subject.toLowerCase().includes(ql);
    if (searchFilter === 'content') return j.content.replace(/<[^>]*>/g,'').toLowerCase().includes(ql);
    // all
    return j.title.toLowerCase().includes(ql) ||
           j.subject.toLowerCase().includes(ql) ||
           j.content.replace(/<[^>]*>/g,'').toLowerCase().includes(ql) ||
           (j.keypoints || '').toLowerCase().includes(ql);
  });

  const container = document.getElementById('searchResults');
  if (!results.length) {
    container.innerHTML = '';
    document.getElementById('searchEmpty').classList.remove('hidden');
    return;
  }
  document.getElementById('searchEmpty').classList.add('hidden');
  container.innerHTML = results.map(j => buildJournalCard(j)).join('');
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  handleSearch();
}
function setSearchFilter(f, el) {
  searchFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  handleSearch();
}

// ===== PROFILE =====
function renderProfile() {
  const initials = getInitials(currentUser.name);
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileClass').textContent = currentUser.kelas;
  document.getElementById('editName').value = currentUser.name;
  document.getElementById('editClass').value = currentUser.kelas;
  document.getElementById('editUsername').value = currentUser.username;
  document.getElementById('editPassword').value = '';

  const journals = getJournals();
  const subjects = [...new Set(journals.map(j => j.subject))];
  document.getElementById('pTotal').textContent = journals.length;
  document.getElementById('pStreak').textContent = calcStreak(journals);
  document.getElementById('pSubjects').textContent = subjects.length;
}

function saveProfile(e) {
  e.preventDefault();
  const name     = document.getElementById('editName').value.trim();
  const kelas    = document.getElementById('editClass').value.trim();
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value;

  const users = getUsers();
  const idx = users.findIndex(u => u.username === currentUser.username);
  if (idx < 0) return;

  // username conflict check
  if (username !== currentUser.username && users.find(u => u.username === username)) {
    showToast('Username sudah digunakan!', 'error'); return;
  }

  // If username changed, migrate journal data
  if (username !== currentUser.username) {
    const all = JSON.parse(localStorage.getItem(DB_JOURNALS)) || {};
    all[username] = all[currentUser.username] || [];
    delete all[currentUser.username];
    localStorage.setItem(DB_JOURNALS, JSON.stringify(all));
    setSession(username);
  }

  users[idx].name = name;
  users[idx].kelas = kelas;
  users[idx].username = username;
  if (password) users[idx].password = password;
  saveUsers(users);
  currentUser = users[idx];
  updateUserUI();
  renderProfile();
  showToast('Profil berhasil disimpan! ✅', 'success');
}

// ===== EXPORT =====
function exportJSON() {
  const journals = getJournals();
  const blob = new Blob([JSON.stringify({ user: currentUser.name, exportedAt: new Date().toISOString(), journals }, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `jurnal_${currentUser.username}_${todayStr()}.json`);
  showToast('Data diekspor sebagai JSON ✅', 'success');
}

function exportCSV() {
  const journals = getJournals();
  const headers = ['Judul','Tanggal','Mata Pelajaran','Kategori','Mood','Rating','Poin Penting','Pertanyaan'];
  const rows = journals.map(j => [
    `"${j.title.replace(/"/g,'""')}"`,
    j.date,
    `"${j.subject}"`,
    `"${j.category}"`,
    j.mood,
    j.rating,
    `"${(j.keypoints||'').replace(/"/g,'""')}"`,
    `"${(j.questions||'').replace(/"/g,'""')}"`
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `jurnal_${currentUser.username}_${todayStr()}.csv`);
  showToast('Data diekspor sebagai CSV ✅', 'success');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function deleteAllData() {
  if (!confirm(`Yakin hapus semua ${getJournals().length} jurnal kamu? Tindakan ini tidak bisa dibatalkan!`)) return;
  saveJournals([]);
  showToast('Semua jurnal dihapus.', 'error');
  renderProfile();
}

// ===== PRINT =====
function printJournal(id) {
  const journals = getJournals();
  const j = journals.find(x => x.id === id);
  if (!j) return;

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${escHtml(j.title)}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; color: #2d3436; line-height: 1.7; }
      h1 { font-size: 26px; margin-bottom: 6px; }
      .meta { color: #636e72; font-size: 13px; margin-bottom: 24px; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 11px; font-weight: 700; color: #636e72; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 6px; }
      .box { background: #f0f2f8; padding: 14px; border-radius: 8px; white-space: pre-wrap; font-size: 13px; }
      .footer { margin-top: 40px; font-size: 12px; color: #b2bec3; border-top: 1px solid #dfe6e9; padding-top: 12px; }
    </style>
  </head><body>
    <h1>${escHtml(j.title)}</h1>
    <p class="meta">${j.mood} &nbsp;|&nbsp; ${formatDate(j.date)} &nbsp;|&nbsp; ${escHtml(j.subject)} &nbsp;|&nbsp; ${escHtml(j.category)} &nbsp;|&nbsp; Rating: ${j.rating}/10</p>
    <div class="section">
      <div class="section-title">Catatan</div>
      <div>${j.content}</div>
    </div>
    ${j.keypoints ? `<div class="section"><div class="section-title">Poin Penting</div><div class="box">${escHtml(j.keypoints)}</div></div>` : ''}
    ${j.questions ? `<div class="section"><div class="section-title">Pertanyaan</div><div class="box">${escHtml(j.questions)}</div></div>` : ''}
    <div class="footer">Dicetak dari SEVANI E-Jurnal 7 Kebiasaan — ${currentUser.name} (${currentUser.kelas})</div>
  </body></html>`);
  w.document.close();
  w.print();
}

// ===== TOAST =====
function showToast(msg, type = 'default') {
  const toast = document.getElementById('toast');
  toast.className = `toast${type !== 'default' ? ' ' + type : ''}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i> ${msg}`;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

// ===== HTML ESCAPE =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== CLOSE SIDEBAR ON OUTSIDE CLICK (MOBILE) =====
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.querySelector('.menu-toggle');
  if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});
