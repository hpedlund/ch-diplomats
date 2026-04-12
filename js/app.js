// Swiss Diplomatic Plate Lookup – Application Logic

(function () {
  const cantonSelect = document.getElementById('canton-select');
  const corpsSelect = document.getElementById('corps-select');
  const statusInput = document.getElementById('status-input');
  const codeInput = document.getElementById('code-input');
  const codeLabel = document.getElementById('code-label');
  const statusHint = document.getElementById('status-hint');
  const codeHint = document.getElementById('code-hint');
  const searchForm = document.getElementById('search-form');
  const preview = document.getElementById('plate-text');
  const resultSection = document.getElementById('result-section');
  const errorSection = document.getElementById('error-section');
  const errorMsg = document.getElementById('error-message');

  function populateCorpsOptions() {
    const options = Object.entries(CORPS_CODES)
      .map(([code, label]) => `<option value="${code}">${code} — ${label}</option>`)
      .join('');

    corpsSelect.innerHTML = options;
    corpsSelect.value = 'CD';
  }

  function sanitizeNumberInput(input) {
    input.value = input.value.replace(/\D+/g, '');
  }

  function getCodeLabel(corps) {
    return corps === 'IO' ? 'Organisation code' : 'Country code';
  }

  function getCodeHint(corps) {
    return corps === 'IO'
      ? `Valid organisation codes: 1-${Object.keys(IO_CODES).length}.`
      : `Valid country codes: 1-${Object.keys(COUNTRY_CODES).length}.`;
  }

  function getStatusHint(corps) {
    const statuses = Object.keys(STATUS_CODES[corps] || {}).map(Number).sort(function (a, b) {
      return a - b;
    });

    if (!statuses.length) {
      return 'No status codes available.';
    }

    return `Valid status codes: ${statuses.join(', ')}.`;
  }

  function syncFieldHints() {
    const corps = corpsSelect.value;
    const codeType = getCodeLabel(corps);

    codeLabel.textContent = codeType;
    codeInput.placeholder = corps === 'IO' ? 'e.g. 3' : 'e.g. 15';
    statusHint.textContent = getStatusHint(corps);
    codeHint.textContent = getCodeHint(corps);
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

    const statusLabel = (STATUS_CODES[corps] || {})[status];
    if (!statusLabel) {
      return { error: `Unknown status code "${status}" for corps "${corps}".` };
    }

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
    cantonSelect.value = example.dataset.canton || 'BE';
    corpsSelect.value = example.dataset.corps || 'CD';
    statusInput.value = example.dataset.status || '';
    codeInput.value = example.dataset.code || '';
    clearResults();
    syncUI();
    handleSearch();
  }

  populateCorpsOptions();
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

  statusInput.focus();
})();
