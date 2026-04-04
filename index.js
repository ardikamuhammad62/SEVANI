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
const DB_CURRENT_USER = 'sevani_current_user';
const DB_GENDER_MAP = 'sevani_gender_map';

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
const HABIT_NAMES = new Set(HABITS.map(h => h.name));
const CLASS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const CLASS_GRADES = ['7', '8', '9'];
const REGISTER_CLASS_OPTIONS = CLASS_GRADES.flatMap(g => CLASS_LETTERS.map(letter => `${g}${letter}`));
const REGISTER_ABSEN_MAX = 40;

// Debug: Log constants untuk memverifikasi
console.log('CLASS_LETTERS:', CLASS_LETTERS);
console.log('CLASS_GRADES:', CLASS_GRADES);
console.log('REGISTER_CLASS_OPTIONS:', REGISTER_CLASS_OPTIONS);
console.log('REGISTER_ABSEN_MAX:', REGISTER_ABSEN_MAX);

// ===== STATE =====
let currentUser      = null;
let currentView      = 'grid';
let searchFilter     = 'all';
let currentModalId   = null;
let pendingDeleteId  = null;
let currentHabitIndex = null;
let teacherJournals  = [];

// State Lokal pengganti localStorage
let localJournals = []; 
let localHabits = {};

// ===== STORAGE HELPERS =====
const getSession  = () => {
  const session = localStorage.getItem(DB_SESSION);
  if (!session) return null;
  try {
    const parsed = JSON.parse(session);
    if (typeof parsed === 'object' && parsed.username) return parsed;
    // Jika bukan object valid, clear
    clearSession();
    return null;
  } catch {
    // Jika parse gagal (misal string lama), clear
    clearSession();
    return null;
  }
};
const setSession  = (u) => localStorage.setItem(DB_SESSION, JSON.stringify(u));
const clearSession= () => localStorage.removeItem(DB_SESSION);
const clearStoredUser = () => localStorage.removeItem(DB_CURRENT_USER);

function getStoredUser() {
  try {
    const raw = localStorage.getItem(DB_CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function setStoredUser(user) {
  localStorage.setItem(DB_CURRENT_USER, JSON.stringify(user));
}

function getGenderMap() {
  try {
    const raw = localStorage.getItem(DB_GENDER_MAP);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (_e) {
    return {};
  }
}

function rememberUserGender(username, gender) {
  if (!username) return;
  const normalized = normalizeGender(gender);
  if (!normalized) return;
  const map = getGenderMap();
  map[username] = normalized;
  localStorage.setItem(DB_GENDER_MAP, JSON.stringify(map));
}

function getRememberedGender(username) {
  if (!username) return '';
  const map = getGenderMap();
  return normalizeGender(map[username]);
}

function normalizeGender(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['l', 'laki', 'laki-laki', 'pria', 'male'].includes(raw)) return 'laki-laki';
  if (['p', 'perempuan', 'wanita', 'female'].includes(raw)) return 'perempuan';
  return '';
}

function getAvatarAsset(gender) {
  return normalizeGender(gender) === 'perempuan'
    ? 'assets/female.png'
    : 'assets/male.png';
}

function setAvatarByGender(elementId, gender, fallbackText = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  const normalized = normalizeGender(gender);

  if (!normalized) {
    el.classList.remove('gender-avatar');
    el.style.backgroundImage = '';
    el.textContent = fallbackText;
    return;
  }

  el.textContent = '';
  el.classList.add('gender-avatar');
  el.style.backgroundImage = `url('${getAvatarAsset(normalized)}')`;
}

function buildUserSubLabel(user) {
  const genderLabel = user.gender === 'perempuan' ? 'Perempuan' : 'Laki-laki';
  if (user.role === 'guru') {
    return `Guru | ${genderLabel}`;
  }
  const kelasLabel = user.noAbsen
    ? `${user.kelas} | Absen ${user.noAbsen}`
    : user.kelas;
  return `${kelasLabel} | ${genderLabel}`;
}

function isTeacher() {
  return currentUser?.role === 'guru';
}

function getClassSortKey(className) {
  const raw = String(className || '').trim().toUpperCase();
  const m = raw.match(/^(\d+)([A-Z])$/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const grade = Number(m[1]);
  const letterIdx = CLASS_LETTERS.indexOf(m[2]);
  return (grade * 100) + (letterIdx < 0 ? 99 : letterIdx);
}

function normalizeClassName(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeUser(user) {
  if (!user) return null;
  const rawKelas = (user.kelas || '').toString();
  const role = (user.role || (rawKelas.toLowerCase() === 'guru' ? 'guru' : 'murid')).toString().toLowerCase();
  const username = (user.username || '').toString();
  const gender = normalizeGender(user.gender ?? user.jenisKelamin ?? user.jenis_kelamin ?? getRememberedGender(username));
  return {
    ...user,
    id: user.id ?? null,
    role,
    name: user.name || user.nama || '',
    gender,
    kelas: rawKelas,
    username,
    nisn: user.nisn || (role === 'murid' ? username : ''),
    nip: user.nip || (role === 'guru' ? username : ''),
    noAbsen: role === 'guru' ? '' : (user.noAbsen ?? user.no_absen ?? ''),
    agama: role === 'guru' ? '' : (user.agama ?? '')
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();

  let result = null;
  if (raw) {
    try {
      result = JSON.parse(raw);
    } catch (_e) {
      result = null;
    }
  }

  if (!response.ok) {
    if (response.status === 405) {
      throw new Error('Endpoint API menolak request. Jalankan proyek lewat server PHP (XAMPP/Laragon), bukan Live Server 5500.');
    }
    throw new Error(result?.message || `HTTP ${response.status}`);
  }

  if (!result) {
    throw new Error('Respons server bukan JSON valid. Pastikan endpoint PHP berjalan benar.');
  }

  return result;
}

function getJournals() {
  return localJournals;
}

function getHabitData() {
  return localHabits;
}

function emptyHabitEntry() {
  return { done: false, waktu: '', keterangan: '', mapel: '' };
}

function getHabitState(date) {
  const raw = localHabits[date];
  if (!raw) return Array(7).fill(null).map(emptyHabitEntry);
  return raw.map(e => (typeof e === 'boolean' || e === null)
    ? { ...emptyHabitEntry(), done: !!e }
    : { ...emptyHabitEntry(), ...e });
}

// Menyimpan state kebiasaan ke Database
async function setHabitState(date, state) {
  localHabits[date] = state; // Update UI langsung
  console.log('setHabitState called with date:', date, 'state:', state, 'currentUser:', currentUser);
  try {
    const payload = {
      user_id: currentUser.id,
      tanggal: date,
      habit_data: state
    };
    console.log('Sending to save_habit.php:', JSON.stringify(payload));
    
    const response = await fetch('api/save_habit.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('save_habit.php response status:', response.status);
    const result = await response.json();
    console.log('save_habit.php response:', result);
  } catch(e) { 
    console.error('Gagal menyimpan habit:', e); 
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRegisterForm();
  const session = getSession();
  if (session) {
    fetch('api/verify_session.php?username=' + encodeURIComponent(session.username))
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          currentUser = data.user;
          launchApp();
        } else {
          clearSession();
          document.getElementById('authScreen').classList.remove('hidden');
        }
      })
      .catch(() => {
        clearSession();
        document.getElementById('authScreen').classList.remove('hidden');
      });
  } else {
    document.getElementById('authScreen').classList.remove('hidden');
  }
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
function setSelectOptions(selectId, values, placeholder) {
  const select = document.getElementById(selectId);
  console.log(`setSelectOptions('${selectId}'):`, select, 'values:', values.length);
  
  if (!select) {
    console.error(`Select element dengan id '${selectId}' tidak ditemukan!`);
    return;
  }

  select.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);

  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  console.log(`${selectId} sudah diisi dengan ${values.length} opsi`);
}

function initRegisterForm() {
  console.log('initRegisterForm() dipanggil, REGISTER_CLASS_OPTIONS:', REGISTER_CLASS_OPTIONS);
  setSelectOptions('regClass', REGISTER_CLASS_OPTIONS, '-- Pilih Kelas --');

  const noAbsenOptions = Array.from({ length: REGISTER_ABSEN_MAX }, (_, i) => String(i + 1));
  console.log('noAbsenOptions:', noAbsenOptions);
  setSelectOptions('regNumber', noAbsenOptions, '-- Pilih Nomor Absen --');
  
  onRegisterRoleChange();
  console.log('initRegisterForm() selesai');
}

function onRegisterRoleChange() {
  const roleEl = document.getElementById('regRole');
  if (!roleEl) return;

  const isGuru = roleEl.value === 'guru';
  const studentFields = document.getElementById('studentRegisterFields');
  const teacherFields = document.getElementById('teacherRegisterFields');
  studentFields?.classList.toggle('hidden', isGuru);
  teacherFields?.classList.toggle('hidden', !isGuru);

  const setRequired = (id, required) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.required = required;
    if (!required) input.value = '';
  };

  setRequired('regClass', !isGuru);
  setRequired('regNumber', !isGuru);
  setRequired('regNisn', !isGuru);
  setRequired('regReligion', !isGuru);
  setRequired('regNip', isGuru);

  clearError('registerError');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register')));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  if (tab === 'register') onRegisterRoleChange();
  clearError('loginError'); clearError('registerError');
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const result = await requestJson('api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (result.status === 'success') {
      currentUser = result.user;
      setSession(result.user); // Simpan data user lengkap
      launchApp();
    } else {
      showError('loginError', result.message);
    }
  } catch (error) {
    showError('loginError', error.message || 'Terjadi kesalahan pada server.');
    console.error('Error:', error);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const role = document.getElementById('regRole').value;
  const nama = document.getElementById('regName').value.trim();
  const gender = normalizeGender(document.getElementById('regGender').value);

  if (!nama) {
    showError('registerError', 'Nama wajib diisi.');
    return;
  }

  if (!gender) {
    showError('registerError', 'Jenis kelamin wajib dipilih.');
    return;
  }

  const payload = { role, nama, gender };

  if (role === 'guru') {
    const nip = document.getElementById('regNip').value.replace(/\D/g, '');
    if (!/^\d{18}$/.test(nip)) {
      showError('registerError', 'NIP harus terdiri dari 18 digit angka.');
      return;
    }
    payload.nip = nip;
  } else {
    const kelas = document.getElementById('regClass').value;
    const noAbsen = document.getElementById('regNumber').value;
    const agama = document.getElementById('regReligion').value;
    const nisn = document.getElementById('regNisn').value.replace(/\D/g, '');

    if (!kelas || !noAbsen || !agama) {
      showError('registerError', 'Kelas, nomor absen, dan agama wajib diisi.');
      return;
    }
    if (!/^\d{10}$/.test(nisn)) {
      showError('registerError', 'NISN harus terdiri dari 10 digit angka.');
      return;
    }

    payload.kelas = kelas;
    payload.noAbsen = noAbsen;
    payload.agama = agama;
    payload.nisn = nisn;
  }

  try {
    const result = await requestJson('api/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (result.status === 'success') {
      currentUser = result.user;
      setSession(result.user);
      launchApp();
    } else {
      showError('registerError', result.message);
    }
  } catch (error) {
    showError('registerError', error.message || 'Terjadi kesalahan pada server.');
    console.error('Error:', error);
  }
}

function handleLogout() {
  clearSession();
  clearStoredUser();
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
async function launchApp() {
  console.log('launchApp() called, currentUser:', currentUser);
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  updateUserUI();
  configureRoleUI();
  
  if (isTeacher()) {
    console.log('Loading teacher journals...');
    await loadTeacherJournals();
  } else {
    // Mengambil data dari MySQL saat aplikasi berjalan
    if (currentUser?.id) {
      try {
        const url = 'api/get_data.php?user_id=' + currentUser.id;
        console.log('Fetching student data from:', url);
        const data = await requestJson(url);
        console.log('Data fetched:', data);
        if (data.status === 'success') {
          localHabits = data.habits || {};
          localJournals = data.journals || [];
          console.log('Data loaded - habits count:', Object.keys(localHabits).length, 'journals count:', localJournals.length);
        } else {
          console.error('API returned error:', data.message);
        }
      } catch (error) {
        console.error('Gagal memuat data dari server:', error);
      }
    } else {
      console.error('currentUser.id tidak tersedia:', currentUser);
    }
  }

  document.getElementById('jDate').value = todayStr();
  showPage(isTeacher() ? 'history' : 'write');
}

function updateUserUI() {
  const initials = getInitials(currentUser.name);
  setAvatarByGender('sidebarAvatar', currentUser.gender, initials);
  document.getElementById('sidebarName').textContent = currentUser.name;
  const kelasInfo = buildUserSubLabel(currentUser);
  document.getElementById('sidebarClass').textContent = kelasInfo || '-';
  setAvatarByGender('topbarAvatar', currentUser.gender, initials);
}

function configureRoleUI() {
  const teacher = isTeacher();
  const toggle = (id, hidden) => document.getElementById(id)?.classList.toggle('hidden', hidden);

  document.body.classList.toggle('role-teacher', teacher);

  toggle('navWrite', teacher);
  toggle('navProfile', false);
  toggle('historyWriteBtn', teacher);
  toggle('historyViewAllLink', teacher);

  toggle('historyStatsGrid', teacher);
  toggle('historyDashboardGrid', teacher);
  toggle('historySubjectCard', teacher);
  toggle('historyRekapFilterCard', teacher);
  toggle('rekapStats', teacher);
  toggle('rekapTimeline', teacher);
  toggle('rekapEmpty', teacher);
  toggle('rekapPlaceholder', teacher);
  toggle('teacherHistorySection', !teacher);

  const topbarAvatar = document.getElementById('topbarAvatar');
  if (topbarAvatar) {
    topbarAvatar.setAttribute('onclick', "showPage('profile')");
  }

  if (teacher) {
    const start = document.getElementById('teacherStart');
    const end = document.getElementById('teacherEnd');
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    if (start && !start.value) start.value = first;
    if (end && !end.value) end.value = todayStr();

    const greet = document.getElementById('greetingText');
    const greetDate = document.getElementById('greetingDate');
    if (greet) greet.textContent = 'Dashboard Guru';
    if (greetDate) greetDate.textContent = 'Pantau jurnal murid berdasarkan kelas';
  }
}

function normalizeTeacherJournal(row) {
  return {
    ...row,
    date: row.date || row.tanggal || '',
    student_name: row.student_name || '-',
    student_class: normalizeClassName(row.student_class || row.kelas || ''),
    student_no_absen: row.student_no_absen || row.no_absen || '',
    student_id: row.student_id || row.user_id || ''
  };
}

async function loadTeacherJournals() {
  if (!currentUser?.id) return;

  try {
    const data = await requestJson('api/get_teacher_journals.php?user_id=' + currentUser.id);
    if (data.status === 'success') {
      teacherJournals = (data.journals || []).map(normalizeTeacherJournal);
      localJournals = teacherJournals;
      localHabits = {};
    } else {
      teacherJournals = [];
      localJournals = [];
      showToast(data.message || 'Gagal memuat jurnal murid.', 'error');
    }
  } catch (error) {
    teacherJournals = [];
    localJournals = [];
    showToast('Gagal memuat jurnal murid dari server.', 'error');
    console.error('Gagal memuat jurnal guru:', error);
  }
}

function renderTeacherJournals() {
  if (!isTeacher()) return;

  const grade = document.getElementById('teacherGradeFilter')?.value || 'all';
  const classLetter = document.getElementById('teacherClassFilter')?.value || 'all';
  const start = document.getElementById('teacherStart')?.value || '';
  const end = document.getElementById('teacherEnd')?.value || '';

  let journals = teacherJournals.slice();

  if (grade !== 'all') {
    journals = journals.filter(j => normalizeClassName(j.student_class).startsWith(grade));
  }

  if (classLetter !== 'all') {
    journals = journals.filter(j => normalizeClassName(j.student_class).endsWith(classLetter));
  }

  if (start) journals = journals.filter(j => j.date >= start);
  if (end) journals = journals.filter(j => j.date <= end);

  localJournals = journals;

  const summary = document.getElementById('teacherSummary');
  const groups = document.getElementById('teacherClassGroups');
  const empty = document.getElementById('teacherEmpty');
  if (!summary || !groups || !empty) return;

  const uniqueStudents = new Set(journals.map(j => String(j.student_id || j.user_id || ''))).size;
  const uniqueClasses = new Set(journals.map(j => normalizeClassName(j.student_class))).size;

  summary.innerHTML = `
    <div class="stat-card purple">
      <div class="stat-icon"><i class="fas fa-book"></i></div>
      <div class="stat-info">
        <div class="stat-num">${journals.length}</div>
        <div class="stat-label">Total Jurnal Murid</div>
      </div>
    </div>
    <div class="stat-card blue">
      <div class="stat-icon"><i class="fas fa-users"></i></div>
      <div class="stat-info">
        <div class="stat-num">${uniqueStudents}</div>
        <div class="stat-label">Murid Aktif</div>
      </div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon"><i class="fas fa-school"></i></div>
      <div class="stat-info">
        <div class="stat-num">${uniqueClasses}</div>
        <div class="stat-label">Kelas Aktif</div>
      </div>
    </div>
  `;

  if (!journals.length) {
    groups.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  const grouped = {};
  journals.forEach(j => {
    const key = normalizeClassName(j.student_class) || '-';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(j);
  });

  const orderedClasses = Object.keys(grouped).sort((a, b) => getClassSortKey(a) - getClassSortKey(b));
  groups.innerHTML = orderedClasses.map(className => {
    const classJournals = grouped[className];
    return `
      <div class="card teacher-class-card mt-20">
        <div class="card-header">
          <h3><i class="fas fa-school"></i> Kelas ${className}</h3>
          <span class="badge badge-subject"><i class="fas fa-book-open"></i> ${classJournals.length} jurnal</span>
        </div>
        <div class="journals-grid">
          ${classJournals.map(j => buildJournalCard(j)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ===== NAVIGATION =====
function showPage(page) {
  if (isTeacher() && page !== 'history' && page !== 'profile') {
    page = 'history';
  }

  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-' + page);
    p.classList.toggle('hidden', p.id !== 'page-' + page);
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  const titles = isTeacher()
    ? { history: 'Jurnal Murid', profile: 'Profil Guru' }
    : { history: 'History', write: 'Tulis Jurnal', journals: 'Jurnal Saya', profile: 'Profil' };
  document.getElementById('topbarTitle').textContent = titles[page] || '';

  closeSidebarMobile();

  if (page === 'history') {
    if (isTeacher()) {
      renderTeacherJournals();
    } else {
      renderDashboard();
      initRekapPage();
    }
  }
  if (page === 'journals' && !isTeacher()) renderJournals();
  if (page === 'profile') renderProfile();
  if (page === 'write' && !isTeacher()) {
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

// Hitung mapel hanya dari jurnal "Gemar Belajar", bukan dari semua kebiasaan.
function getJournalSubject(j) {
  const category = String(j.category || '').trim();
  const subject = String(j.subject || '').trim();

  if (category === 'Gemar Belajar' && subject && !HABIT_NAMES.has(subject)) {
    return subject;
  }

  const content = String(j.content || '');
  const m = content.match(/Mata Pelajaran:\s*<\/b>\s*([^<\n]+)/i);
  return m?.[1]?.trim() || '';
}

function getUniqueSubjects(journals) {
  return [...new Set(journals.map(getJournalSubject).filter(Boolean))];
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
  const subjects = getUniqueSubjects(journals);
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

  // Subject distribution
  const subjectCount = {};
  journals
    .map(getJournalSubject)
    .filter(Boolean)
    .forEach(sub => { subjectCount[sub] = (subjectCount[sub] || 0) + 1; });
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

  // Show/hide special sections
  const isBeribadah = index === 1;
  const isBelajar   = index === 4;
  document.getElementById('habitBeribadahSection').classList.toggle('hidden', !isBeribadah);
  document.getElementById('habitBelajarSection').classList.toggle('hidden', !isBelajar);

  if (isBeribadah) {
    const agama = currentUser?.agama || '';
    document.getElementById('habitReligionInfo').value = agama || 'Tidak Diisi';
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
  document.getElementById('habitWaktuGroup').classList.remove('hidden');
}

function saveHabitDetail() {
  const errEl       = document.getElementById('habitModalError');
  const idx         = currentHabitIndex;
  const isBeribadah = idx === 1;
  const isBelajar   = idx === 4;
  const keterangan  = document.getElementById('habitKeterangan').value.trim();

  let agama = '', sholat = [], mapel = '', topik = '';

  if (isBeribadah) {
    agama = currentUser?.agama || 'Tidak Diisi';
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
  const state  = getHabitState(date);

  // Mark habit as done (indicator only)
  state[idx] = { done: true, waktu, keterangan, mapel };
  setHabitState(date, state);

  // Create journal entry in DB_JOURNALS so it appears in Daftar Jurnal & Rekap
  createJournalFromHabit(idx, date, { agama, sholat, mapel, topik, keterangan, waktu });

  closeHabitModal();
  renderHabitCards();
  renderHabitHistory();
  renderJournals();
  showToast(`"${HABITS[idx].name}" berhasil dicatat! \u2705`, 'success');
}

async function createJournalFromHabit(idx, date, data) {
  const h = HABITS[idx];
  const parts = [];
  let subject = h.name;

  if (idx === 1) { // Beribadah
    parts.push('<b>Agama:</b> ' + escHtml(data.agama));
    if (data.agama === 'Islam') {
      parts.push('<b>Sholat:</b> ' + (data.sholat.length ? data.sholat.join(', ') : '\u2014'));
    }
    if (data.waktu) parts.push('<b>Waktu Ibadah:</b> ' + data.waktu);
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
    date:     date,
    subject:  subject,
    category: h.name,
    mood:     '😊',
    rating:   7,
    content:  parts.join('<br>'),
    keypoints: '',
    questions: '',
  };

  localJournals.unshift(entry); // Update state lokal

  // Simpan ke MySQL
  try {
    console.log('Saving journal:', entry);
    const response = await fetch('api/save_journal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id,
        ...entry
      })
    });
    const result = await response.json();
    console.log('Journal save response:', result, 'status:', response.status);
    if (result.status === 'success') {
      console.log('Journal saved successfully');
    } else {
      console.error('Failed to save journal:', result.message);
    }
  } catch(e) { console.error('Gagal menyimpan jurnal ke DB:', e); }
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
    return `
      <div class="habit-history-card" onclick="openHabitDayView('${date}')">
        <div class="hh-date-str">${formatDateShort(date)}</div>
        <div class="hh-subline">
          <span class="hh-progress-str ${allDone ? 'hh-full' : 'hh-partial'}">
            <i class="fas fa-${allDone ? 'check-circle' : 'circle-half-stroke'}"></i>
            ${doneCount}/7 Selesai
          </span>
          <span class="hh-day-meta">${allDone ? 'Lengkap' : 'Sebagian'}</span>
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
  const teacherMeta = isTeacher()
    ? `<div class="jcard-student-meta"><i class="fas fa-user-graduate"></i> ${escHtml(j.student_name || '-')} (${escHtml(j.student_class || '-')}${j.student_no_absen ? ` | Absen ${escHtml(String(j.student_no_absen))}` : ''})</div>`
    : '';
  const actionButtons = isTeacher()
    ? ''
    : `
        <div class="jcard-actions" onclick="event.stopPropagation()">
          <button class="jcard-btn edit" onclick="editJournal('${j.id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="jcard-btn del"  onclick="confirmDelete('${j.id}')" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      `;
  return `
    <div class="journal-card" onclick="openModal('${j.id}')">
      <div class="jcard-head">
        <div class="jcard-title">${escHtml(j.title)}</div>
      </div>
      ${teacherMeta}
      <div class="jcard-meta">
        <span class="badge badge-subject"><i class="fas fa-book"></i> ${escHtml(j.subject)}</span>
        <span class="badge badge-category">${escHtml(j.category)}</span>
      </div>
      <div class="jcard-preview">${escHtml(preview)}</div>
      <div class="jcard-footer">
        <span class="jcard-date"><i class="fas fa-calendar-alt"></i> ${formatDateShort(j.date)}</span>
        ${actionButtons}
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
      <div>
        <div class="modal-title">${escHtml(j.title)}</div>
        <div class="modal-date"><i class="fas fa-calendar"></i> ${formatDate(j.date)}</div>
        ${isTeacher() ? `<div class="modal-date"><i class="fas fa-user-graduate"></i> ${escHtml(j.student_name || '-')} (${escHtml(j.student_class || '-')}${j.student_no_absen ? ` | Absen ${escHtml(String(j.student_no_absen))}` : ''})</div>` : ''}
      </div>
    </div>
    <div class="modal-meta">
      <span class="badge badge-subject"><i class="fas fa-book"></i> ${escHtml(j.subject)}</span>
      <span class="badge badge-category">${escHtml(j.category)}</span>
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
  document.querySelector('#modalOverlay .modal-actions')?.classList.toggle('hidden', isTeacher());
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
async function deleteJournal(id) {
  if (isTeacher()) {
    showToast('Akun guru hanya bisa melihat jurnal murid.', 'error');
    return;
  }

  closeConfirm();
  closeModalBtn();
  
  // Hapus dari state lokal
  localJournals = localJournals.filter(j => j.id !== id);
  
  // Hapus dari MySQL
  try {
    await fetch('api/delete_journal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, user_id: currentUser.id })
    });
  } catch(e) { console.error('Gagal menghapus jurnal dari DB:', e); }

  showToast('Jurnal dihapus.', 'error');
  renderJournals();
  
  // Refresh dashboard kalau menghapus dari halaman dashboard
  if (typeof renderDashboard === 'function' && document.getElementById('page-dashboard').classList.contains('active')) {
      renderDashboard();
  }
}

// ===== REKAP =====

function initRekapPage() {
  const startEl = document.getElementById('rekapStart');
  const endEl   = document.getElementById('rekapEnd');
  // Default: current month, and always refresh recap when History page opens
  if (!startEl.value || !endEl.value) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startEl.value = firstDay.toISOString().split('T')[0];
    endEl.value = todayStr();
  }
  renderRekap();
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
  const subjects  = getUniqueSubjects(journals);
  const totalDays = [...new Set(journals.map(j => j.date))].length;
  const avgPerDay = (journals.length / Math.max(totalDays, 1)).toFixed(1);

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
      <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
      <div class="stat-info">
        <div class="stat-num">${avgPerDay}</div>
        <div class="stat-label">Rata-rata / Hari</div>
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
  setAvatarByGender('profileAvatar', currentUser.gender, initials);
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileClass').textContent = buildUserSubLabel(currentUser);

  const isGuru = isTeacher();
  document.getElementById('teacherProfileCard')?.classList.toggle('hidden', !isGuru);
  document.getElementById('profileEditCard')?.classList.toggle('hidden', isGuru);
  document.getElementById('profileDangerCard')?.classList.toggle('hidden', isGuru);
  document.getElementById('studentExportActions')?.classList.toggle('hidden', isGuru);
  document.getElementById('teacherExportActions')?.classList.toggle('hidden', !isGuru);

  const labelTotal = document.getElementById('pLabelTotal');
  const labelMid = document.getElementById('pLabelMid');
  const labelLast = document.getElementById('pLabelLast');
  const exportDesc = document.getElementById('exportDesc');

  if (isGuru) {
    const all = teacherJournals || [];
    const activeStudents = new Set(all.map(j => String(j.student_id || j.user_id || ''))).size;
    const activeClasses = new Set(all.map(j => normalizeClassName(j.student_class))).size;

    document.getElementById('pTotal').textContent = all.length;
    document.getElementById('pStreak').textContent = activeStudents;
    document.getElementById('pSubjects').textContent = activeClasses;
    if (labelTotal) labelTotal.textContent = 'Jurnal Murid';
    if (labelMid) labelMid.textContent = 'Murid Aktif';
    if (labelLast) labelLast.textContent = 'Kelas Aktif';
    if (exportDesc) exportDesc.textContent = 'Unduh jurnal murid dalam format JSON/CSV (semua data atau sesuai filter History).';
    return;
  }

  document.getElementById('editName').value = currentUser.name;
  document.getElementById('editClass').value = currentUser.kelas;
  document.getElementById('editUsername').value = currentUser.username;
  document.getElementById('editPassword').value = '';

  const journals = getJournals();
  const subjects = getUniqueSubjects(journals);
  document.getElementById('pTotal').textContent = journals.length;
  document.getElementById('pStreak').textContent = calcStreak(journals);
  document.getElementById('pSubjects').textContent = subjects.length;
  if (labelTotal) labelTotal.textContent = 'Jurnal';
  if (labelMid) labelMid.textContent = 'Streak';
  if (labelLast) labelLast.textContent = 'Mapel';
  if (exportDesc) exportDesc.textContent = 'Unduh semua jurnal kamu dalam format JSON';
}

async function saveProfile(e) {
  if (isTeacher()) {
    showToast('Profil guru bersifat read-only.', 'error');
    return;
  }

  e.preventDefault();
  const nama     = document.getElementById('editName').value.trim();
  const kelas    = document.getElementById('editClass').value.trim();
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value;

  // Kita tidak perlu lagi mengecek localStorage
  try {
    const result = await requestJson('api/update_profile.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentUser.id, // ID user yang sedang aktif
        nama: nama,
        kelas: kelas,
        username: username,
        password: password
      })
    });

    if (result.status === 'success') {
      // Jika username berubah, perbarui session lokal
      setSession(result.user);

      // Perbarui state currentUser dengan data terbaru dari server
      currentUser = normalizeUser({ ...currentUser, ...result.user });
      rememberUserGender(currentUser.username, currentUser.gender);
      setStoredUser(currentUser);
      
      // Perbarui tampilan UI (Sidebar, Topbar, dan Form Profil)
      updateUserUI();
      renderProfile();
      
      showToast('Profil berhasil disimpan! ✅', 'success');
      document.getElementById('editPassword').value = ''; // Kosongkan field password setelah sukses
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Terjadi kesalahan pada server.', 'error');
    console.error('Error:', error);
  }
}
// ===== EXPORT =====
function exportJSON() {
  if (isTeacher()) {
    exportTeacherFilteredJSON();
    return;
  }

  const journals = getJournals();
  const blob = new Blob([JSON.stringify({ user: currentUser.name, exportedAt: new Date().toISOString(), journals }, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `jurnal_${currentUser.username}_${todayStr()}.json`);
  showToast('Data diekspor sebagai JSON ✅', 'success');
}

function exportCSV() {
  if (isTeacher()) {
    exportTeacherFilteredCSV();
    return;
  }

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

function getTeacherFilteredJournals() {
  return (localJournals || []).slice();
}

function exportTeacherAllJSON() {
  const journals = (teacherJournals || []).slice();
  const blob = new Blob([JSON.stringify({ user: currentUser.name, role: 'guru', exportedAt: new Date().toISOString(), scope: 'all', journals }, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `jurnal_murid_semua_${todayStr()}.json`);
  showToast('Semua jurnal murid diekspor (JSON) ✅', 'success');
}

function exportTeacherFilteredJSON() {
  const journals = getTeacherFilteredJournals();
  const blob = new Blob([JSON.stringify({ user: currentUser.name, role: 'guru', exportedAt: new Date().toISOString(), scope: 'filtered', journals }, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `jurnal_murid_filter_${todayStr()}.json`);
  showToast('Jurnal sesuai filter diekspor (JSON) ✅', 'success');
}

function buildTeacherCsv(journals) {
  const headers = ['Nama Murid','Kelas','No Absen','Judul','Tanggal','Mata Pelajaran','Kategori','Mood','Rating','Poin Penting','Pertanyaan'];
  const rows = journals.map(j => [
    `"${String(j.student_name || '').replace(/"/g,'""')}"`,
    `"${String(j.student_class || '').replace(/"/g,'""')}"`,
    `"${String(j.student_no_absen || '').replace(/"/g,'""')}"`,
    `"${String(j.title || '').replace(/"/g,'""')}"`,
    j.date || '',
    `"${String(j.subject || '').replace(/"/g,'""')}"`,
    `"${String(j.category || '').replace(/"/g,'""')}"`,
    String(j.mood || ''),
    String(j.rating || ''),
    `"${String(j.keypoints || '').replace(/"/g,'""')}"`,
    `"${String(j.questions || '').replace(/"/g,'""')}"`
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

function exportTeacherAllCSV() {
  const journals = (teacherJournals || []).slice();
  const csv = buildTeacherCsv(journals);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `jurnal_murid_semua_${todayStr()}.csv`);
  showToast('Semua jurnal murid diekspor (CSV) ✅', 'success');
}

function exportTeacherFilteredCSV() {
  const journals = getTeacherFilteredJournals();
  const csv = buildTeacherCsv(journals);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `jurnal_murid_filter_${todayStr()}.csv`);
  showToast('Jurnal sesuai filter diekspor (CSV) ✅', 'success');
}

async function deleteAllData() {
  if (isTeacher()) {
    showToast('Akun guru tidak dapat menghapus jurnal.', 'error');
    return;
  }

  if (!confirm(`Yakin hapus semua ${localJournals.length} jurnal kamu? Tindakan ini tidak bisa dibatalkan!`)) return;

  try {
    const result = await requestJson('api/delete_all_data.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id })
    });

    if (result.status === 'success') {
      // Kosongkan data lokal agar UI langsung update tanpa harus refresh
      localJournals = [];
      localHabits = {};
      
      showToast('Semua data berhasil dihapus.', 'success');
      
      // Update tampilan halaman
      renderProfile();
      renderHabitCards();
      renderHabitHistory();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('Terjadi kesalahan pada server.', 'error');
    console.error('Error:', error);
  }
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
    <p class="meta">${formatDate(j.date)} &nbsp;|&nbsp; ${escHtml(j.subject)} &nbsp;|&nbsp; ${escHtml(j.category)}</p>
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
