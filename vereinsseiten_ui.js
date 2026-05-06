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

const CLUB_SOURCES = ["vereinsseiten.json", "vereinsseiten_bayern.json"];
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
  selectedMunicipality: "",
  sourceName: "",
};

const elements = {
  sourceLabel: document.querySelector("#sourceLabel"),
  fileInput: document.querySelector("#fileInput"),
  resetButton: document.querySelector("#resetButton"),
  menuButton: document.querySelector("#menuButton"),
  sideNav: document.querySelector("#sideNav"),
  navBackdrop: document.querySelector("#navBackdrop"),
  searchInput: document.querySelector("#searchInput"),
  minScoreInput: document.querySelector("#minScoreInput"),
  stateSelect: document.querySelector("#stateSelect"),
  sortSelect: document.querySelector("#sortSelect"),
  withClubsOnlyInput: document.querySelector("#withClubsOnlyInput"),
  municipalityMetric: document.querySelector("#municipalityMetric"),
  municipalitySubMetric: document.querySelector("#municipalitySubMetric"),
  homepageMetric: document.querySelector("#homepageMetric"),
  homepageSubMetric: document.querySelector("#homepageSubMetric"),
  clubCoverageMetric: document.querySelector("#clubCoverageMetric"),
  clubCoverageSubMetric: document.querySelector("#clubCoverageSubMetric"),
  clubLinkMetric: document.querySelector("#clubLinkMetric"),
  clubLinkSubMetric: document.querySelector("#clubLinkSubMetric"),
  progressSummary: document.querySelector("#progressSummary"),
  stateProgressList: document.querySelector("#stateProgressList"),
  summaryText: document.querySelector("#summaryText"),
  selectedText: document.querySelector("#selectedText"),
  activeTabLabel: document.querySelector("#activeTabLabel"),
  allButton: document.querySelector("#allButton"),
  municipalityList: document.querySelector("#municipalityList"),
  resultsList: document.querySelector("#resultsList"),
  emptyState: document.querySelector("#emptyState"),
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
    if (!records.has(key)) {
      records.set(key, makeMunicipalityRecord(entry));
    }
  }

  for (const entry of clubData.flat()) {
    const key = recordKey(entry);
    if (!records.has(key)) {
      records.set(key, makeMunicipalityRecord(entry));
    }

    const record = records.get(key);
    record.vereinsseiten = normalizeClubPages([...(record.vereinsseiten || []), ...(entry.vereinsseiten || [])]);
  }

  return [...records.values()].sort((a, b) => {
    return (
      String(a.bundesland || "").localeCompare(String(b.bundesland || ""), "de-DE") ||
      String(a.name || "").localeCompare(String(b.name || ""), "de-DE")
    );
  });
}

async function loadDefaultData() {
  const municipalitySources = [];
  const clubSources = [];

  for (const fileName of MUNICIPALITY_SOURCES) {
    try {
      municipalitySources.push(await fetchJson(fileName));
    } catch {
      // Missing state files are ignored so local development remains easy.
    }
  }

  for (const fileName of CLUB_SOURCES) {
    try {
      clubSources.push(await fetchJson(fileName));
    } catch {
      // Missing club files are ignored.
    }
  }

  state.municipalities = mergeData(municipalitySources, clubSources);
  state.sourceName = `${municipalitySources.length} Gemeindelisten, ${clubSources.length} Vereinslisten`;
  elements.sourceLabel.textContent = state.sourceName;
  fillStateSelect();
  render();
}

function fillStateSelect() {
  const states = [...new Set(state.municipalities.map((entry) => entry.bundesland).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "de-DE")
  );

  elements.stateSelect.innerHTML = '<option value="">Alle</option>';
  for (const stateName of states) {
    const option = document.createElement("option");
    option.value = stateName;
    option.textContent = stateName;
    elements.stateSelect.append(option);
  }
}

function getFilters() {
  return {
    search: normalize(elements.searchInput.value.trim()),
    minScore: numberOrNull(elements.minScoreInput.value),
    bundesland: elements.stateSelect.value,
    sort: elements.sortSelect.value,
    withClubsOnly: elements.withClubsOnlyInput.checked,
  };
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

function getFilteredMunicipalities({ ignoreSelection = false } = {}) {
  const filters = getFilters();

  const filtered = state.municipalities
    .filter((entry) => ignoreSelection || !state.selectedMunicipality || entry.id === state.selectedMunicipality)
    .filter((entry) => !filters.bundesland || entry.bundesland === filters.bundesland)
    .filter((entry) => municipalityMatchesSearch(entry, filters.search))
    .map((entry) => ({ ...entry, visibleVereinsseiten: filteredClubPages(entry, filters) }))
    .filter((entry) => !filters.withClubsOnly || entry.visibleVereinsseiten.length > 0);

  return sortMunicipalities(filtered, filters.sort);
}

function sortMunicipalities(entries, sortMode) {
  const sorted = [...entries];

  if (sortMode === "clubs") {
    return sorted.sort((a, b) => b.visibleVereinsseiten.length - a.visibleVereinsseiten.length || a.name.localeCompare(b.name, "de-DE"));
  }

  if (sortMode === "score") {
    return sorted.sort((a, b) => getMaxScore(b) - getMaxScore(a) || a.name.localeCompare(b.name, "de-DE"));
  }

  if (sortMode === "name") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
  }

  return sorted.sort((a, b) => {
    return (
      String(a.bundesland || "").localeCompare(String(b.bundesland || ""), "de-DE") ||
      String(a.name || "").localeCompare(String(b.name || ""), "de-DE")
    );
  });
}

function getMaxScore(entry) {
  return Math.max(0, ...(entry.visibleVereinsseiten || entry.vereinsseiten || []).map((page) => Number(page.score ?? 0)));
}

function getStateStats() {
  const stats = new Map();

  for (const entry of state.municipalities) {
    const key = entry.bundesland || "Unbekannt";
    if (!stats.has(key)) {
      stats.set(key, {
        name: key,
        total: 0,
        withHomepage: 0,
        withClub: 0,
        clubLinks: 0,
      });
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
  renderMetrics(filtered);
  renderStateProgress();
  renderMunicipalityList(getFilteredMunicipalities({ ignoreSelection: true }));
  renderResults(filtered);
  syncTabButtons();
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

function renderStateProgress() {
  const stats = getStateStats();
  const selectedState = elements.stateSelect.value;
  const visibleStats = selectedState ? stats.filter((item) => item.name === selectedState) : stats;

  elements.progressSummary.textContent = `${formatNumber(visibleStats.length)} Bundeslaender`;
  elements.stateProgressList.replaceChildren();

  for (const stat of visibleStats) {
    const card = document.createElement("article");
    card.className = "state-card";

    const head = document.createElement("div");
    head.className = "state-card-head";
    const title = document.createElement("h3");
    title.textContent = stat.name;
    const count = document.createElement("span");
    count.className = "count-pill";
    count.textContent = `${formatNumber(stat.total)} Gemeinden`;
    head.append(title, count);

    const progress = document.createElement("div");
    progress.className = "progress-stack";
    progress.append(
      createProgressRow("Homepages", stat.withHomepage, stat.total, "orange"),
      createProgressRow("Vereinsseiten", stat.withClub, stat.total, "green")
    );

    const meta = document.createElement("div");
    meta.className = "state-card-meta";
    meta.innerHTML = `<span>${formatNumber(stat.clubLinks)} Vereinslinks</span><span>${percent(stat.withClub, stat.total)}% Trefferquote</span>`;

    card.append(head, progress, meta);
    elements.stateProgressList.append(card);
  }
}

function createProgressRow(label, value, total, color) {
  const row = document.createElement("div");
  row.className = "progress-row";

  const text = document.createElement("span");
  text.textContent = label;

  const track = document.createElement("div");
  track.className = "progress-track";
  const fill = document.createElement("div");
  fill.className = `progress-fill ${color === "green" ? "green" : ""}`;
  fill.style.width = `${percent(value, total)}%`;
  track.append(fill);

  const percentText = document.createElement("strong");
  percentText.textContent = `${percent(value, total)}%`;

  row.append(text, track, percentText);
  return row;
}

function renderMunicipalityList(entries) {
  elements.municipalityList.replaceChildren();

  for (const entry of entries) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = entry.id === state.selectedMunicipality ? "active" : "";
    button.title = entry.name;

    const labelWrap = document.createElement("span");
    const label = document.createElement("span");
    label.className = "municipality-name";
    label.textContent = entry.name;
    const subline = document.createElement("span");
    subline.className = "municipality-subline";
    subline.textContent = `${entry.bundesland || "Unbekannt"} · ${entry.webseite ? "Homepage" : "keine Homepage"}`;
    labelWrap.append(label, subline);

    const pill = document.createElement("span");
    pill.className = "count-pill";
    pill.textContent = (entry.visibleVereinsseiten || []).length;

    button.append(labelWrap, pill);
    button.addEventListener("click", () => {
      state.selectedMunicipality = entry.id;
      closeMenu();
      render();
      document.querySelector("#results").scrollIntoView({ block: "start" });
    });

    item.append(button);
    elements.municipalityList.append(item);
  }
}

function renderResults(entries) {
  elements.resultsList.replaceChildren();
  elements.selectedText.textContent =
    state.municipalities.find((entry) => entry.id === state.selectedMunicipality)?.name || "Alle Gemeinden";
  elements.activeTabLabel.textContent = tabLabel(state.activeTab);

  if (state.activeTab === "clubs") {
    renderClubResults(entries);
  } else if (state.activeTab === "homepages") {
    renderHomepageResults(entries);
  } else {
    renderMunicipalityResults(entries);
  }
}

function renderClubResults(entries) {
  const rows = entries.flatMap((entry) => (entry.visibleVereinsseiten || []).map((page) => ({ entry, page })));
  elements.summaryText.textContent = `${formatNumber(rows.length)} Vereinslinks`;
  elements.emptyState.hidden = rows.length > 0;

  for (const { entry, page } of rows) {
    elements.resultsList.append(createClubRow(entry, page));
  }
}

function renderHomepageResults(entries) {
  const rows = entries.filter((entry) => entry.webseite);
  elements.summaryText.textContent = `${formatNumber(rows.length)} Homepages`;
  elements.emptyState.hidden = rows.length > 0;

  for (const entry of rows) {
    elements.resultsList.append(createHomepageRow(entry));
  }
}

function renderMunicipalityResults(entries) {
  elements.summaryText.textContent = `${formatNumber(entries.length)} Gemeinden`;
  elements.emptyState.hidden = entries.length > 0;

  for (const entry of entries) {
    elements.resultsList.append(createMunicipalityRow(entry));
  }
}

function createClubRow(entry, page) {
  return createResultRow({
    entry,
    title: page.titel,
    url: page.url,
    meta: [
      [`Score ${page.score ?? "-"}`, "score-pill"],
      [entry.bundesland, "state-pill"],
      [page.titel_enthaelt_verein ? "Titel" : "URL", "title-pill"],
    ],
  });
}

function createHomepageRow(entry) {
  return createResultRow({
    entry,
    title: entry.webseite ? "Gemeindehomepage" : "Keine Homepage",
    url: entry.webseite,
    meta: [
      [entry.bundesland, "state-pill"],
      [entry.webseite ? "erfasst" : "fehlt", entry.webseite ? "status-pill green" : "status-pill orange"],
    ],
  });
}

function createMunicipalityRow(entry) {
  return createResultRow({
    entry,
    title: `${entry.name} (${entry.typ || "Typ unbekannt"})`,
    url: entry.webseite,
    meta: [
      [entry.bundesland, "state-pill"],
      [`${(entry.visibleVereinsseiten || []).length} Vereinslinks`, "count-pill"],
      [entry.webseite ? "Homepage" : "keine Homepage", entry.webseite ? "status-pill green" : "status-pill orange"],
    ],
  });
}

function createResultRow({ entry, title, url, meta }) {
  const row = document.createElement("article");
  row.className = "result-row";

  const location = document.createElement("div");
  location.className = "result-location";
  const name = document.createElement("strong");
  name.textContent = entry.name || "Unbekannte Gemeinde";
  const details = document.createElement("span");
  details.textContent = [entry.typ, entry.bundesland].filter(Boolean).join(" · ");
  location.append(name, details);

  const content = document.createElement("div");
  const titleNode = document.createElement("span");
  titleNode.className = "result-title";
  titleNode.textContent = title || "Ohne Titel";
  content.append(titleNode);

  if (url) {
    const link = document.createElement("a");
    link.className = "result-url";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = url;
    content.append(link);
  }

  const metaNode = document.createElement("div");
  metaNode.className = "result-meta";
  for (const [text, className] of meta.filter(([value]) => value)) {
    const pill = document.createElement("span");
    pill.className = className;
    pill.textContent = text;
    metaNode.append(pill);
  }

  row.append(location, content, metaNode);
  return row;
}

function tabLabel(tab) {
  if (tab === "homepages") return "Gemeindeseiten";
  if (tab === "municipalities") return "Gemeinden";
  return "Vereine";
}

function setActiveTab(tab) {
  state.activeTab = tab;
  closeMenu();
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
  elements.stateSelect.value = "";
  elements.sortSelect.value = "state";
  elements.withClubsOnlyInput.checked = false;
  state.selectedMunicipality = "";
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
  if (document.body.classList.contains("nav-open")) {
    closeMenu();
  } else {
    openMenu();
  }
}

elements.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  const uploadedClubData = JSON.parse(text);
  state.municipalities = mergeData([state.municipalities], [uploadedClubData]);
  state.sourceName = `${state.sourceName} + ${file.name}`;
  elements.sourceLabel.textContent = state.sourceName;
  fillStateSelect();
  render();
});

elements.resetButton.addEventListener("click", resetFilters);
elements.allButton.addEventListener("click", () => {
  state.selectedMunicipality = "";
  render();
});
elements.menuButton.addEventListener("click", toggleMenu);
elements.navBackdrop.addEventListener("click", closeMenu);

for (const button of document.querySelectorAll("[data-tab-target]")) {
  button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
}

for (const input of [
  elements.searchInput,
  elements.minScoreInput,
  elements.stateSelect,
  elements.sortSelect,
  elements.withClubsOnlyInput,
]) {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

loadDefaultData();
