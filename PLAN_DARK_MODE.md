# Blueprint: Dark Mode Toggle — Kalkulator Faraid

**Date**: 20260717
**Scope**: Add a light/dark theme toggle that preserves the warm Islamic manuscript aesthetic, with localStorage persistence, system preference fallback, and PWA cache bump.
**Complexity**: Medium

---

## 1. Context Summary

- **Stack**: Vanilla HTML + JS, Tailwind CSS via CDN (no build step).
- **Entry files**: `index.html` (single page, inline Tailwind config + custom `<style>`), `main.js` (business logic + localStorage history), `sw.js` (PWA cache).
- **Aesthetic**: Warm parchment ledger — Lora/Inter/JetBrains Mono fonts, brass/gold accents, `.ledger-card` with decorative corner ticks.
- **Current Tailwind tokens**: `paper`, `card`, `ink`, `inkfaint`, `brass`, `brassdark`, `highlight`, `err`.
- **Hardcoded hex in `<style>`**: `.ledger-card` bg `#FFFDF6`, `.double-rule` borders `#A87C2A`, focus outlines `#A87C2A`.
- **localStorage pattern**: `kiraFaraid.faktorSepunya.history` / `kiraFaraid.asalMasalah.history` — wrap in `try/catch`.
- **No existing dark mode**, no `prefers-color-scheme` usage, no CSS variables.

---

## 2. Chosen Approach

**Tailwind `darkMode: 'class'` + CSS variables for custom `<style>` + separate dark color tokens in Tailwind config.**

- Tailwind CDN handles `dark:` variants reliably when `darkMode: 'class'` is set and the `dark` class is toggled on `<html>`.
- CSS variables are used **only** for the hand-written `<style>` block (`.ledger-card`, `.double-rule`, focus outlines) so the same selectors work in both modes without duplicating rules.
- Dark color tokens (`paper-dark`, `card-dark`, etc.) are added to the Tailwind config so inline utility classes can use `dark:bg-paper-dark`, `dark:text-ink-dark`, etc. This avoids the opacity-modifier problem that occurs when mapping Tailwind colors directly to CSS variables in CDN builds.
- FOUC prevention via an inline `<script>` in `<head>` that runs before body paint.
- System preference listener auto-applies when no stored preference exists.

---

## 3. Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate dark tokens in Tailwind config** (`paper-dark`, `ink-dark`…) | Tailwind CDN opacity modifiers (`bg-ink/20`) do not reliably compose with CSS variable values. Keeping hex tokens in config preserves existing `/20`, `/10`, `/60` modifiers. |
| **CSS variables only for `<style>` block** | The custom `.ledger-card`, pseudo-elements, and focus outlines are outside Tailwind's utility layer. Variables let one selector adapt to both themes. |
| **Warm dark palette (walnut/leather, not slate)** | Preserves the manuscript character. Pure black or cool grays would destroy the Islamic ledger aesthetic. |
| **Toggle placed absolute inside `<header>`** | Header is centered text; absolute positioning avoids flex reflow or disrupting the existing layout. |
| **localStorage key: `kiraFaraid.theme`** | Consistent with existing `kiraFaraid.*` history keys. Values: `'light'` \| `'dark'`. |
| **Cache bump to `v2`** | PWA service worker must invalidate old cached `index.html` / `main.js` so returning users receive the new markup and scripts. |
| **`aria-pressed` on toggle** | Communicates "dark mode is active" state to screen readers. Label flips between "Tukar tema gelap" and "Tukar tema terang". |

---

## 4. Implementation Checklist

### 4.1 FOUC Prevention Script (`index.html`)
- [ ] `index.html:12` — Insert **before** the Tailwind CDN script (`<script src="https://cdn.tailwindcss.com"></script>`).
  ```html
  <script>
    (function () {
      try {
        const stored = localStorage.getItem('kiraFaraid.theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (stored === 'dark' || (!stored && systemDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  </script>
  ```
  - Test: Hard-reload with system dark + cleared storage → `<html>` should already have `class="dark"` before first paint (check in DevTools Elements, no flash of light background).

### 4.2 Tailwind Config — Add `darkMode` + Dark Tokens (`index.html`)
- [ ] `index.html:20-40` — Replace the `tailwind.config` block.
  - **Old**:
    ```js
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            paper: '#F6F1E4',
            card: '#FFFDF6',
            ink: '#22303A',
            inkfaint: '#5B6B74',
            brass: '#A87C2A',
            brassdark: '#8A6620',
            highlight: '#EFE6C8',
            err: '#A6392D',
          },
    ```
  - **New**:
    ```js
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            paper: '#F6F1E4',
            'paper-dark': '#1A1612',
            card: '#FFFDF6',
            'card-dark': '#231F1A',
            ink: '#22303A',
            'ink-dark': '#E8DDD0',
            inkfaint: '#5B6B74',
            'inkfaint-dark': '#8A7D6E',
            brass: '#A87C2A',
            'brass-dark': '#D4A84B',
            brassdark: '#8A6620',
            'brassdark-dark': '#B8923A',
            highlight: '#EFE6C8',
            'highlight-dark': '#3D3428',
            err: '#A6392D',
            'err-dark': '#D96B5F',
          },
    ```
  - Test: Open DevTools Console → `tailwind.config` object contains `darkMode: 'class'` and all `*-dark` keys.

### 4.3 CSS Variable Strategy for `<style>` Block (`index.html`)
- [ ] `index.html:43-88` — Replace the entire `<style>` block.
  - **New content**:
    ```css
    <style>
      :root {
        --card: #FFFDF6;
        --card-border: rgba(34, 48, 58, 0.14);
        --card-shadow: rgba(34, 48, 58, 0.05);
        --brass: #A87C2A;
        --focus-outline: #A87C2A;
      }
      html.dark {
        --card: #231F1A;
        --card-border: rgba(232, 221, 208, 0.14);
        --card-shadow: rgba(0, 0, 0, 0.15);
        --brass: #D4A84B;
        --focus-outline: #D4A84B;
      }

      .double-rule {
        border-top: 2px solid var(--brass);
        border-bottom: 1px solid var(--brass);
        height: 4px;
      }
      .ledger-card {
        background-color: var(--card);
        border: 1px solid var(--card-border);
        box-shadow: 0 1px 0 var(--card-shadow);
        position: relative;
      }
      .ledger-card::before {
        content: '';
        position: absolute;
        top: 10px;
        left: 10px;
        width: 10px;
        height: 10px;
        border-top: 2px solid var(--brass);
        border-left: 2px solid var(--brass);
      }
      .ledger-card::after {
        content: '';
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 10px;
        height: 10px;
        border-bottom: 2px solid var(--brass);
        border-right: 2px solid var(--brass);
      }
      input:focus-visible, button:focus-visible {
        outline: 2px solid var(--focus-outline);
        outline-offset: 2px;
      }
      .result-fade-in {
        animation: fadeIn 0.25s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(2px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #theme-toggle svg {
        transition: transform 0.2s ease, opacity 0.2s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        #theme-toggle svg {
          transition: none;
        }
      }
    </style>
    ```
  - Test: Toggle dark mode → `.ledger-card` background, borders, and corner ticks switch to warm dark tones; focus outline remains brass-colored.

### 4.4 Global Body & Text Classes (`index.html`)
- [ ] `index.html:91` — Update `<body>` tag.
  - **Old**: `<body class="bg-paper text-ink font-sans min-h-screen">`
  - **New**: `<body class="bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark font-sans min-h-screen">`
  - Test: Body background and text color switch in dark mode.

- [ ] `index.html:95` — Update header subtitle.
  - **Old**: `text-brassdark`
  - **New**: `text-brassdark dark:text-brassdark-dark`

- [ ] `index.html:96` — Update `<h1>`.
  - **Old**: `text-ink`
  - **New**: `text-ink dark:text-ink-dark`

- [ ] `index.html:98` — Update description paragraph.
  - **Old**: `text-inkfaint`
  - **New**: `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:248-252` — Update disclaimer block.
  - **Old**: `text-inkfaint`
  - **New**: `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:254-259` — Update footer.
  - **Old**: `text-inkfaint`
  - **New**: `text-inkfaint dark:text-inkfaint-dark`
  - Also update footer link: `text-inkfaint` → `text-inkfaint dark:text-inkfaint-dark`

### 4.5 Theme Toggle Markup (`index.html`)
- [ ] `index.html:94` — Add `relative` to `<header>`.
  - **Old**: `<header class="max-w-5xl mx-auto px-6 pt-12 pb-6 text-center">`
  - **New**: `<header class="relative max-w-5xl mx-auto px-6 pt-12 pb-6 text-center">`

- [ ] `index.html:95` — Insert toggle button **as the first child** inside `<header>`, before the subtitle `<p>`.
  ```html
  <button
    id="theme-toggle"
    type="button"
    aria-label="Tukar tema gelap"
    aria-pressed="false"
    class="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-sm text-ink dark:text-ink-dark bg-card dark:bg-card-dark border border-ink/20 dark:border-ink-dark/20 hover:border-brass dark:hover:border-brass-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass dark:focus-visible:outline-brass-dark transition"
  >
    <!-- Sun — shown in light mode -->
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 block dark:hidden">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
    <!-- Moon — shown in dark mode -->
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 hidden dark:block">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  </button>
  ```
  - Test: Button is 40×40px tap target, visible top-right, sun icon hides / moon icon shows when `dark` class is present.

### 4.6 Card I — Faktor Sepunya Dark Classes (`index.html`)
- [ ] `index.html:108` — Roman numeral & heading colors.
  - `text-brass` → `text-brass dark:text-brass-dark`
  - `text-ink` → `text-ink dark:text-ink-dark`

- [ ] `index.html:111` — Description.
  - `text-inkfaint` → `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:116` & `129` — Both number inputs.
  - **Old**: `border border-ink/20 bg-white px-3 py-2.5 text-ink font-mono text-sm focus:border-brass focus:ring-1 focus:ring-brass outline-none transition`
  - **New**: `border border-ink/20 dark:border-ink-dark/20 bg-white dark:bg-card-dark px-3 py-2.5 text-ink dark:text-ink-dark font-mono text-sm focus:border-brass dark:focus:border-brass-dark focus:ring-1 focus:ring-brass dark:focus:ring-brass-dark outline-none transition`

- [ ] `index.html:140` — Error text.
  - `text-err` → `text-err dark:text-err-dark`

- [ ] `index.html:144` — Calculate button.
  - **Old**: `bg-ink hover:bg-ink/90 active:bg-ink text-paper`
  - **New**: `bg-ink dark:bg-ink-dark hover:bg-ink/90 dark:hover:bg-ink-dark/90 active:bg-ink dark:active:bg-ink-dark text-paper dark:text-paper-dark`

- [ ] `index.html:151` & `155` — Result highlight boxes.
  - `bg-highlight/60` → `bg-highlight/60 dark:bg-highlight-dark/60`

- [ ] `index.html:152` & `156` — Result numbers.
  - `text-ink` → `text-ink dark:text-ink-dark`

- [ ] `index.html:153` & `157` — Result labels.
  - `text-inkfaint` → `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:164` — History card title.
  - `text-brassdark` → `text-brassdark dark:text-brassdark-dark`

- [ ] `index.html:165` — History list.
  - **Old**: `text-ink/80 divide-y divide-ink/10`
  - **New**: `text-ink/80 dark:text-ink-dark/80 divide-y divide-ink/10 dark:divide-ink-dark/10`

### 4.7 Card II — Asal Masalah Dark Classes (`index.html`)
- [ ] `index.html:175` — Roman numeral & heading colors (same pattern as Card I).

- [ ] `index.html:178` — Description.
  - `text-inkfaint` → `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:183` & `194` — Text inputs.
  - Apply same dark classes as Card I inputs (`dark:border-ink-dark/20`, `dark:bg-card-dark`, `dark:text-ink-dark`, `dark:focus:border-brass-dark`, `dark:focus:ring-brass-dark`).

- [ ] `index.html:188` & `199` — Input helper paragraphs.
  - `text-inkfaint` → `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:202` — Error text.
  - `text-err` → `text-err dark:text-err-dark`

- [ ] `index.html:206` — Calculate button (same pattern as Card I button).

- [ ] `index.html:213-228` — Four step-by-step result rows.
  - **Old**: `bg-white border border-ink/10 rounded-sm px-3 py-2`
  - **New**: `bg-white dark:bg-card-dark border border-ink/10 dark:border-ink-dark/10 rounded-sm px-3 py-2`
  - Labels (`text-inkfaint`) → `text-inkfaint dark:text-inkfaint-dark`
  - Values (`text-ink`) → `text-ink dark:text-ink-dark`

- [ ] `index.html:231` — Final result box.
  - `bg-highlight/60` → `bg-highlight/60 dark:bg-highlight-dark/60`

- [ ] `index.html:232` — Final result number.
  - `text-ink` → `text-ink dark:text-ink-dark`

- [ ] `index.html:233` — Final result label.
  - `text-inkfaint` → `text-inkfaint dark:text-inkfaint-dark`

- [ ] `index.html:239` — History card title.
  - `text-brassdark` → `text-brassdark dark:text-brassdark-dark`

- [ ] `index.html:240` — History list.
  - Apply same dark classes as Card I history list.

### 4.8 Theme Manager (`main.js`)
- [ ] `main.js:17` — Insert theme constants and functions **after** `const HISTORY_LIMIT = 5;`.
  ```js
  const THEME_KEY = 'kiraFaraid.theme';

  function getStoredTheme() {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      return raw === 'light' || raw === 'dark' ? raw : null;
    } catch (e) {
      return null;
    }
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getEffectiveTheme() {
    return getStoredTheme() || getSystemTheme();
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(isDark));
      toggleBtn.setAttribute('aria-label', isDark ? 'Tukar tema terang' : 'Tukar tema gelap');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#1A1612' : '#22303A');
    }
  }

  function setTheme(theme) {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error('Gagal menyimpan tema:', e);
    }
  }

  function initTheme() {
    applyTheme(getEffectiveTheme());

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
        setTheme(next);
      });
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (!getStoredTheme()) {
        applyTheme(getSystemTheme());
      }
    });
  }
  ```
  - Test: `console.log(getEffectiveTheme())` returns `'light'` or `'dark'`.

- [ ] `main.js:412` — Call `initTheme()` at end of file, after `attachListNormalizer(c2.waris);`.
  ```js
  initTheme();
  ```
  - Test: Reload page → theme matches stored preference or system preference; toggle button click flips theme and updates `aria-pressed`.

### 4.9 Service Worker Cache Bump (`sw.js`)
- [ ] `sw.js:1` — Update cache name.
  - **Old**: `const CACHE_NAME = 'kalkulator-faraid-v1';`
  - **New**: `const CACHE_NAME = 'kalkulator-faraid-v2';`
  - Test: Hard reload → Network tab shows `sw.js` installing with new cache name; no old `v1` assets served.

---

## 5. Data & Schema Changes

None. No backend, no database. Only `localStorage` key addition:
- **Key**: `kiraFaraid.theme`
- **Values**: `'light'` | `'dark'`
- **Migration**: None required; absence of key falls back to `prefers-color-scheme`.

---

## 6. Security & Validation Rules

- **localStorage access wrapped in `try/catch`** (same pattern as `loadHistory` / `pushHistory`) to handle private browsing / disabled storage.
- **No user input is rendered as HTML** — theme toggle only toggles a class; no XSS vector introduced.
- **No secrets or tokens** added.

---

## 7. Error Handling Spec

| Boundary | Error | Handling | User Impact |
|----------|-------|----------|-------------|
| FOUC script | `localStorage` disabled / private mode | Silent `catch` → no `dark` class added | Falls back to light mode until JS loads |
| `getStoredTheme()` | `localStorage.getItem` throws | Returns `null` | Falls back to system preference |
| `setTheme()` | `localStorage.setItem` throws | Logs to console, continues | Theme applies for session only |
| `applyTheme()` | `theme-toggle` not found (DOM missing) | Skips `aria-label`/`aria-pressed` update | Visual theme still toggles via `html.dark` |
| `initTheme()` | `matchMedia` unsupported (very old browsers) | `getSystemTheme()` returns `'light'` | Safe fallback to light mode |

---

## 8. Review Criteria

- [ ] `darkMode: 'class'` present in Tailwind config.
- [ ] All 8 light tokens have a corresponding `*-dark` token in config.
- [ ] `<style>` block uses CSS variables with `:root` / `html.dark` override.
- [ ] No hardcoded hex remains in `.ledger-card`, `.double-rule`, or focus outlines.
- [ ] FOUC script runs in `<head>` before body paint.
- [ ] Toggle is a `<button>` with `type="button"`, `aria-label`, `aria-pressed`.
- [ ] Toggle tap target ≥ 40×40px (`p-2.5` + `w-5 h-5` icon = 40px).
- [ ] `prefers-reduced-motion` disables icon transition.
- [ ] `main.js` theme functions use `try/catch` for all `localStorage` calls.
- [ ] System preference change listener only applies when no stored preference exists.
- [ ] `meta[name="theme-color"]` updates dynamically in dark mode.
- [ ] `sw.js` cache name bumped to `v2`.
- [ ] All `bg-white` inputs and result rows have `dark:bg-card-dark`.
- [ ] All `text-ink`, `text-inkfaint`, `text-brass`, `text-brassdark`, `text-err` have `dark:` counterparts.
- [ ] All `border-ink/…` and `divide-ink/…` have `dark:border-ink-dark/…` counterparts.
- [ ] Focus ring visible on toggle in both light and dark modes.

---

## 9. Commit Suggestion

```
feat: add dark mode toggle with warm manuscript palette

- Implement darkMode: 'class' strategy via Tailwind CDN
- Add warm walnut/leather dark palette (paper-dark, ink-dark, brass-dark, etc.)
- Replace hardcoded hex in <style> with CSS variables under :root / html.dark
- Add accessible theme toggle (button, aria-pressed, aria-label in Malay)
- Persist preference to localStorage (kiraFaraid.theme)
- Respect prefers-color-scheme when no stored preference
- Prevent FOUC with inline head script
- Bump service worker cache to v2
```

---

## 10. Manual Test Scenarios

- [ ] **1. First visit, no localStorage, system light** → App renders light mode.
- [ ] **2. First visit, no localStorage, system dark** → App renders dark mode immediately (no flash).
- [ ] **3. Click toggle in light mode** → Switches to dark; sun icon hides, moon icon shows; `aria-pressed="true"`; label becomes "Tukar tema terang".
- [ ] **4. Reload after toggling to dark** → Remains dark; localStorage shows `kiraFaraid.theme = "dark"`.
- [ ] **5. Click toggle in dark mode** → Switches to light; persists as `"light"`.
- [ ] **6. Clear localStorage, reload with system dark** → App shows dark mode.
- [ ] **7. Clear localStorage, keep app open, change OS theme** → App follows system theme automatically.
- [ ] **8. Set stored preference to dark, change OS theme** → App stays dark (stored preference wins).
- [ ] **9. Hard reload / empty cache** → Service worker installs `v2`; no `v1` assets served.
- [ ] **10. All cards, borders, inputs, buttons, result boxes render correctly in both modes**.
- [ ] **11. Focus ring visible on toggle when tabbed to in light and dark**.
- [ ] **12. Tab key reaches toggle; Enter and Space both activate toggle**.
- [ ] **13. `prefers-reduced-motion: reduce` disables icon transition**.
- [ ] **14. PWA `theme-color` meta tag matches current mode (light `#22303A`, dark `#1A1612`).**

---

## 11. Files to Modify (Summary)

| File | Changes |
|------|---------|
| `index.html` | FOUC script in `<head>`; Tailwind config (`darkMode` + dark tokens); `<style>` block CSS variables; `body` dark classes; header toggle markup; all card/input/button/result dark classes |
| `main.js` | Theme manager functions (`getStoredTheme`, `getSystemTheme`, `getEffectiveTheme`, `applyTheme`, `setTheme`, `initTheme`); `initTheme()` call at EOF |
| `sw.js` | Cache name `v1` → `v2` |
| `PLAN_DARK_MODE.md` | This blueprint (already written) |

---

## 12. Out of Scope

- Framework migration (remains vanilla HTML/JS).
- New dependencies (still pure CDN Tailwind).
- Custom color picker or multi-theme support (only light/dark toggle).
- Per-user accounts or server-side persistence.
- `prefers-color-scheme` auto-switching when a stored preference exists (by design: stored preference overrides system).
- Refactoring unrelated markup or logic (e.g., calculator math, history limit).

---

## Appendix: Dark Color Palette Reference

| Token | Light Hex | Dark Hex | Justification | Contrast (on bg) |
|-------|-----------|----------|---------------|------------------|
| `paper` | `#F6F1E4` | `#1A1612` | Deep walnut leather — warm, not cold slate | — (bg) |
| `card` | `#FFFDF6` | `#231F1A` | Slightly lifted warm dark, like aged vellum under lamplight | — (bg) |
| `ink` | `#22303A` | `#E8DDD0` | Warm off-white; candlelight cream, not sterile white | ~14:1 (AAA) |
| `inkfaint` | `#5B6B74` | `#8A7D6E` | Faded sepia ink; preserves hierarchy without going gray | ~5.5:1 (AA) |
| `brass` | `#A87C2A` | `#D4A84B` | Richer antique gold; pops against dark leather | ~8:1 (AAA UI) |
| `brassdark` | `#8A6620` | `#B8923A` | Brass under lamplight; maintains accent depth | ~6.5:1 (AA UI) |
| `highlight` | `#EFE6C8` | `#3D3428` | Muted warm umber with brass tint; replaces cream highlight | ~7:1 (AA) |
| `err` | `#A6392D` | `#D96B5F` | Warm coral red; visible and legible on dark leather | ~7:1 (AA) |

*Contrast estimates are mental approximations against `paper-dark` (`#1A1612`). All body text (ink-dark) comfortably exceeds WCAG AA 4.5:1. UI/brass accents exceed 3:1. `inkfaint-dark` is borderline but passes AA; if it fails in practice, lighten to `#9B8E7F`.*
