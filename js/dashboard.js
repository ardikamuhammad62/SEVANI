/* ===================================
   SEVANI — DASHBOARD
   Stats, mood chart, recent journals, subject distribution
   =================================== */

function renderDashboard() {
  const now  = new Date();
  const hour = now.getHours();
  const greet = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  document.getElementById('greetingText').textContent = `${greet}, ${currentUser.name.split(' ')[0]}! 👋`;
  document.getElementById('greetingDate').textContent = formatDate(todayStr());

  const journals = getJournals();

  // Stats
  document.getElementById('statTotal').textContent = journals.length;
  const weekStart = getWeekStart();
  const weekJournals = journals.filter(j => new Date(j.date + 'T00:00:00') >= weekStart);
  document.getElementById('statWeek').textContent    = weekJournals.length;
  document.getElementById('statStreak').textContent  = calcStreak(journals);
  document.getElementById('statSubjects').textContent = [...new Set(journals.map(j => j.subject))].length;

  // Recent journals
  const recent   = [...journals].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const recentEl = document.getElementById('recentJournals');
  recentEl.innerHTML = recent.length
    ? recent.map(j => `
        <div class="recent-item" onclick="openModal('${j.id}')">
          <div class="recent-dot"></div>
          <div class="recent-title">${escHtml(j.title)}</div>
          <div class="recent-date">${formatDateShort(j.date)}</div>
        </div>`).join('')
    : '<div class="recent-empty">Belum ada jurnal. Mulai menulis!</div>';

  // Mood bars (this week)
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
    </div>`).join('');

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
        </div>`).join('')
    : '<p class="text-muted" style="text-align:center;padding:20px">Belum ada data</p>';
}

function calcStreak(journals) {
  if (!journals.length) return 0;
  const dates = [...new Set(journals.map(j => j.date))].sort((a,b) => b.localeCompare(a));
  let streak = 0;
  let check  = new Date(todayStr() + 'T00:00:00');
  for (const d of dates) {
    const jDate = new Date(d + 'T00:00:00');
    const diff  = (check - jDate) / (1000*60*60*24);
    if (diff === 0 || diff === 1) { streak++; check = jDate; }
    else break;
  }
  return streak;
}
