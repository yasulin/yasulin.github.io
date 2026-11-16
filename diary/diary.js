(async () => {
  const controls = document.querySelectorAll('.archive select, .archive button, .entry-navigation button');
  controls.forEach(control => { control.disabled = true; });
  let diaryEntries;
  try {
    const response = await fetch('entries.json');
    if (!response.ok) throw new Error(`Diary request failed: ${response.status}`);
    diaryEntries = await response.json();
    if (!Array.isArray(diaryEntries) || diaryEntries.some(entry =>
      typeof entry?.content !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry?.date))) {
      throw new Error('Unexpected diary data');
    }
  } catch (error) {
    document.getElementById('entryDate').textContent = 'The diary could not be loaded.';
    const message = document.createElement('p');
    message.textContent = 'Please refresh the page to try again.';
    document.getElementById('diaryContent').append(message);
    document.getElementById('permalink').hidden = true;
    console.error(error);
    return;
  }
  controls.forEach(control => { control.disabled = false; });
  // The build creates this reading index from the individual entry files.
  const entries = diaryEntries
    .filter(({ content }) => content.trim() && !/^empty\s*\.{3}$/i.test(content.trim()))
    .map(entry => {
      const [year, month, day] = entry.date.split('-');
      return { ...entry, id: entry.date, year, month,
        dateObject: new Date(Number(year), Number(month) - 1, Number(day), 12) };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');
  const archiveList = document.getElementById('archiveList');
  const archivePanel = document.getElementById('archivePanel');
  const entryHeading = document.getElementById('entryHeading');
  const entryDate = document.getElementById('entryDate');
  const content = document.getElementById('diaryContent');
  const olderButton = document.getElementById('prevDayBtn');
  const newerButton = document.getElementById('nextDayBtn');
  const randomButton = document.getElementById('randomDayBtn');
  const desktop = window.matchMedia('(min-width: 701px)');
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const shortDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long' });
  let currentIndex = entries.length - 1;

  function setArchiveLayout() { archivePanel.open = desktop.matches; }
  setArchiveLayout();
  desktop.addEventListener('change', setArchiveLayout);

  if (!entries.length) {
    entryDate.textContent = 'A quiet page, for now.';
    document.getElementById('archiveCount').textContent = 'No entries yet';
    [yearSelect, monthSelect, olderButton, newerButton, randomButton].forEach(control => { control.disabled = true; });
    document.getElementById('permalink').hidden = true;
    return;
  }

  const years = [...new Set(entries.map(entry => entry.year))].reverse();
  years.forEach(year => yearSelect.add(new Option(year, year)));
  document.getElementById('archiveCount').textContent = `${entries.length} pieces to look back on`;

  function populateMonths(preferredMonth) {
    const months = [...new Set(entries.filter(entry => entry.year === yearSelect.value).map(entry => entry.month))].reverse();
    monthSelect.replaceChildren();
    months.forEach(month => {
      const date = new Date(Number(yearSelect.value), Number(month) - 1, 1);
      monthSelect.add(new Option(monthFormat.format(date), month));
    });
    if (months.includes(preferredMonth)) monthSelect.value = preferredMonth;
  }

  function renderArchive() {
    archiveList.replaceChildren();
    entries.filter(entry => entry.year === yearSelect.value && entry.month === monthSelect.value)
      .reverse().forEach(entry => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'archive-link';
        link.href = `#${entry.id}`;
        if (entry.id === entries[currentIndex].id) link.setAttribute('aria-current', 'date');
        const date = document.createElement('time');
        date.dateTime = entry.id;
        date.textContent = shortDateFormat.format(entry.dateObject);
        const excerpt = document.createElement('span');
        excerpt.className = 'excerpt';
        const preview = Array.from(entry.content.replace(/\s+/g, ' ').trim());
        excerpt.textContent = preview.slice(0, 100).join('') + (preview.length > 100 ? '…' : '');
        link.append(date, excerpt);
        link.addEventListener('click', event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate(entries.indexOf(entry));
        });
        item.append(link);
        archiveList.append(item);
      });
  }

  function renderEntry(moveFocus = false) {
    const entry = entries[currentIndex];
    entryDate.dateTime = entry.id;
    entryDate.textContent = dateFormat.format(entry.dateObject);
    document.title = `${dateFormat.format(entry.dateObject)} · Reflective Pieces`;
    content.replaceChildren();
    entry.content.split(/\n\s*\n/).forEach(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      content.append(paragraph);
    });
    document.getElementById('entryPosition').textContent = `Piece ${currentIndex + 1} of ${entries.length}`;
    document.getElementById('permalink').href = `#${entry.id}`;
    olderButton.disabled = currentIndex === 0;
    newerButton.disabled = currentIndex === entries.length - 1;
    yearSelect.value = entry.year;
    populateMonths(entry.month);
    renderArchive();
    if (moveFocus) {
      if (!desktop.matches) archivePanel.open = false;
      entryHeading.focus({ preventScroll: true });
      document.getElementById('entry').scrollIntoView({ block: 'start' });
    }
  }

  function readLocation(moveFocus = false) {
    const index = entries.findIndex(entry => `#${entry.id}` === location.hash);
    currentIndex = index < 0 ? entries.length - 1 : index;
    // Canonicalize missing, invalid, or placeholder dates to a written entry.
    if (index < 0) history.replaceState(null, '', `#${entries[currentIndex].id}`);
    renderEntry(moveFocus);
  }

  function navigate(index) {
    const target = Math.max(0, Math.min(entries.length - 1, index));
    if (location.hash === `#${entries[target].id}`) renderEntry(true);
    else location.hash = entries[target].id;
  }

  yearSelect.addEventListener('change', () => { populateMonths(); renderArchive(); });
  monthSelect.addEventListener('change', renderArchive);
  olderButton.addEventListener('click', () => navigate(currentIndex - 1));
  newerButton.addEventListener('click', () => navigate(currentIndex + 1));
  randomButton.disabled = entries.length < 2;
  randomButton.addEventListener('click', () => {
    // Choose uniformly from every entry except the one already being read.
    let index = Math.floor(Math.random() * (entries.length - 1));
    if (index >= currentIndex) index += 1;
    navigate(index);
  });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    entryHeading.focus({ preventScroll: true });
    document.getElementById('entry').scrollIntoView({ block: 'start' });
  });
  window.addEventListener('hashchange', () => readLocation(true));
  readLocation();
})();
