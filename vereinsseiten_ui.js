const MUNICIPALITY_SOURCES = [
  "gemeinden_webseiten_bawue.json",
  "gemeinden_webseiten_bayern.json",
  "gemeinden_webseiten_berlin.json",
  "gemeinden_webseiten_brandenburg.json",
  "gemeinden_webseiten_bremen.json",
  "gemeinden_webseiten_hamburg.json",
  "gemeinden_webseiten_hessen.json",
  "gemeinden_webseiten_mecklenburg_vorpommern.json",
  "gemeinden_webseiten_niedersachsen.json",
  "gemeinden_webseiten_nordrhein_westfalen.json",
  "gemeinden_webseiten_rheinland_pfalz.json",
  "gemeinden_webseiten_saarland.json",
  "gemeinden_webseiten_sachsen.json",
  "gemeinden_webseiten_sachsen_anhalt.json",
  "gemeinden_webseiten_schleswig_holstein.json",
  "gemeinden_webseiten_thueringen.json",
];
const CLUB_SOURCES = ["vereinsseiten.json", "vereinsseiten_bayern.json", "saarland_vereinsseiten.json", "sachsen_vereinsseiten.json", "hessen_vereinsseiten.json"];
const SEARCH_TERM = "verein";
const EXCLUDED_TITLE_OR_URL_TERMS = [
  "terminvereinbarung",
  "förderverein",
  "foerderverein",
  "mütterverein",
  "muetterverein",
  "turnhalle",
  "hallenbelegung",
  "haus der vereine",
  "hauptversammlung",
  "vereins-news",
  "vereinsraum",
  "festakt",
  "wanderwege",
  "verein melden",
  "vereins-challenges",
  "sicherheitskonzept",
  "förderrichtlinien",
  "foerderrichtlinien",
  "vermietung",
  "vereine - termine",
];

const state = {
  municipalities: [],
  activeTab: "clubs",
  selectedState: "",
  expandedGroups: new Set(),
  allGroupsOpen: true,
  page: 1,
  sourceName: "",
};

const elements = {
  sourceLabel: document.querySelector("#sourceLabel"),
  fileInput: document.querySelector("#fileInput"),
  resetButton: document.querySelector("#resetButton"),
  menuButton: document.querySelector("#menuButton"),
  stateSidebar: document.querySelector("#stateSidebar"),
  navBackdrop: document.querySelector("#navBackdrop"),
  searchInput: document.querySelector("#searchInput"),
  minScoreInput: document.querySelector("#minScoreInput"),
  sortSelect: document.querySelector("#sortSelect"),
  pageSizeSelect: document.querySelector("#pageSizeSelect"),
  resultStateSelect: document.querySelector("#resultStateSelect"),
  withClubsOnlyInput: document.querySelector("#withClubsOnlyInput"),
  expandGroupsButton: document.querySelector("#expandGroupsButton"),
  clearStateButton: document.querySelector("#clearStateButton"),
  municipalityMetric: document.querySelector("#municipalityMetric"),
  municipalitySubMetric: document.querySelector("#municipalitySubMetric"),
  homepageMetric: document.querySelector("#homepageMetric"),
  homepageSubMetric: document.querySelector("#homepageSubMetric"),
  clubCoverageMetric: document.querySelector("#clubCoverageMetric"),
  clubCoverageSubMetric: document.querySelector("#clubCoverageSubMetric"),
  clubLinkMetric: document.querySelector("#clubLinkMetric"),
  clubLinkSubMetric: document.querySelector("#clubLinkSubMetric"),
  activeTabLabel: document.querySelector("#activeTabLabel"),
  resultsTitle: document.querySelector("#resultsTitle"),
  summaryText: document.querySelector("#summaryText"),
  stateProgressList: document.querySelector("#stateProgressList"),
  resultsList: document.querySelector("#resultsList"),
  emptyState: document.querySelector("#emptyState"),
  paginationTop: document.querySelector("#paginationTop"),
  paginationBottom: document.querySelector("#paginationBottom"),
};

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("de-DE");
}

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function recordKey(entry) {
  return [entry.bundesland || "", entry.name || "", normalizeUrl(entry.webseite)].join("||");
}

function containsVerein(value) {
  return normalize(value).includes(SEARCH_TERM);
}

function numberOrNull(value) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

async function fetchJson(fileName) {
  const response = await fetch(encodeURI(fileName), { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function hasExcludedUrlTerm(url) {
  const normalizedUrl = normalize(url);
  return (
    normalizedUrl.includes("veranstaltungskalender") ||
    (normalizedUrl.includes("veranstaltung") && !normalizedUrl.includes("veranstaltungskalender")) ||
    normalizedUrl.includes("event") ||
    normalizedUrl.includes("/veranstaltungen/")
  );
}

function hasExcludedTitleOrUrlTerm(title, url) {
  const combinedText = `${title ?? ""} ${url ?? ""}`.toLocaleLowerCase("de-DE");
  return EXCLUDED_TITLE_OR_URL_TERMS.some((term) => combinedText.includes(term));
}

function hasDateInTitle(title) {
  const normalizedTitle = normalize(title);
  const datePatterns = [
    /\b\d{1,2}\.\d{1,2}\.(?:\d{2}|\d{4})?/,
    /\b\d{4}-\d{1,2}-\d{1,2}\b/,
    /\b\d{1,2}\s*(?:jan|januar|feb|februar|mär|maerz|märz|apr|april|mai|jun|juni|jul|juli|aug|august|sep|sept|september|okt|oktober|nov|november|dez|dezember)\s*\d{2,4}\b/,
    /\b(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/,
  ];
  return datePatterns.some((pattern) => pattern.test(normalizedTitle));
}

function shouldExcludeClubPage(page) {
  const title = page.titel ?? "";
  const url = page.url ?? "";
  const normalizedTitle = normalize(title).trim();

  if (!containsVerein(url)) return true;
  if (!normalizedTitle || normalizedTitle === "kein titel" || normalizedTitle === "ohne titel") return true;

  return (
    hasExcludedUrlTerm(url) ||
    hasExcludedTitleOrUrlTerm(title, url) ||
    /\bverein[\s-]+(?:für|fuer)\b/.test(`${normalizedTitle} ${normalize(url)}`) ||
    /\bdes\s+.+\s+vereins\b/.test(normalizedTitle) ||
    /(^|[^a-zäöüß])e\s*\.?\s*v\.?($|[^a-zäöüß])/.test(normalizedTitle) ||
    hasDateInTitle(title)
  );
}

function normalizeClubPages(pages) {
  const seen = new Set();
  return (pages || [])
    .filter((page) => !shouldExcludeClubPage(page))
    .map((page) => ({
      titel: page.titel || "Ohne Titel",
      url: page.url,
      score: Number(page.score ?? 0),
      titel_enthaelt_verein: Boolean(page.titel_enthaelt_verein ?? containsVerein(page.titel)),
    }))
    .filter((page) => {
      if (seen.has(page.url)) return false;
      seen.add(page.url);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.titel.localeCompare(b.titel, "de-DE"));
}

function makeMunicipalityRecord(entry) {
  return {
    id: recordKey(entry),
    name: entry.name,
    typ: entry.typ,
    bundesland: entry.bundesland,
    webseite: entry.webseite,
    quelle_url: entry.quelle_url,
    vereinsseiten: [],
  };
}

function mergeData(municipalityData, clubData) {
  const records = new Map();

  for (const entry of municipalityData.flat()) {
    const key = recordKey(entry);
    if (!records.has(key)) records.set(key, makeMunicipalityRecord(entry));
  }

  for (const entry of clubData.flat()) {
    const key = recordKey(entry);
    if (!records.has(key)) records.set(key, makeMunicipalityRecord(entry));
    const record = records.get(key);
    record.vereinsseiten = normalizeClubPages([...(record.vereinsseiten || []), ...(entry.vereinsseiten || [])]);
  }

  return sortMunicipalities([...records.values()], "state");
}

async function loadDefaultData() {
  const municipalitySources = [];
  const clubSources = [];

  for (const fileName of MUNICIPALITY_SOURCES) {
    try {
      municipalitySources.push(await fetchJson(fileName));
    } catch {
      // Optional source for local/dev builds.
    }
  }

  for (const fileName of CLUB_SOURCES) {
    try {
      clubSources.push(await fetchJson(fileName));
    } catch {
      // Optional source while scraping is still running.
    }
  }

  state.municipalities = mergeData(municipalitySources, clubSources);
  state.sourceName = `${municipalitySources.length} Gemeindelisten · ${clubSources.length} Vereinslisten`;
  elements.sourceLabel.textContent = state.sourceName;
  fillStateSelect();
  render();
}

function fillStateSelect() {
  const states = [...new Set(state.municipalities.map((entry) => entry.bundesland).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "de-DE")
  );

  elements.resultStateSelect.innerHTML = '<option value="">Alle</option>';
  for (const stateName of states) {
    const option = document.createElement("option");
    option.value = stateName;
    option.textContent = stateName;
    elements.resultStateSelect.append(option);
  }
}

function getFilters() {
  return {
    search: normalize(elements.searchInput.value.trim()),
    minScore: numberOrNull(elements.minScoreInput.value),
    state: state.selectedState,
    sort: elements.sortSelect.value,
    withClubsOnly: elements.withClubsOnlyInput.checked,
  };
}

function getPageSize() {
  const size = Number(elements.pageSizeSelect.value);
  return Number.isFinite(size) ? size : 50;
}

function municipalityMatchesSearch(entry, search) {
  if (!search) return true;
  const clubText = (entry.vereinsseiten || []).map((page) => `${page.titel} ${page.url}`).join(" ");
  return [entry.name, entry.typ, entry.bundesland, entry.webseite, clubText].some((value) =>
    normalize(value).includes(search)
  );
}

function filteredClubPages(entry, filters) {
  return (entry.vereinsseiten || []).filter((page) => {
    if (filters.minScore !== null && Number(page.score ?? 0) < filters.minScore) return false;
    if (filters.search && !normalize(`${entry.name} ${entry.bundesland} ${page.titel} ${page.url}`).includes(filters.search)) {
      return false;
    }
    return true;
  });
}

function getFilteredMunicipalities() {
  const filters = getFilters();
  const filtered = state.municipalities
    .filter((entry) => !filters.state || entry.bundesland === filters.state)
    .filter((entry) => municipalityMatchesSearch(entry, filters.search))
    .map((entry) => ({ ...entry, visibleVereinsseiten: filteredClubPages(entry, filters) }))
    .filter((entry) => !filters.withClubsOnly || entry.visibleVereinsseiten.length > 0);

  return sortMunicipalities(filtered, filters.sort);
}

function sortMunicipalities(entries, sortMode) {
  const sorted = [...entries];
  if (sortMode === "clubs") {
    return sorted.sort((a, b) => (b.visibleVereinsseiten || b.vereinsseiten || []).length - (a.visibleVereinsseiten || a.vereinsseiten || []).length || a.name.localeCompare(b.name, "de-DE"));
  }
  if (sortMode === "score") {
    return sorted.sort((a, b) => getMaxScore(b) - getMaxScore(a) || a.name.localeCompare(b.name, "de-DE"));
  }
  if (sortMode === "name") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
  }
  return sorted.sort((a, b) => String(a.bundesland || "").localeCompare(String(b.bundesland || ""), "de-DE") || String(a.name || "").localeCompare(String(b.name || ""), "de-DE"));
}

function getMaxScore(entry) {
  return Math.max(0, ...(entry.visibleVereinsseiten || entry.vereinsseiten || []).map((page) => Number(page.score ?? 0)));
}

function getStateStats() {
  const stats = new Map();
  for (const entry of state.municipalities) {
    const key = entry.bundesland || "Unbekannt";
    if (!stats.has(key)) {
      stats.set(key, { name: key, total: 0, withHomepage: 0, withClub: 0, clubLinks: 0 });
    }
    const stat = stats.get(key);
    stat.total += 1;
    if (entry.webseite) stat.withHomepage += 1;
    if ((entry.vereinsseiten || []).length > 0) stat.withClub += 1;
    stat.clubLinks += (entry.vereinsseiten || []).length;
  }
  return [...stats.values()].sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
}

function render() {
  const filtered = getFilteredMunicipalities();
  const pageCount = Math.max(1, Math.ceil(getResultCount(filtered) / getPageSize()));
  state.page = Math.min(state.page, pageCount);

  renderMetrics(filtered);
  renderStateSidebar();
  renderResults(filtered);
  syncTabButtons();
  elements.expandGroupsButton.hidden = state.activeTab !== "clubs";
  elements.expandGroupsButton.textContent = state.allGroupsOpen ? "Ergebnisse einklappen" : "Ergebnisse ausklappen";
}

function renderMetrics(filtered) {
  const total = state.municipalities.length;
  const withHomepage = state.municipalities.filter((entry) => entry.webseite).length;
  const withClub = state.municipalities.filter((entry) => (entry.vereinsseiten || []).length > 0).length;
  const totalClubLinks = state.municipalities.reduce((sum, entry) => sum + (entry.vereinsseiten || []).length, 0);
  const visibleClubLinks = filtered.reduce((sum, entry) => sum + (entry.visibleVereinsseiten || []).length, 0);

  elements.municipalityMetric.textContent = formatNumber(total);
  elements.municipalitySubMetric.textContent = `${formatNumber(filtered.length)} sichtbar`;
  elements.homepageMetric.textContent = `${percent(withHomepage, total)}%`;
  elements.homepageSubMetric.textContent = `${formatNumber(withHomepage)} von ${formatNumber(total)}`;
  elements.clubCoverageMetric.textContent = `${percent(withClub, total)}%`;
  elements.clubCoverageSubMetric.textContent = `${formatNumber(withClub)} Gemeinden`;
  elements.clubLinkMetric.textContent = formatNumber(totalClubLinks);
  elements.clubLinkSubMetric.textContent = `${formatNumber(visibleClubLinks)} sichtbar`;
}

function renderStateSidebar() {
  elements.stateProgressList.replaceChildren();
  for (const stat of getStateStats()) {
    const button = document.createElement("button");
    button.className = `state-button ${state.selectedState === stat.name ? "active" : ""}`;
    button.type = "button";
    button.append(createStateHead(stat), createStateProgress(stat));
    button.addEventListener("click", () => {
      state.selectedState = state.selectedState === stat.name ? "" : stat.name;
      elements.resultStateSelect.value = state.selectedState;
      state.page = 1;
      closeMenu();
      render();
    });
    elements.stateProgressList.append(button);
  }
}

function createStateHead(stat) {
  const head = document.createElement("div");
  head.className = "state-button-head";
  const title = document.createElement("h3");
  title.textContent = stat.name;
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = formatNumber(stat.total);
  head.append(title, pill);
  return head;
}

function createStateProgress(stat) {
  const wrap = document.createElement("div");
  wrap.className = "state-progress";
  wrap.append(createProgressLine("Home", percent(stat.withHomepage, stat.total), false));
  wrap.append(createProgressLine("Verein", percent(stat.withClub, stat.total), true));
  return wrap;
}

function createProgressLine(label, value, green) {
  const row = document.createElement("div");
  row.className = "state-progress-line";
  row.innerHTML = `<span>${label}</span><div class="state-track"><div class="state-fill ${green ? "green" : ""}" style="width:${value}%"></div></div><strong>${value}%</strong>`;
  return row;
}

function getResultCount(entries) {
  if (state.activeTab === "clubs") return entries.filter((entry) => entry.visibleVereinsseiten.length > 0).length;
  return entries.length;
}

function paginate(items) {
  const pageSize = getPageSize();
  const start = (state.page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function renderResults(entries) {
  elements.resultsList.replaceChildren();
  elements.activeTabLabel.textContent = tabLabel(state.activeTab);
  elements.resultsTitle.textContent = state.selectedState || "Alle Bundeslaender";

  if (state.activeTab === "clubs") renderClubResults(entries);
  if (state.activeTab === "homepages") renderHomepageResults(entries);
  if (state.activeTab === "municipalities") renderMunicipalityResults(entries);
}

function renderClubResults(entries) {
  const groups = entries.filter((entry) => entry.visibleVereinsseiten.length > 0);
  const totalLinks = groups.reduce((sum, entry) => sum + entry.visibleVereinsseiten.length, 0);
  elements.summaryText.textContent = `${formatNumber(groups.length)} Gemeinden · ${formatNumber(totalLinks)} Links`;
  elements.emptyState.hidden = groups.length > 0;
  renderPagination(groups.length);
  for (const entry of paginate(groups)) elements.resultsList.append(createClubGroup(entry));
}

function createClubGroup(entry) {
  const group = document.createElement("article");
  const isOpen = state.allGroupsOpen || state.expandedGroups.has(entry.id);
  group.className = `club-group ${isOpen ? "open" : ""}`;
  const head = document.createElement("button");
  head.className = "club-group-head";
  head.type = "button";
  const maxScore = getMaxScore(entry);
  head.innerHTML = `<span class="club-group-title"><strong>${entry.name}</strong><span>${entry.typ || "Gemeinde"} · ${entry.bundesland} · ${entry.webseite || "keine Homepage"}</span></span><span class="pill ${scoreTone(maxScore)}">${entry.visibleVereinsseiten.length} Links</span><span class="pill group-score">Score ${maxScore}</span>`;
  head.addEventListener("click", () => toggleGroup(entry.id));
  const body = document.createElement("div");
  body.className = "club-group-body";
  for (const page of entry.visibleVereinsseiten) body.append(createClubRow(page));
  group.append(head, body);
  return group;
}

function createClubRow(page) {
  const row = document.createElement("div");
  row.className = "club-row";
  const score = Math.max(0, Math.min(100, Number(page.score ?? 0)));
  row.innerHTML = `<div class="club-link-cell"><strong>${page.titel}</strong><a href="${page.url}" target="_blank" rel="noopener noreferrer">${page.url}</a></div><div class="score-block"><div class="score-top"><span>Score</span><strong>${page.score ?? "-"}</strong></div><div class="score-track"><div class="score-fill" style="width:${score}%"></div></div></div>`;
  return row;
}

function scoreTone(score) {
  if (score >= 70) return "green";
  if (score >= 40) return "orange";
  return "";
}

function renderHomepageResults(entries) {
  const rows = entries.filter((entry) => entry.webseite);
  elements.summaryText.textContent = `${formatNumber(rows.length)} Homepages`;
  elements.emptyState.hidden = rows.length > 0;
  renderPagination(rows.length);
  const table = document.createElement("div");
  table.className = "homepage-table";
  for (const entry of paginate(rows)) table.append(createHomepageRow(entry));
  elements.resultsList.append(table);
}

function createHomepageRow(entry) {
  const row = document.createElement("article");
  row.className = "homepage-row";
  row.innerHTML = `<div><strong>${entry.name}</strong><span class="muted-line">${entry.typ || "Gemeinde"} · ${entry.bundesland}</span></div><a href="${entry.webseite}" target="_blank" rel="noopener noreferrer">${entry.webseite}</a><div><span class="pill ${entry.visibleVereinsseiten.length ? "green" : "orange"}">${entry.visibleVereinsseiten.length ? "Vereinsseite" : "offen"}</span></div>`;
  return row;
}

function renderMunicipalityResults(entries) {
  elements.summaryText.textContent = `${formatNumber(entries.length)} Gemeinden`;
  elements.emptyState.hidden = entries.length > 0;
  renderPagination(entries.length);
  const grid = document.createElement("div");
  grid.className = "municipality-grid";
  for (const entry of paginate(entries)) grid.append(createMunicipalityCard(entry));
  elements.resultsList.append(grid);
}

function createMunicipalityCard(entry) {
  const card = document.createElement("article");
  card.className = "municipality-card";
  card.innerHTML = `<h3>${entry.name}</h3><span class="muted-line">${entry.typ || "Gemeinde"} · ${entry.bundesland}</span><div class="card-stat-row"><span class="pill ${entry.webseite ? "green" : "orange"}">${entry.webseite ? "Homepage" : "keine Homepage"}</span><span class="pill blue">${entry.visibleVereinsseiten.length} Vereinslinks</span><span class="pill">Score ${getMaxScore(entry)}</span></div>${entry.webseite ? `<a href="${entry.webseite}" target="_blank" rel="noopener noreferrer">${entry.webseite}</a>` : ""}`;
  return card;
}

function renderPagination(totalItems) {
  const pageCount = Math.max(1, Math.ceil(totalItems / getPageSize()));
  const renderTarget = (target) => {
    target.replaceChildren();
    if (pageCount <= 1) return;
    for (let page = 1; page <= pageCount; page++) {
      if (pageCount > 9 && page !== 1 && page !== pageCount && Math.abs(page - state.page) > 1) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = page === state.page ? "active" : "";
      button.textContent = page;
      button.addEventListener("click", () => {
        state.page = page;
        render();
        document.querySelector(".results-card").scrollIntoView({ block: "start" });
      });
      target.append(button);
    }
  };
  renderTarget(elements.paginationTop);
  renderTarget(elements.paginationBottom);
}

function toggleGroup(id) {
  if (state.expandedGroups.has(id)) state.expandedGroups.delete(id);
  else state.expandedGroups.add(id);
  render();
}

function tabLabel(tab) {
  if (tab === "homepages") return "Gemeindeseiten";
  if (tab === "municipalities") return "Gemeinden";
  return "Vereine";
}

function setActiveTab(tab) {
  state.activeTab = tab;
  state.page = 1;
  render();
}

function syncTabButtons() {
  for (const button of document.querySelectorAll("[data-tab-target]")) {
    button.classList.toggle("active", button.dataset.tabTarget === state.activeTab);
  }
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.minScoreInput.value = "";
  elements.sortSelect.value = "state";
  elements.pageSizeSelect.value = "50";
  elements.resultStateSelect.value = "";
  elements.withClubsOnlyInput.checked = false;
  state.selectedState = "";
  state.page = 1;
  render();
}

function openMenu() {
  document.body.classList.add("nav-open");
  elements.menuButton.setAttribute("aria-expanded", "true");
  elements.navBackdrop.hidden = false;
}

function closeMenu() {
  document.body.classList.remove("nav-open");
  elements.menuButton.setAttribute("aria-expanded", "false");
  elements.navBackdrop.hidden = true;
}

function toggleMenu() {
  document.body.classList.contains("nav-open") ? closeMenu() : openMenu();
}

elements.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const uploadedClubData = JSON.parse(await file.text());
  state.municipalities = mergeData([state.municipalities], [uploadedClubData]);
  state.sourceName = `${state.sourceName} · ${file.name}`;
  elements.sourceLabel.textContent = state.sourceName;
  render();
});

elements.resetButton.addEventListener("click", resetFilters);
elements.clearStateButton.addEventListener("click", () => {
  state.selectedState = "";
  elements.resultStateSelect.value = "";
  state.page = 1;
  render();
});
elements.menuButton.addEventListener("click", toggleMenu);
elements.navBackdrop.addEventListener("click", closeMenu);
elements.expandGroupsButton.addEventListener("click", () => {
  state.allGroupsOpen = !state.allGroupsOpen;
  state.expandedGroups.clear();
  render();
});

for (const button of document.querySelectorAll("[data-tab-target]")) {
  button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
}

elements.resultStateSelect.addEventListener("change", () => {
  state.selectedState = elements.resultStateSelect.value;
  state.page = 1;
  render();
});

for (const input of [
  elements.searchInput,
  elements.minScoreInput,
  elements.sortSelect,
  elements.pageSizeSelect,
  elements.withClubsOnlyInput,
]) {
  input.addEventListener("input", () => {
    state.page = 1;
    render();
  });
  input.addEventListener("change", () => {
    state.page = 1;
    render();
  });
}

loadDefaultData();
