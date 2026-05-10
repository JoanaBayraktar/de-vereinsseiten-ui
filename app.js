// ═══════════════════════════════════════════════════
//  VEREINSRADAR — ERKUNDER
//  Einheitliche Tabelle, aufklappbare Zeilen
// ═══════════════════════════════════════════════════

// Score-Schwellwerte für farbliche Bewertung der Treffer-Qualität
const SCORE_HIGH = 70;
const SCORE_MED  = 40;

const DEFAULT_PAGE_SIZE = 50;

const MUNICIPALITY_SOURCES = [
  "gemeinden/gemeinden_webseiten_bawue.json",
  "gemeinden/gemeinden_webseiten_bayern.json",
  "gemeinden/gemeinden_webseiten_berlin.json",
  "gemeinden/gemeinden_webseiten_brandenburg.json",
  "gemeinden/gemeinden_webseiten_bremen.json",
  "gemeinden/gemeinden_webseiten_hamburg.json",
  "gemeinden/gemeinden_webseiten_hessen.json",
  "gemeinden/gemeinden_webseiten_mecklenburg_vorpommern.json",
  "gemeinden/gemeinden_webseiten_niedersachsen.json",
  "gemeinden/gemeinden_webseiten_nordrhein_westfalen.json",
  "gemeinden/gemeinden_webseiten_rheinland_pfalz.json",
  "gemeinden/gemeinden_webseiten_saarland.json",
  "gemeinden/gemeinden_webseiten_sachsen.json",
  "gemeinden/gemeinden_webseiten_sachsen_anhalt.json",
  "gemeinden/gemeinden_webseiten_schleswig_holstein.json",
  "gemeinden/gemeinden_webseiten_thueringen.json",
];
const CLUB_SOURCES = [
  "vereinsseiten/bawue_vereinsseiten.json",
  "vereinsseiten/bayern_vereinsseiten.json",
  "vereinsseiten/brandenburg_vereinsseiten.json",
  "vereinsseiten/saarland_vereinsseiten.json",
  "vereinsseiten/sachsen_vereinsseiten.json",
];

const SEARCH_TERM = "verein";
const EXCLUDED_TITLE_OR_URL_TERMS = [
  "terminvereinbarung","förderverein","foerderverein","mütterverein",
  "muetterverein","turnhalle","hallenbelegung","haus der vereine",
  "hauptversammlung","vereins-news","vereinsraum","festakt","wanderwege",
  "verein melden","vereins-challenges","sicherheitskonzept",
  "förderrichtlinien","foerderrichtlinien","vermietung",
  "vereine - termine", "formular", "Formular", "förder", "Ansprechpartner", "Aktuelles", "News",
];

// ─── STATE ────────────────────────────────────────
const state = {
  municipalities: [],
  selectedState: "",
  expandedRows: new Set(),
  page: 1,
  sourceName: "",
};

// ─── ELEMENT REFS ─────────────────────────────────
const el = {
  searchInput:       document.querySelector("#searchInput"),
  minScoreInput:     document.querySelector("#minScoreInput"),
  sortSelect:        document.querySelector("#sortSelect"),
  pageSizeSelect:    document.querySelector("#pageSizeSelect"),
  withClubsOnly:     document.querySelector("#withClubsOnlyInput"),
  resultStateSelect: document.querySelector("#resultStateSelect"),
  menuButton:        document.querySelector("#menuButton"),
  resetButton:       document.querySelector("#resetButton"),
  fileInput:         document.querySelector("#fileInput"),
  navBackdrop:       document.querySelector("#navBackdrop"),
  stateSidebar:      document.querySelector("#stateSidebar"),
  clearStateButton:  document.querySelector("#clearStateButton"),
  stateProgressList: document.querySelector("#stateProgressList"),
  sourceLabel:       document.querySelector("#sourceLabel"),
  // metrics
  mTotal:    document.querySelector("#mTotal"),
  mVisible:  document.querySelector("#mVisible"),
  mHomepage: document.querySelector("#mHomepage"),
  mClub:     document.querySelector("#mClub"),
  mLinks:    document.querySelector("#mLinks"),
  // results
  summaryText:   document.querySelector("#summaryText"),
  tableBody:     document.querySelector("#tableBody"),
  emptyState:    document.querySelector("#emptyState"),
  paginationTop: document.querySelector("#paginationTop"),
  paginationBot: document.querySelector("#paginationBot"),
  collapseAll:   document.querySelector("#collapseAllBtn"),
};

// ─── UTILS ────────────────────────────────────────
const norm = v => String(v ?? "").toLocaleLowerCase("de-DE");
const normUrl = v => String(v ?? "").trim().replace(/\/$/, "");
const fmt = v => new Intl.NumberFormat("de-DE").format(v);
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
const numOrNull = v => { if (v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const recordKey = e => [e.bundesland || "", e.name || "", normUrl(e.webseite)].join("||");
const getDomain = url => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

// ─── CLUB PAGE LOGIC ───────────────────────────────
function containsVerein(v) { return norm(v).includes(SEARCH_TERM); }
function hasExcludedUrl(url) {
  const n = norm(url);
  return n.includes("veranstaltungskalender") || (n.includes("veranstaltung") && !n.includes("veranstaltungskalender")) || n.includes("event") || n.includes("/veranstaltungen/");
}
function hasExcludedTitleOrUrl(title, url) {
  const txt = `${title ?? ""} ${url ?? ""}`.toLocaleLowerCase("de-DE");
  return EXCLUDED_TITLE_OR_URL_TERMS.some(t => txt.includes(t));
}
function hasDateInTitle(title) {
  const n = norm(title);
  return [/\b\d{1,2}\.\d{1,2}\.(?:\d{2}|\d{4})?/, /\b\d{4}-\d{1,2}-\d{1,2}\b/, /\b\d{1,2}\s*(?:jan|feb|mär|apr|mai|jun|jul|aug|sep|okt|nov|dez)\s*\d{2,4}\b/, /\b(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/].some(r => r.test(n));
}
function shouldExclude(page) {
  const title = page.titel ?? "", url = page.url ?? "";
  const n = norm(title).trim();
  if (!containsVerein(url)) return true;
  if (!n || n === "kein titel" || n === "ohne titel") return true;
  return hasExcludedUrl(url) || hasExcludedTitleOrUrl(title, url) || /\bverein[\s-]+(?:für|fuer)\b/.test(`${n} ${norm(url)}`) || /\bdes\s+.+\s+vereins\b/.test(n) || /(^|[^a-zäöüß])e\s*\.?\s*v\.?($|[^a-zäöüß])/.test(n) || hasDateInTitle(title);
}
function normalizeClubPages(pages) {
  const seen = new Set();
  return (pages || []).filter(p => !shouldExclude(p)).map(p => ({
    titel: p.titel || "Ohne Titel", url: p.url, score: Number(p.score ?? 0),
  })).filter(p => { if (seen.has(p.url)) return false; seen.add(p.url); return true; }).sort((a, b) => b.score - a.score || a.titel.localeCompare(b.titel, "de-DE"));
}

// ─── DATA LOADING ──────────────────────────────────
function makeRecord(e) {
  return { id: recordKey(e), name: e.name, typ: e.typ, bundesland: e.bundesland, webseite: e.webseite, quelle_url: e.quelle_url, vereinsseiten: [] };
}
function mergeData(municipalityData, clubData) {
  const records = new Map();
  for (const e of municipalityData.flat()) { const k = recordKey(e); if (!records.has(k)) records.set(k, makeRecord(e)); }
  for (const e of clubData.flat()) {
    const k = recordKey(e); if (!records.has(k)) records.set(k, makeRecord(e));
    const r = records.get(k);
    r.vereinsseiten = normalizeClubPages([...r.vereinsseiten, ...(e.vereinsseiten || [])]);
  }
  return [...records.values()].sort((a, b) => String(a.bundesland||"").localeCompare(String(b.bundesland||""), "de-DE") || String(a.name||"").localeCompare(String(b.name||""), "de-DE"));
}
async function fetchJson(file) {
  const r = await fetch(encodeURI(file), { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function loadDefaultData() {
  const mSrc = [], cSrc = [];
  for (const f of MUNICIPALITY_SOURCES) { try { mSrc.push(await fetchJson(f)); } catch {} }
  for (const f of CLUB_SOURCES) { try { cSrc.push(await fetchJson(f)); } catch {} }
  state.municipalities = mergeData(mSrc, cSrc);
  state.sourceName = `${mSrc.length} Gemeindelisten · ${cSrc.length} Vereinslisten`;
  el.sourceLabel.textContent = state.sourceName;
  fillStateSelect();
  render();
}

function fillStateSelect() {
  const states = [...new Set(state.municipalities.map(e => e.bundesland).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de-DE"));
  el.resultStateSelect.innerHTML = '<option value="">Alle Bundesländer</option>';
  for (const s of states) {
    const o = document.createElement("option"); o.value = o.textContent = s; el.resultStateSelect.append(o);
  }
}

// ─── FILTERING ────────────────────────────────────
function getFilters() {
  return {
    search: norm(el.searchInput.value.trim()),
    minScore: numOrNull(el.minScoreInput.value),
    selectedState: state.selectedState,
    sort: el.sortSelect.value,
    withClubsOnly: el.withClubsOnly.checked,
    pageSize: Number(el.pageSizeSelect.value) || DEFAULT_PAGE_SIZE,
  };
}

function getMaxScore(e) {
  return Math.max(0, ...(e.vereinsseiten || []).map(p => p.score ?? 0));
}

function getFiltered() {
  const f = getFilters();
  let entries = state.municipalities
    .filter(e => !f.selectedState || e.bundesland === f.selectedState)
    .filter(e => {
      if (!f.search) return true;
      const clubText = (e.vereinsseiten || []).map(p => `${p.titel} ${p.url}`).join(" ");
      return [e.name, e.typ, e.bundesland, e.webseite, clubText].some(v => norm(v).includes(f.search));
    })
    .map(e => {
      const vs = f.minScore !== null
        ? (e.vereinsseiten || []).filter(p => p.score >= f.minScore)
        : [...(e.vereinsseiten || [])];
      return { ...e, visibleLinks: vs };
    })
    .filter(e => !f.withClubsOnly || e.visibleLinks.length > 0);

  // Sort
  if (f.sort === "name") entries.sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
  else if (f.sort === "clubs") entries.sort((a, b) => b.visibleLinks.length - a.visibleLinks.length || a.name.localeCompare(b.name, "de-DE"));
  else if (f.sort === "score") entries.sort((a, b) => getMaxScore(b) - getMaxScore(a) || a.name.localeCompare(b.name, "de-DE"));
  else entries.sort((a, b) => String(a.bundesland||"").localeCompare(String(b.bundesland||""), "de-DE") || a.name.localeCompare(b.name, "de-DE"));

  return entries;
}

// ─── RENDER ───────────────────────────────────────
function render() {
  const filtered = getFiltered();
  const f = getFilters();
  const totalLinks = filtered.reduce((s, e) => s + e.visibleLinks.length, 0);

  // Metrics
  const total = state.municipalities.length;
  const withHome = state.municipalities.filter(e => e.webseite).length;
  const withClub = state.municipalities.filter(e => (e.vereinsseiten||[]).length > 0).length;
  const totalLinksFull = state.municipalities.reduce((s, e) => s + (e.vereinsseiten||[]).length, 0);

  el.mTotal.textContent = fmt(total);
  el.mVisible.textContent = `${fmt(filtered.length)} sichtbar`;
  el.mHomepage.textContent = `${pct(withHome, total)}%`;
  el.mClub.textContent = `${pct(withClub, total)}%`;
  el.mLinks.textContent = fmt(totalLinksFull);

  // Summary
  el.summaryText.textContent = `${fmt(filtered.length)} Gemeinden · ${fmt(totalLinks)} Links`;

  // Sidebar
  renderSidebar();

  // Table
  const pageCount = Math.max(1, Math.ceil(filtered.length / f.pageSize));
  state.page = Math.min(state.page, pageCount);
  const start = (state.page - 1) * f.pageSize;
  const slice = filtered.slice(start, start + f.pageSize);

  if (filtered.length === 0) {
    el.emptyState.hidden = false;
    el.tableBody.innerHTML = "";
  } else {
    el.emptyState.hidden = true;
    el.tableBody.innerHTML = slice.map(e => renderRow(e)).join("");
  }

  renderPagination(filtered.length, f.pageSize);
}

function renderRow(e) {
  const isOpen = state.expandedRows.has(e.id);
  const score = getMaxScore(e);
  const scorePct = Math.min(100, score);
  const scoreColor = score >= SCORE_HIGH ? "var(--green)" : score >= SCORE_MED ? "var(--amber)" : "var(--line-2)";
  const hasHome = Boolean(e.webseite);
  const linkCount = e.visibleLinks.length;

  const expandedHtml = isOpen && linkCount > 0 ? `
    <div class="row-links">
      ${e.visibleLinks.map(p => `
        <div class="link-item">
          <div class="link-item-left">
            <span class="link-title">${esc(p.titel)}</span>
            <a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a>
          </div>
          <div class="link-score">
            <div class="link-score-bar">
              <div class="link-score-fill" style="width:${Math.min(100,p.score)}%;background:${p.score>=SCORE_HIGH?"var(--green)":p.score>=SCORE_MED?"var(--amber)":"var(--muted)"}"></div>
            </div>
            <span class="link-score-num">${p.score}</span>
          </div>
        </div>`).join("")}
    </div>` : "";

  const expandedNoLinks = isOpen && linkCount === 0 ? `<div class="row-no-links">Keine Vereinsseiten gefunden.</div>` : "";

  return `
  <div class="table-row ${isOpen ? "is-open" : ""}" data-id="${esc(e.id)}">
    <div class="row-main" onclick="toggleRow('${esc(e.id)}')">
      <div class="row-toggle">${isOpen ? "▾" : "▸"}</div>
      <div class="row-name">
        <strong>${esc(e.name)}</strong>
        <span class="row-typ">${esc(e.typ || "Gemeinde")}</span>
      </div>
      <div class="row-land">${esc(e.bundesland || "")}</div>
      <div class="row-home">
        ${hasHome
          ? `<a href="${esc(e.webseite)}" target="_blank" rel="noopener" class="home-link" onclick="event.stopPropagation()">${esc(getDomain(e.webseite))}</a>`
          : `<span class="no-entry">–</span>`}
      </div>
      <div class="row-links-count">
        ${linkCount > 0
          ? `<span class="links-badge ${linkCount >= 5 ? "high" : linkCount >= 2 ? "mid" : ""}">${linkCount}</span>`
          : `<span class="links-zero">0</span>`}
      </div>
      <div class="row-score">
        ${score > 0 ? `
          <div class="score-bar-wrap">
            <div class="score-bar-track">
              <div class="score-bar-fill" style="width:${scorePct}%;background:${scoreColor}"></div>
            </div>
            <span class="score-num">${score}</span>
          </div>` : `<span class="no-entry">–</span>`}
      </div>
    </div>
    ${expandedHtml}${expandedNoLinks}
  </div>`;
}

function toggleRow(id) {
  if (state.expandedRows.has(id)) state.expandedRows.delete(id);
  else state.expandedRows.add(id);
  render();
}
window.toggleRow = toggleRow;

// ─── SIDEBAR ──────────────────────────────────────
function renderSidebar() {
  const stats = new Map();
  for (const e of state.municipalities) {
    const k = e.bundesland || "Unbekannt";
    if (!stats.has(k)) stats.set(k, { name: k, total: 0, withHome: 0, withClub: 0 });
    const s = stats.get(k);
    s.total++;
    if (e.webseite) s.withHome++;
    if ((e.vereinsseiten||[]).length > 0) s.withClub++;
  }
  const sorted = [...stats.values()].sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
  el.stateProgressList.innerHTML = sorted.map(s => {
    const active = state.selectedState === s.name;
    const homePct = pct(s.withHome, s.total);
    const clubPct = pct(s.withClub, s.total);
    return `
    <button class="state-btn ${active ? "active" : ""}" type="button" onclick="selectState('${esc(s.name)}')">
      <div class="state-btn-head">
        <span class="state-name">${esc(s.name)}</span>
        <span class="state-count">${fmt(s.total)}</span>
      </div>
      <div class="state-bars">
        <div class="state-bar-row">
          <span>Home</span>
          <div class="sbar-track"><div class="sbar-fill" style="width:${homePct}%"></div></div>
          <span>${homePct}%</span>
        </div>
        <div class="state-bar-row">
          <span>Verein</span>
          <div class="sbar-track green"><div class="sbar-fill green" style="width:${clubPct}%"></div></div>
          <span>${clubPct}%</span>
        </div>
      </div>
    </button>`;
  }).join("");
}

function selectState(name) {
  state.selectedState = state.selectedState === name ? "" : name;
  el.resultStateSelect.value = state.selectedState;
  state.page = 1;
  closeMenu();
  render();
}
window.selectState = selectState;

// ─── PAGINATION ────────────────────────────────────
function renderPagination(totalItems, pageSize) {
  const total = Math.max(1, Math.ceil(totalItems / pageSize));
  const build = target => {
    target.innerHTML = "";
    if (total <= 1) return;
    const btn = (label, page, disabled, active) => {
      const b = document.createElement("button");
      b.textContent = label; b.type = "button";
      if (disabled) b.disabled = true;
      if (active) b.className = "active";
      b.addEventListener("click", () => { state.page = page; render(); document.querySelector(".table-wrap").scrollIntoView({ block: "start", behavior: "smooth" }); });
      return b;
    };
    target.append(btn("‹", state.page - 1, state.page === 1, false));
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - state.page) <= 2) {
        target.append(btn(i, i, false, i === state.page));
      } else if (Math.abs(i - state.page) === 3) {
        const sp = document.createElement("span"); sp.textContent = "…"; sp.className = "page-ellipsis"; target.append(sp);
      }
    }
    target.append(btn("›", state.page + 1, state.page === total, false));
  };
  build(el.paginationTop);
  build(el.paginationBot);
}

// ─── COLLAPSE ALL ─────────────────────────────────
el.collapseAll?.addEventListener("click", () => { state.expandedRows.clear(); render(); });

// ─── MENU (MOBILE) ────────────────────────────────
function openMenu() { document.body.classList.add("nav-open"); el.menuButton.setAttribute("aria-expanded","true"); el.navBackdrop.hidden = false; }
function closeMenu() { document.body.classList.remove("nav-open"); el.menuButton.setAttribute("aria-expanded","false"); el.navBackdrop.hidden = true; }
el.menuButton?.addEventListener("click", () => document.body.classList.contains("nav-open") ? closeMenu() : openMenu());
el.navBackdrop?.addEventListener("click", closeMenu);

// ─── RESET ────────────────────────────────────────
el.resetButton?.addEventListener("click", () => {
  el.searchInput.value = ""; el.minScoreInput.value = "";
  el.sortSelect.value = "state"; el.pageSizeSelect.value = String(DEFAULT_PAGE_SIZE);
  el.resultStateSelect.value = ""; el.withClubsOnly.checked = false;
  state.selectedState = ""; state.page = 1;
  state.expandedRows.clear();
  render();
});

// ─── STATE SELECT SYNC ────────────────────────────
el.clearStateButton?.addEventListener("click", () => { state.selectedState = ""; el.resultStateSelect.value = ""; state.page = 1; render(); });
el.resultStateSelect?.addEventListener("change", () => { state.selectedState = el.resultStateSelect.value; state.page = 1; render(); });

// ─── INPUT EVENTS ─────────────────────────────────
for (const inp of [el.searchInput, el.minScoreInput, el.sortSelect, el.pageSizeSelect, el.withClubsOnly]) {
  inp?.addEventListener("input", () => { state.page = 1; render(); });
  inp?.addEventListener("change", () => { state.page = 1; render(); });
}

// ─── FILE UPLOAD ──────────────────────────────────
el.fileInput?.addEventListener("change", async e => {
  const file = e.target.files?.[0]; if (!file) return;
  const data = JSON.parse(await file.text());
  state.municipalities = mergeData([state.municipalities], [data]);
  state.sourceName = `${state.sourceName} · ${file.name}`;
  el.sourceLabel.textContent = state.sourceName;
  render();
});

// ─── HELPERS ──────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// ─── BOOT ─────────────────────────────────────────
loadDefaultData();
