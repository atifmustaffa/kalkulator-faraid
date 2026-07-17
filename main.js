/**
 * Kira Asal Masalah — main.js
 * Two independent calculators for faraid arithmetic:
 *   I.  Faktor Sepunya  — reduces two values by their GCD (used for munasakhat merging)
 *   II. Asal Masalah    — derives the corrected base number using LCM + tashih al-masalah
 *
 * History for each calculator is persisted to localStorage (last 4 entries, newest first).
 */

'use strict';

const RALAT_TEXT = 'RALAT';
const DEFAULT_ERROR = 'RALAT: input tidak sah.';
const LOCALE = 'ms-MY';
const HISTORY_LIMIT = 5;

/* ----------------------------------------------------------------------- */
/*  Shared math helpers                                                    */
/* ----------------------------------------------------------------------- */

/**
 * Greatest common divisor (Euclidean algorithm).
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function gcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Least common multiple of two positive integers.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a / gcd(a, b)) * Math.abs(b);
}

/**
 * Validates that a value is a positive integer.
 * @param {number} n
 * @returns {boolean}
 */
function isPositiveInteger(n) {
  return Number.isInteger(n) && n > 0;
}

function fmt(n) { return n.toLocaleString(LOCALE); }

/* ----------------------------------------------------------------------- */
/*  LocalStorage history helper                                            */
/* ----------------------------------------------------------------------- */

function splitCommaList(raw) {
  return raw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
}

function normalizeListInput(raw, cursorStart, cursorEnd) {
  let value = raw;
  let start = cursorStart;
  let end = cursorEnd;

  const beforeLen = value.length;

  value = value.replace(/\s*\/\s*/g, '/');
  value = value.replace(/[,\s]+/g, ', ');
  value = value.replace(/, $/, ',');

  const afterLen = value.length;
  const delta = afterLen - beforeLen;

  start = Math.max(0, start + delta);
  end = Math.max(0, end + delta);

  return { value, cursorStart: start, cursorEnd: end };
}

function finalizeListInput(raw) {
  return raw.replace(/,\s*$/, '');
}

function setError(el, message) {
  el.textContent = message || '';
  el.classList.toggle('hidden', !message);
}

function bindEnter(inputs, callback) {
  inputs.forEach((input) => input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') callback();
  }));
}

/**
 * Reads history array for a given storage key. Fails safe (returns []) if
 * localStorage is unavailable or the stored value is corrupted.
 * @param {string} key
 * @returns {string[]}
 */
function loadHistory(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Gagal membaca sejarah (${key}):`, err);
    return [];
  }
}

/**
 * Prepends a new entry to a card's history, trims to HISTORY_LIMIT, and persists it.
 * @param {string} key
 * @param {string} entry
 * @returns {string[]} the updated history
 */
function pushHistory(key, entry) {
  const history = loadHistory(key);
  if (history.length > 0 && history[0] === entry) {
    return history;
  }
  history.unshift(entry);
  const trimmed = history.slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    // Storage might be full or disabled (private browsing) — degrade gracefully.
    console.error(`Gagal menyimpan sejarah (${key}):`, err);
  }
  return trimmed;
}

/**
 * Renders a history list into a <ul>, labelling the first two entries and
 * padding remaining slots with placeholder rows so the layout stays stable.
 * @param {HTMLElement} listEl
 * @param {string[]} history
 */
function renderHistory(listEl, history) {
  const labels = ['Terkini', 'Sebelum ini'];
  listEl.innerHTML = '';

  for (let i = 0; i < HISTORY_LIMIT; i++) {
    const li = document.createElement('li');
    li.className = 'py-2 flex items-center justify-between gap-3';

    const label = document.createElement('span');
    label.className = 'text-[11px] text-inkfaint font-sans shrink-0';
    label.textContent = labels[i] || '';

    const value = document.createElement('span');
    value.className = 'text-right truncate';
    value.textContent = history[i] || '—';

    li.appendChild(label);
    li.appendChild(value);
    listEl.appendChild(li);
  }
}

function setupCalculator(config) {
  const { inputs, outputs, historyKey, calculateFn, errorEl, historyEl, btnEl } = config;

  function init() {
    btnEl.addEventListener('click', calculateFn);
    bindEnter(inputs, calculateFn);
    renderHistory(historyEl, loadHistory(historyKey));
  }

  return { init, ctx: config };
}

/* ----------------------------------------------------------------------- */
/*  Card I — Faktor Sepunya (GCD)                                          */
/* ----------------------------------------------------------------------- */

const C1_HISTORY_KEY = 'kiraFaraid.faktorSepunya.history';

const c1 = {
  nilai1: document.getElementById('c1-nilai1'),
  nilai2: document.getElementById('c1-nilai2'),
  btn: document.getElementById('c1-btn'),
  error: document.getElementById('c1-error'),
  hasil1: document.getElementById('c1-hasil1'),
  hasil2: document.getElementById('c1-hasil2'),
  history: document.getElementById('c1-history'),
};

function calculateFaktorSepunya() {
  setError(c1.error, null);

  const a = parseInt(c1.nilai1.value, 10);
  const b = parseInt(c1.nilai2.value, 10);

  try {
    if (!isPositiveInteger(a) || !isPositiveInteger(b)) {
      throw new Error('Sila masukkan Nilai 1 dan Nilai 2 sebagai nombor bulat positif.');
    }

    const divisor = gcd(a, b);
    if (divisor === 0) {
      // Unreachable given the positive-integer guard above, but kept defensively.
      throw new Error(RALAT_TEXT + ': tidak dapat mengira GCD.');
    }

    const faktor1 = a / divisor;
    const faktor2 = b / divisor;

    c1.hasil1.textContent = fmt(faktor1);
    c1.hasil2.textContent = fmt(faktor2);
    c1.hasil1.classList.add('result-fade-in');
    c1.hasil2.classList.add('result-fade-in');

    const entry = `${a}, ${b} → ${faktor1}, ${faktor2}`;
    const updated = pushHistory(C1_HISTORY_KEY, entry);
    renderHistory(c1.history, updated);
  } catch (err) {
    setError(c1.error, err.message || DEFAULT_ERROR);
    c1.hasil1.textContent = RALAT_TEXT;
    c1.hasil2.textContent = RALAT_TEXT;
  }
}

const calc1 = setupCalculator({
  inputs: [c1.nilai1, c1.nilai2],
  outputs: [c1.hasil1, c1.hasil2],
  historyKey: C1_HISTORY_KEY,
  calculateFn: calculateFaktorSepunya,
  errorEl: c1.error,
  historyEl: c1.history,
  btnEl: c1.btn,
});
calc1.init();

/* ----------------------------------------------------------------------- */
/*  Card II — Asal Masalah (LCM + tashih al-masalah)                       */
/* ----------------------------------------------------------------------- */

const C2_HISTORY_KEY = 'kiraFaraid.asalMasalah.history';

const c2 = {
  nisbah: document.getElementById('c2-nisbah'),
  waris: document.getElementById('c2-waris'),
  btn: document.getElementById('c2-btn'),
  error: document.getElementById('c2-error'),
  lcm: document.getElementById('c2-lcm'),
  used: document.getElementById('c2-used'),
  remain: document.getElementById('c2-remain'),
  heircount: document.getElementById('c2-heircount'),
  final: document.getElementById('c2-final'),
  history: document.getElementById('c2-history'),
};

/**
 * Parses a ratio string like "1/8, 1/6, 2/3" into an array of [numerator, denominator] pairs.
 * Throws a descriptive error if any term is malformed.
 * @param {string} raw
 * @returns {[number, number][]}
 */
function parseRatios(raw) {
  const terms = splitCommaList(raw);
  if (terms.length === 0) {
    throw new Error('Sila masukkan sekurang-kurangnya satu nisbah, cth: 1/8, 1/6.');
  }

  return terms.map((term) => {
    const match = term.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!match) {
      throw new Error(`Format nisbah tidak sah: "${term}". Gunakan format seperti 1/8.`);
    }
    const numerator = parseInt(match[1], 10);
    const denominator = parseInt(match[2], 10);
    if (!isPositiveInteger(denominator)) {
      throw new Error(`Penyebut tidak sah dalam nisbah "${term}".`);
    }
    if (numerator < 0) {
      throw new Error(`Pengangka tidak sah dalam nisbah "${term}".`);
    }
    return [numerator, denominator];
  });
}

/**
 * Parses the "heir/unit" field. If it contains a comma, treats it as a list
 * of asabah weights (e.g. "2,2,1,1" for 2 sons + 2 daughters) and sums them.
 * Otherwise treats it as a single pre-summed heir-part count.
 * @param {string} raw
 * @returns {number}
 */
function parseHeirCount(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error('Sila masukkan bahagian waris asabah (baki).');
  }

  if (trimmed.includes(',')) {
    const weights = splitCommaList(trimmed);
    let sum = 0;
    for (const w of weights) {
      const n = Number(w);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`Pemberat waris tidak sah: "${w}". Gunakan nombor bulat positif.`);
      }
      sum += n;
    }
    if (sum === 0) {
      throw new Error('Jumlah pemberat waris mestilah lebih daripada sifar.');
    }
    return sum;
  }

  const n = Number(trimmed);
  if (!isPositiveInteger(n)) {
    throw new Error('Bahagian waris asabah mestilah nombor bulat positif.');
  }
  return n;
}

function calculateAsalMasalah() {
  setError(c2.error, null);

  try {
    c2.nisbah.value = finalizeListInput(c2.nisbah.value);
    c2.waris.value = finalizeListInput(c2.waris.value);
    const ratios = parseRatios(c2.nisbah.value);
    const heirCount = parseHeirCount(c2.waris.value);

    // Base LCM: the LCM of every ratio's denominator.
    const denominators = ratios.map(([, d]) => d);
    const baseLcm = denominators.reduce((acc, d) => lcm(acc, d), 1);

    // Used units: each ratio's share once scaled onto the base LCM.
    let used = 0;
    for (const [num, den] of ratios) {
      const share = (num / den) * baseLcm;
      if (!Number.isInteger(share)) {
        // Should not happen since baseLcm is a common multiple of all denominators,
        // but guard against floating point edge cases just in case.
        throw new Error(`Nisbah ${num}/${den} tidak dapat dibahagi sama rata pada asas ${baseLcm}.`);
      }
      used += share;
    }

    const remaining = baseLcm - used;
    if (remaining < 0) {
      throw new Error(RALAT_TEXT + ': jumlah nisbah melebihi 1 (kes Aul tidak disokong oleh kalkulator ini).');
    }

    let finalAsalMasalah;
    if (remaining === 0) {
      // No residue left for asabah — final base is simply the LCM itself.
      finalAsalMasalah = baseLcm;
    } else {
      const g = gcd(remaining, heirCount);
      if (g === 0) {
        throw new Error(RALAT_TEXT + ': tidak dapat mengira GCD bagi baki unit dan bahagian waris.');
      }
      finalAsalMasalah = (baseLcm * heirCount) / g;
    }

    // Populate step-by-step results.
    c2.lcm.textContent = fmt(baseLcm);
    c2.used.textContent = fmt(used);
    c2.remain.textContent = fmt(remaining);
    c2.heircount.textContent = fmt(heirCount);
    c2.final.textContent = fmt(finalAsalMasalah);
    c2.final.classList.add('result-fade-in');

    const entry = `${c2.nisbah.value.trim()} | waris=${heirCount} → AM=${finalAsalMasalah}`;
    const updated = pushHistory(C2_HISTORY_KEY, entry);
    renderHistory(c2.history, updated);
  } catch (err) {
    setError(c2.error, err.message || DEFAULT_ERROR);
    c2.lcm.textContent = c2.used.textContent = c2.remain.textContent = c2.heircount.textContent = '—';
    c2.final.textContent = RALAT_TEXT;
  }
}

const calc2 = setupCalculator({
  inputs: [c2.nisbah, c2.waris],
  outputs: [c2.lcm, c2.used, c2.remain, c2.heircount, c2.final],
  historyKey: C2_HISTORY_KEY,
  calculateFn: calculateAsalMasalah,
  errorEl: c2.error,
  historyEl: c2.history,
  btnEl: c2.btn,
});
calc2.init();

function attachListNormalizer(inputEl) {
  inputEl.addEventListener('input', (e) => {
    const raw = inputEl.value;
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;
    const result = normalizeListInput(raw, start, end);
    if (result.value !== raw) {
      inputEl.value = result.value;
      inputEl.setSelectionRange(result.cursorStart, result.cursorEnd);
    }
  });
}

attachListNormalizer(c2.nisbah);
attachListNormalizer(c2.waris);


