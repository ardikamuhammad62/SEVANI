/* ===================================
   SEVANI — APP CORE
   Constants, state, storage, auth, theme, navigation, helpers
   =================================== */

'use strict';

// ===== CONSTANTS =====
const DB_USERS    = 'ejournal_users';
const DB_SESSION  = 'ejournal_session';
const DB_JOURNALS = 'ejournal_journals';
const DB_HABITS   = 'sevani_habits';

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
let currentUser     = null;
let currentView     = 'grid';
let selectedMood    = '😊';
let searchFilter    = 'all';
let currentModalId  = null;
let pendingDeleteId = null;

// ===== STORAGE HELPERS =====
const getUsers    = () => JSON.parse(localStorage.getItem(DB_USERS))   || [];
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

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const session = getSession();
  if (session) {
    const user = getUsers().find(u => u.username === session);
    if (user) { currentUser = user; launchApp(); return; }
  }
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('jDate').value = todayStr();
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
  const user = getUsers().find(u => u.username === username && u.password === password);
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
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(cur === 'dark' ? 'light' : 'dark');
}

// ===== ERROR HELPERS =====
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
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('sidebarClass').textContent  = currentUser.kelas;
  document.getElementById('topbarAvatar').textContent  = initials;
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

  const navMap = { dashboard: 0, write: 1, rekap: 2, search: 3, profile: 4 };
  const idx = navMap[page];
  if (idx !== undefined) document.querySelectorAll('.nav-item')[idx]?.classList.add('active');

  const titles = { dashboard: 'Dashboard', write: 'Tulis Jurnal', rekap: 'Rekap Jurnal', search: 'Cari Jurnal', profile: 'Profil' };
  document.getElementById('topbarTitle').textContent = titles[page] || '';

  closeSidebarMobile();

  if (page === 'dashboard') renderDashboard();
  if (page === 'profile')   renderProfile();
  if (page === 'rekap')     initRekapPage();
  if (page === 'write') {
    renderHabitCards();
    populateFilterSubjects();
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
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.querySelector('.menu-toggle');
  if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

// ===== AUTH UI HELPERS =====
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

// ===== UTILITY =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function formatText(cmd) { document.execCommand(cmd, false, null); }
function saveJournal(e) { e.preventDefault(); } // kept for compat

// ===== TOAST =====
function showToast(msg, type = 'default') {
  const toast = document.getElementById('toast');
  toast.className = `toast${type !== 'default' ? ' ' + type : ''}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i> ${msg}`;
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}
