/* ===================================
   SEVANI — PROFILE PAGE
   =================================== */

function renderProfile() {
  const user = currentUser;
  if (!user) return;

  const nameEl  = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const bioEl   = document.getElementById('profileBio');
  const avatarBigEl = document.getElementById('profileAvatarBig');

  if (nameEl)      nameEl.value  = user.name  || '';
  if (emailEl)     emailEl.value = user.email || '';
  if (bioEl)       bioEl.value   = user.bio   || '';
  if (avatarBigEl) avatarBigEl.textContent = getInitials(user.name);

  const journals  = getJournals();
  const subjects  = [...new Set(journals.map(j => j.subject))];
  const avgRating = journals.length
    ? (journals.reduce((s,j) => s + (j.rating||0), 0) / journals.length).toFixed(1)
    : '–';

  const totalEl   = document.getElementById('profileStatTotal');
  const subjectEl = document.getElementById('profileStatSubjects');
  const ratingEl  = document.getElementById('profileStatRating');

  if (totalEl)   totalEl.textContent   = journals.length;
  if (subjectEl) subjectEl.textContent = subjects.length;
  if (ratingEl)  ratingEl.textContent  = avgRating;
}

function saveProfile(e) {
  if (e) e.preventDefault();
  const newName  = (document.getElementById('profileName')?.value  || '').trim();
  const newBio   = (document.getElementById('profileBio')?.value   || '').trim();

  if (!newName) { showToast('Nama tidak boleh kosong!', 'error'); return; }

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === currentUser.email);
  if (idx === -1) return;

  users[idx].name = newName;
  users[idx].bio  = newBio;
  saveUsers(users);

  currentUser = users[idx];
  setSession(currentUser);
  updateUserUI();
  renderProfile();
  showToast('Profil berhasil disimpan!', 'success');
}

function deleteAllData() {
  localStorage.removeItem('ejournal_journals');
  showToast('Semua data jurnal telah dihapus.', 'success');
  closeConfirm();
  showPage('dashboard');
}
