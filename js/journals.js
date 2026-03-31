/* ===================================
   SEVANI — JOURNALS
   Render list, journal card, modal view, edit, delete, print, export
   =================================== */

// ===== RENDER LIST =====
function renderJournals() {
  let journals = getJournals();
  const subFilter = document.getElementById('filterSubject')?.value || '';
  const catFilter = document.getElementById('filterCategory')?.value || '';
  const sortOrd   = document.getElementById('sortOrder')?.value || 'newest';

  if (subFilter) journals = journals.filter(j => j.subject === subFilter);
  if (catFilter) journals = journals.filter(j => j.category === catFilter);
  journals = journals.slice().sort((a,b) =>
    sortOrd === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  const container = document.getElementById('journalsList');
  const emptyEl   = document.getElementById('noJournals');
  if (!container) return;

  if (!journals.length) {
    container.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');
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
    </div>`;
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

// ===== MODAL VIEW =====
function openModal(id) {
  const j = getJournals().find(x => x.id === id);
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

// ===== EDIT (opens detail modal) =====
function editJournal(id) {
  openModal(id);
}

// ===== DELETE =====
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
  saveJournals(getJournals().filter(j => j.id !== id));
  showToast('Jurnal dihapus.', 'error');
  populateFilterSubjects();
  renderJournals();
}

// ===== PRINT =====
function printJournal(id) {
  const j = getJournals().find(x => x.id === id);
  if (!j) return;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${escHtml(j.title)}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; color: #2d3436; line-height: 1.7; }
      h1 { font-size: 26px; margin-bottom: 6px; }
      .meta { color: #636e72; font-size: 13px; margin-bottom: 24px; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 11px; font-weight: 700; color: #636e72; text-transform: uppercase; letter-spacing: .7px; margin-bottom: 6px; }
      .box { background: #f0f2f8; padding: 14px; border-radius: 8px; white-space: pre-wrap; font-size: 13px; }
      .footer { margin-top: 40px; font-size: 12px; color: #b2bec3; border-top: 1px solid #dfe6e9; padding-top: 12px; }
    </style>
  </head><body>
    <h1>${escHtml(j.title)}</h1>
    <p class="meta">${j.mood} &nbsp;|&nbsp; ${formatDate(j.date)} &nbsp;|&nbsp; ${escHtml(j.subject)} &nbsp;|&nbsp; ${escHtml(j.category)} &nbsp;|&nbsp; Rating: ${j.rating}/10</p>
    <div class="section"><div class="section-title">Catatan</div><div>${j.content}</div></div>
    ${j.keypoints ? `<div class="section"><div class="section-title">Poin Penting</div><div class="box">${escHtml(j.keypoints)}</div></div>` : ''}
    ${j.questions ? `<div class="section"><div class="section-title">Pertanyaan</div><div class="box">${escHtml(j.questions)}</div></div>` : ''}
    <div class="footer">Dicetak dari SEVANI E-Jurnal 7 Kebiasaan — ${currentUser.name} (${currentUser.kelas})</div>
  </body></html>`);
  w.document.close();
  w.print();
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
    `"${j.title.replace(/"/g,'""')}"`, j.date,
    `"${j.subject}"`, `"${j.category}"`, j.mood, j.rating,
    `"${(j.keypoints||'').replace(/"/g,'""')}"`,
    `"${(j.questions||'').replace(/"/g,'""')}"`
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    `jurnal_${currentUser.username}_${todayStr()}.csv`);
  showToast('Data diekspor sebagai CSV ✅', 'success');
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
