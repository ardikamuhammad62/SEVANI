/* ===================================
   SEVANI — REKAP PAGE
   Date-range recap of journals + stats
   =================================== */

const MOOD_LABELS = { '😄': 'Sangat Baik', '😊': 'Baik', '😐': 'Biasa', '😕': 'Kurang', '😞': 'Buruk' };

function initRekapPage() {
  const startEl = document.getElementById('rekapStart');
  const endEl   = document.getElementById('rekapEnd');
  if (!startEl.value && !endEl.value) {
    const now = new Date();
    startEl.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    endEl.value   = todayStr();
    renderRekap();
  }
}

function renderRekap() {
  const start = document.getElementById('rekapStart').value;
  const end   = document.getElementById('rekapEnd').value;

  const statsEl       = document.getElementById('rekapStats');
  const timelineEl    = document.getElementById('rekapTimeline');
  const emptyEl       = document.getElementById('rekapEmpty');
  const placeholderEl = document.getElementById('rekapPlaceholder');

  if (!start || !end) { showToast('Pilih tanggal awal dan akhir terlebih dahulu!', 'error'); return; }
  if (start > end)    { showToast('Tanggal awal tidak boleh lebih dari tanggal akhir!', 'error'); return; }

  placeholderEl.classList.add('hidden');
  const journals = getJournals().filter(j => j.date >= start && j.date <= end);

  if (!journals.length) {
    statsEl.style.display = 'none';
    timelineEl.innerHTML  = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const avgRating = (journals.reduce((s, j) => s + (j.rating || 0), 0) / journals.length).toFixed(1);
  const subjects  = [...new Set(journals.map(j => j.subject))];
  const domMood   = getDominantMood(journals);
  const totalDays = [...new Set(journals.map(j => j.date))].length;

  statsEl.style.display = 'grid';
  statsEl.innerHTML = `
    <div class="stat-card purple">
      <div class="stat-icon"><i class="fas fa-book"></i></div>
      <div class="stat-info"><div class="stat-num">${journals.length}</div><div class="stat-label">Total Jurnal</div></div>
    </div>
    <div class="stat-card blue">
      <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
      <div class="stat-info"><div class="stat-num">${totalDays}</div><div class="stat-label">Hari Aktif</div></div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon"><i class="fas fa-layer-group"></i></div>
      <div class="stat-info"><div class="stat-num">${subjects.length}</div><div class="stat-label">Mata Pelajaran</div></div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon" style="font-size:26px">${domMood}</div>
      <div class="stat-info">
        <div class="stat-num" style="font-size:16px;line-height:1.3">${MOOD_LABELS[domMood] || 'Baik'}</div>
        <div class="stat-label">Mood Dominan</div>
      </div>
    </div>`;

  // Group by date
  const grouped = {};
  journals.forEach(j => { (grouped[j.date] = grouped[j.date] || []).push(j); });
  const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  timelineEl.innerHTML = sortedDates.map(date => `
    <div class="rekap-group">
      <div class="rekap-date-header">
        <div class="rekap-date-badge"><i class="fas fa-calendar-day"></i> ${formatDate(date)}</div>
        <span class="rekap-date-count">${grouped[date].length} jurnal</span>
      </div>
      <div class="journals-grid">${grouped[date].map(j => buildJournalCard(j)).join('')}</div>
    </div>`).join('');
}

function getDominantMood(journals) {
  const cnt = {};
  journals.forEach(j => { const m = j.mood || '😊'; cnt[m] = (cnt[m] || 0) + 1; });
  return Object.entries(cnt).sort((a,b) => b[1]-a[1])[0]?.[0] || '😊';
}

function rekapToday() {
  const today = todayStr();
  document.getElementById('rekapStart').value = today;
  document.getElementById('rekapEnd').value   = today;
  renderRekap();
}
function rekapThisWeek() {
  document.getElementById('rekapStart').value = getWeekStart().toISOString().split('T')[0];
  document.getElementById('rekapEnd').value   = todayStr();
  renderRekap();
}
function rekapThisMonth() {
  const now = new Date();
  document.getElementById('rekapStart').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  document.getElementById('rekapEnd').value   = todayStr();
  renderRekap();
}
