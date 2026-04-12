// Swiss Diplomatic Plate Lookup – Application Logic

(function () {
  const input    = document.getElementById('plate-input');
  const searchBtn = document.getElementById('search-btn');
  const preview  = document.getElementById('plate-text');
  const resultSection = document.getElementById('result-section');
  const errorSection  = document.getElementById('error-section');
  const errorMsg      = document.getElementById('error-message');

  // ── Parsing ────────────────────────────────────────────────────────────────

  /**
   * Normalise free-form input and extract plate components.
   * Accepted formats (case-insensitive, separators: space / dash / slash):
   *   BE CD 1 15  |  CD 1 15  |  cd 1 15  |  BE-CD-1-15  |  BECD115
   * Returns { corps, status, code } or { error } on failure.
   */
  function parsePlate(raw) {
    // Normalise to upper-case, collapse separators to single space
    let s = raw.toUpperCase().trim().replace(/[-/]+/g, ' ').replace(/\s+/g, ' ');

    // Strip leading canton token (BE, GE, ZH …) – diplomatic plates are always BE
    s = s.replace(/^[A-Z]{2}\s+/, '');

    // Attempt compact format without spaces: CDNNN or CDN NNN
    // e.g. "CD115" → "CD 1 15" is ambiguous without separators; skip compact for now
    const parts = s.split(' ');

    if (parts.length < 3) {
      return { error: 'Please enter a complete plate, e.g. "BE CD 1 15".' };
    }
    if (parts.length > 3) {
      return { error: 'Too many parts. Expected format: "BE CD 1 15" (canton · corps · status · country).' };
    }

    const corps = parts[0];
    if (!CORPS_CODES[corps]) {
      return { error: `Unknown corps code "${corps}". Valid codes: ${Object.keys(CORPS_CODES).join(', ')}.` };
    }

    const status = parseInt(parts[1], 10);
    const code   = parseInt(parts[2], 10);

    if (isNaN(status) || status < 1) {
      return { error: 'Status must be a positive number (e.g. 1 = Ambassador).' };
    }
    if (isNaN(code) || code < 1) {
      return { error: 'Country/organisation code must be a positive number.' };
    }

    return { corps, status, code };
  }

  // ── Lookup ─────────────────────────────────────────────────────────────────

  function lookup(corps, status, code) {
    const corpsFull = CORPS_CODES[corps];
    if (!corpsFull) return { error: `Unknown corps code "${corps}".` };

    const statusLabel = (STATUS_CODES[corps] || {})[status];
    if (!statusLabel) {
      return { error: `Unknown status code "${status}" for corps "${corps}".` };
    }

    let entityLabel, entityFull;
    if (corps === 'IO') {
      entityFull = IO_CODES[code];
      entityLabel = `IO Organisation #${code}`;
      if (!entityFull) return { error: `Unknown IO organisation code "${code}". Valid range: 1–${Object.keys(IO_CODES).length}.` };
    } else {
      entityFull = COUNTRY_CODES[code];
      entityLabel = `Country #${code}`;
      if (!entityFull) return { error: `Unknown country code "${code}". Valid range: 1–${Object.keys(COUNTRY_CODES).length}.` };
    }

    return { corpsFull, statusLabel, entityFull, entityLabel };
  }

  // ── Display ────────────────────────────────────────────────────────────────

  function showResult({ corps, status, code, corpsFull, statusLabel, entityFull }) {
    document.getElementById('result-country').textContent = entityFull;
    document.getElementById('result-corps').textContent   = corps;
    document.getElementById('result-status').textContent  = statusLabel;

    document.getElementById('result-canton').textContent        = 'BE (Bern)';
    document.getElementById('result-corps-detail').textContent  = `${corps} – ${corpsFull}`;
    document.getElementById('result-status-detail').textContent = `${status} – ${statusLabel}`;
    document.getElementById('result-country-detail').textContent = `${code} – ${entityFull}`;

    resultSection.hidden = false;
    errorSection.hidden  = true;

    // Scroll result into view smoothly
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showError(message) {
    errorMsg.textContent    = message;
    errorSection.hidden     = false;
    resultSection.hidden    = true;
  }

  function clearResults() {
    resultSection.hidden = true;
    errorSection.hidden  = true;
  }

  // ── Plate preview ──────────────────────────────────────────────────────────

  function updatePreview(value) {
    const cleaned = value.toUpperCase().trim() || 'BE CD _ ___';
    preview.textContent = cleaned.startsWith('BE') ? cleaned : 'BE ' + cleaned;
  }

  // ── Event wiring ───────────────────────────────────────────────────────────

  function handleSearch() {
    const raw = input.value.trim();
    if (!raw) {
      showError('Please enter a diplomatic plate number.');
      return;
    }

    const parsed = parsePlate(raw);
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

  searchBtn.addEventListener('click', handleSearch);

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSearch();
  });

  input.addEventListener('input', function () {
    clearResults();
    updatePreview(this.value);
  });

  // Example links
  document.querySelectorAll('.example-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      input.value = this.dataset.plate;
      updatePreview(this.dataset.plate);
      handleSearch();
    });
  });

  // Autofocus
  input.focus();
})();
