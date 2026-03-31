/* ===================================
   SEVANI — SEARCH PAGE
   =================================== */

function handleSearch() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const resultsEl = document.getElementById('searchResults');
  const emptyEl   = document.getElementById('searchEmpty');

  if (!q) {
    if (resultsEl) resultsEl.innerHTML = '';
    if (emptyEl)   emptyEl.classList.remove('hidden');
    return;
  }

  const journals = getJournals().filter(j => {
    const matchText    = (j.subject||'').toLowerCase().includes(q) ||
                         (j.content||'').toLowerCase().includes(q) ||
                         (j.keypoints||'').toLowerCase().includes(q);
    const matchCat     = !searchFilter.category || j.category === searchFilter.category;
    const matchSubject = !searchFilter.subject  || j.subject  === searchFilter.subject;
    return matchText && matchCat && matchSubject;
  });

  if (!journals.length) {
    if (resultsEl) resultsEl.innerHTML = '';
    if (emptyEl)   emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');
  if (resultsEl) resultsEl.innerHTML = `<div class="journals-grid">${journals.map(j => buildJournalCard(j)).join('')}</div>`;
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) { input.value = ''; input.focus(); }
  handleSearch();
}

function setSearchFilter(f, el) {
  const type = el?.closest('[data-filter-type]')?.dataset.filterType;
  if (!type) return;

  if (searchFilter[type] === f) {
    searchFilter[type] = null;
    el.classList.remove('active');
  } else {
    searchFilter[type] = f;
    document.querySelectorAll(`[data-filter-type="${type}"] .filter-chip`).forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }
  handleSearch();
}
