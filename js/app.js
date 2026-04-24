// Swiss Diplomatic Plate Lookup – Application Logic

(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        return null;
      });
    });
  }

  const cantonSelect = document.getElementById('canton-select');
  const corpsSelect = document.getElementById('corps-select');
  const statusInput = document.getElementById('status-input');
  const codeInput = document.getElementById('code-input');
  const codeLabel = document.getElementById('code-label');
  const recentLookups = document.getElementById('recent-lookups');
  const recentLookupsList = document.getElementById('recent-lookups-list');
  const searchForm = document.getElementById('search-form');
  const preview = document.getElementById('plate-text');
  const resultSection = document.getElementById('result-section');
  const errorSection = document.getElementById('error-section');
  const errorMsg = document.getElementById('error-message');
  const recentStorageKey = 'ch-diplomats-recent-lookups';

  function populateCorpsOptions() {
    const options = Object.entries(CORPS_CODES)
      .map(([code]) => `<option value="${code}">${code}</option>`)
      .join('');

    corpsSelect.innerHTML = options;
    corpsSelect.value = 'CD';
  }

  function sanitizeNumberInput(input) {
    input.value = input.value.replace(/\D+/g, '');
  }

  function parsePlate(rawValue) {
    const normalized = rawValue
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();

    if (!normalized) {
      return null;
    }

    const parts = normalized.split(/\s+/);
    if (parts.length !== 4) {
      return { error: 'Use the format BE CD 1 15.' };
    }

    const [canton, corps, statusText, codeText] = parts;
    const status = parseInt(statusText, 10);
    const code = parseInt(codeText, 10);

    if (!canton || !corps || Number.isNaN(status) || Number.isNaN(code)) {
      return { error: 'Use the format BE CD 1 15.' };
    }

    return { canton, corps, status, code };
  }

  function syncStructuredFields(parsedPlate) {
    cantonSelect.value = parsedPlate.canton;
    corpsSelect.value = parsedPlate.corps;
    statusInput.value = String(parsedPlate.status);
    codeInput.value = String(parsedPlate.code);
    syncUI();
  }

  function getRecentLookups() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(recentStorageKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecentLookup(lookupData) {
    const plate = `${lookupData.canton} ${lookupData.corps} ${lookupData.status} ${lookupData.code}`;
    const nextEntries = [
      plate,
      ...getRecentLookups().filter(function (entry) {
        return entry !== plate;
      }),
    ].slice(0, 5);

    window.localStorage.setItem(recentStorageKey, JSON.stringify(nextEntries));
    renderRecentLookups();
  }

  function renderRecentLookups() {
    const entries = getRecentLookups();
    recentLookups.hidden = entries.length === 0;
    recentLookupsList.innerHTML = entries
      .map(function (entry) {
        return `<button type="button" class="recent-chip" data-plate="${entry}">${entry}</button>`;
      })
      .join('');
  }

  function getCodeLabel(corps) {
    return corps === 'IO' ? 'Organisation code' : 'Country code';
  }

  function getStatusLabel(corps, status) {
    if (corps === 'CD') {
      if (status >= 1 && status <= 5) return 'Ambassador';
      if (status >= 6 && status <= 9) return 'Minister or Counsellor';
      if (status >= 10 && status <= 12) return 'First Secretary';
      if (status >= 13 && status <= 15) return 'Second Secretary';
      if (status >= 16) return 'Diplomatic Staff';
    }

    return (STATUS_CODES[corps] || {})[status] || `Status code ${status}`;
  }

  function syncFieldHints() {
    const corps = corpsSelect.value;
    const codeType = getCodeLabel(corps);

    codeLabel.textContent = codeType;
    codeInput.placeholder = corps === 'IO' ? 'e.g. 3' : 'e.g. 15';
  }

  function updatePreview() {
    const canton = cantonSelect.value || 'BE';
    const corps = corpsSelect.value || 'CD';
    const status = statusInput.value || '_';
    const code = codeInput.value || '___';

    preview.textContent = `${canton} ${corps} ${status} ${code}`;
  }

  function lookup(corps, status, code) {
    const corpsFull = CORPS_CODES[corps];
    if (!corpsFull) return { error: `Unknown corps code "${corps}".` };

    const statusLabel = getStatusLabel(corps, status);

    let entityFull;
    if (corps === 'IO') {
      entityFull = IO_CODES[code];
      if (!entityFull) {
        return { error: `Unknown IO organisation code "${code}". Valid range: 1-${Object.keys(IO_CODES).length}.` };
      }
    } else {
      entityFull = COUNTRY_CODES[code];
      if (!entityFull) {
        return { error: `Unknown country code "${code}". Valid range: 1-${Object.keys(COUNTRY_CODES).length}.` };
      }
    }

    return { corpsFull, statusLabel, entityFull };
  }

  function showResult(data) {
    document.getElementById('result-country').textContent = data.entityFull;
    document.getElementById('result-corps').textContent = data.corps;
    document.getElementById('result-status').textContent = data.statusLabel;

    document.getElementById('result-canton').textContent = `${data.canton} (Bern)`;
    document.getElementById('result-corps-detail').textContent = `${data.corps} – ${data.corpsFull}`;
    document.getElementById('result-status-detail').textContent = `${data.status} – ${data.statusLabel}`;
    document.getElementById('result-country-detail').textContent = `${data.code} – ${data.entityFull}`;

    resultSection.hidden = false;
    errorSection.hidden = true;
    saveRecentLookup(data);
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorSection.hidden = false;
    resultSection.hidden = true;
  }

  function clearResults() {
    resultSection.hidden = true;
    errorSection.hidden = true;
  }

  function getFormValues() {
    return {
      canton: cantonSelect.value,
      corps: corpsSelect.value,
      status: parseInt(statusInput.value, 10),
      code: parseInt(codeInput.value, 10),
    };
  }

  function validateForm() {
    const { canton, corps, status, code } = getFormValues();

    if (!canton) {
      return { error: 'Please choose a canton.' };
    }

    if (canton !== 'BE') {
      return { error: 'Swiss diplomatic plates are issued in the canton of Bern (BE).' };
    }

    if (!corps) {
      return { error: 'Please choose a corps code.' };
    }

    if (Number.isNaN(status) || status < 1) {
      return { error: 'Please enter a valid positive status number.' };
    }

    if (Number.isNaN(code) || code < 1) {
      return { error: `Please enter a valid positive ${getCodeLabel(corps).toLowerCase()}.` };
    }

    return { canton, corps, status, code };
  }

  function handleSearch(event) {
    if (event) {
      event.preventDefault();
    }

    const parsed = validateForm();
    if (parsed.error) {
      showError(parsed.error);
      return;
    }

    const result = lookup(parsed.corps, parsed.status, parsed.code);
    if (result.error) {
      showError(result.error);
      return;
    }

    showResult({ ...parsed, ...result });
  }

  function syncUI() {
    syncFieldHints();
    updatePreview();
  }

  function populateExample(example) {
    syncStructuredFields({
      canton: example.dataset.canton || 'BE',
      corps: example.dataset.corps || 'CD',
      status: example.dataset.status || '',
      code: example.dataset.code || '',
    });
    clearResults();
    handleSearch();
  }

  populateCorpsOptions();
  renderRecentLookups();
  syncUI();

  searchForm.addEventListener('submit', handleSearch);

  [statusInput, codeInput].forEach(function (input) {
    input.addEventListener('input', function () {
      sanitizeNumberInput(input);
      clearResults();
      updatePreview();
    });
  });

  [cantonSelect, corpsSelect].forEach(function (input) {
    input.addEventListener('change', function () {
      clearResults();
      syncUI();
    });
  });

  document.querySelectorAll('.example-link').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      populateExample(link);
    });
  });

  recentLookupsList.addEventListener('click', function (event) {
    const chip = event.target.closest('.recent-chip');
    if (!chip) {
      return;
    }

    const parsedPlate = parsePlate(chip.dataset.plate || '');
    if (!parsedPlate || parsedPlate.error) {
      return;
    }

    syncStructuredFields(parsedPlate);
    clearResults();
    handleSearch();
  });

  statusInput.focus();
})();
