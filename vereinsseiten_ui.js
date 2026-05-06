const DATA_FILES = [
  "filtered-vereinsseiten.json",
  "filtered vereinsseiten.json",
  "filtered_vereinsseiten.json",
];

const state = {
  rawData: [],
  selectedMunicipality: "",
  sourceName: "",
};

const elements = {
  sourceLabel: document.querySelector("#sourceLabel"),
  fileInput: document.querySelector("#fileInput"),
  resetButton: document.querySelector("#resetButton"),
  searchInput: document.querySelector("#searchInput"),
  minScoreInput: document.querySelector("#minScoreInput"),
  maxScoreInput: document.querySelector("#maxScoreInput"),
  stateSelect: document.querySelector("#stateSelect"),
  sortSelect: document.querySelector("#sortSelect"),
  titleOnlyInput: document.querySelector("#titleOnlyInput"),
  municipalityMetric: document.querySelector("#municipalityMetric"),
  municipalitySubMetric: document.querySelector("#municipalitySubMetric"),
  urlMetric: document.querySelector("#urlMetric"),
  urlSubMetric: document.querySelector("#urlSubMetric"),
  titleHitMetric: document.querySelector("#titleHitMetric"),
  titleHitSubMetric: document.querySelector("#titleHitSubMetric"),
  scoreMetric: document.querySelector("#scoreMetric"),
  scoreSubMetric: document.querySelector("#scoreSubMetric"),
  scoreDistribution: document.querySelector("#scoreDistribution"),
  topMunicipalities: document.querySelector("#topMunicipalities"),
  summaryText: document.querySelector("#summaryText"),
  selectedText: document.querySelector("#selectedText"),
  allButton: document.querySelector("#allButton"),
  municipalityList: document.querySelector("#municipalityList"),
  resultsList: document.querySelector("#resultsList"),
  emptyState: document.querySelector("#emptyState"),
};

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("de-DE");
}

function numberOrNull(value) {
  if (value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(value);
}

async function loadDefaultData() {
  for (const fileName of DATA_FILES) {
    try {
      const response = await fetch(encodeURI(fileName), { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      setData(data, fileName);
      return;
    } catch {
      // Try the next known filename.
    }
  }

  elements.sourceLabel.textContent = "Keine JSON geladen";
  render();
}

function setData(data, sourceName) {
  state.rawData = Array.isArray(data) ? data : [];
  state.sourceName = sourceName;
  state.selectedMunicipality = "";
  elements.sourceLabel.textContent = sourceName;
  fillStateSelect();
  render();
}

function fillStateSelect() {
  const states = [...new Set(state.rawData.map((entry) => entry.bundesland).filter(Boolean))].sort((a, b) =>
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
    maxScore: numberOrNull(elements.maxScoreInput.value),
    bundesland: elements.stateSelect.value,
    sort: elements.sortSelect.value,
    titleOnly: elements.titleOnlyInput.checked,
  };
}

function getAllPages(data) {
  return data.flatMap((entry) =>
    (entry.vereinsseiten || []).map((page) => ({
      entry,
      page,
    }))
  );
}

function entryMatchesSearch(entry, page, search) {
  if (!search) {
    return true;
  }

  return [entry.name, entry.typ, entry.bundesland, entry.webseite, page.titel, page.url].some((value) =>
    normalize(value).includes(search)
  );
}

function sortData(data, sortMode) {
  const sorted = [...data];

  if (sortMode === "count") {
    return sorted.sort((a, b) => b.vereinsseiten.length - a.vereinsseiten.length || a.name.localeCompare(b.name, "de-DE"));
  }

  if (sortMode === "score") {
    return sorted.sort((a, b) => getMaxScore(b) - getMaxScore(a) || a.name.localeCompare(b.name, "de-DE"));
  }

  return sorted.sort((a, b) => a.name.localeCompare(b.name, "de-DE"));
}

function getMaxScore(entry) {
  return Math.max(0, ...(entry.vereinsseiten || []).map((page) => Number(page.score ?? 0)));
}

function filterData() {
  const filters = getFilters();

  const filtered = state.rawData
    .filter((entry) => !state.selectedMunicipality || entry.name === state.selectedMunicipality)
    .filter((entry) => !filters.bundesland || entry.bundesland === filters.bundesland)
    .map((entry) => {
      const vereinsseiten = (entry.vereinsseiten || []).filter((page) => {
        const score = Number(page.score ?? 0);

        if (filters.minScore !== null && score < filters.minScore) {
          return false;
        }

        if (filters.maxScore !== null && score > filters.maxScore) {
          return false;
        }

        if (filters.titleOnly && !page.titel_enthaelt_verein) {
          return false;
        }

        return entryMatchesSearch(entry, page, filters.search);
      });

      return { ...entry, vereinsseiten };
    })
    .filter((entry) => entry.vereinsseiten.length > 0);

  return sortData(filtered, filters.sort);
}

function getBaseDataForMunicipalityList() {
  const selected = state.selectedMunicipality;
  state.selectedMunicipality = "";
  const filtered = filterData();
  state.selectedMunicipality = selected;
  return filtered;
}

function render() {
  const filteredData = filterData();
  renderMetrics(filteredData);
  renderScoreDistribution(filteredData);
  renderTopMunicipalities(filteredData);
  renderMunicipalities(getBaseDataForMunicipalityList());
  renderResults(filteredData);
}

function renderMetrics(filteredData) {
  const allPages = getAllPages(state.rawData);
  const visiblePages = getAllPages(filteredData);
  const titleHits = visiblePages.filter(({ page }) => page.titel_enthaelt_verein).length;
  const averageScore = visiblePages.length
    ? Math.round(visiblePages.reduce((sum, item) => sum + Number(item.page.score ?? 0), 0) / visiblePages.length)
    : 0;
  const hitRate = visiblePages.length ? Math.round((titleHits / visiblePages.length) * 100) : 0;

  elements.municipalityMetric.textContent = formatNumber(state.rawData.length);
  elements.municipalitySubMetric.textContent = `${formatNumber(filteredData.length)} sichtbar`;
  elements.urlMetric.textContent = formatNumber(allPages.length);
  elements.urlSubMetric.textContent = `${formatNumber(visiblePages.length)} sichtbar`;
  elements.titleHitMetric.textContent = `${hitRate}%`;
  elements.titleHitSubMetric.textContent = `${formatNumber(titleHits)} Treffer`;
  elements.scoreMetric.textContent = formatNumber(averageScore);
  elements.scoreSubMetric.textContent = visiblePages.length ? "sichtbarer Durchschnitt" : "keine Treffer";
}

function renderScoreDistribution(filteredData) {
  const pages = getAllPages(filteredData);
  const buckets = new Map();

  for (const { page } of pages) {
    const score = Number(page.score ?? 0);
    buckets.set(score, (buckets.get(score) || 0) + 1);
  }

  const maxCount = Math.max(1, ...buckets.values());
  const rows = [...buckets.entries()].sort((a, b) => b[0] - a[0]);
  elements.scoreDistribution.replaceChildren();

  if (rows.length === 0) {
    elements.scoreDistribution.append(createMutedText("Keine Score-Daten im aktuellen Filter."));
    return;
  }

  for (const [score, count] of rows) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("strong");
    label.textContent = `Score ${score}`;

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(4, Math.round((count / maxCount) * 100))}%`;
    track.append(fill);

    const value = document.createElement("span");
    value.textContent = formatNumber(count);

    row.append(label, track, value);
    elements.scoreDistribution.append(row);
  }
}

function renderTopMunicipalities(filteredData) {
  elements.topMunicipalities.replaceChildren();

  const topEntries = [...filteredData]
    .sort((a, b) => b.vereinsseiten.length - a.vereinsseiten.length || getMaxScore(b) - getMaxScore(a))
    .slice(0, 8);

  if (topEntries.length === 0) {
    elements.topMunicipalities.append(createMutedText("Keine Gemeinden im aktuellen Filter."));
    return;
  }

  for (const entry of topEntries) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = entry.name;

    const count = document.createElement("span");
    count.className = "count-pill";
    count.textContent = `${entry.vereinsseiten.length} URLs`;

    item.append(name, count);
    elements.topMunicipalities.append(item);
  }
}

function renderMunicipalities(filteredData) {
  elements.municipalityList.replaceChildren();

  for (const entry of filteredData) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = entry.name === state.selectedMunicipality ? "active" : "";
    button.title = entry.name;

    const label = document.createElement("span");
    label.className = "municipality-name";
    label.textContent = entry.name;

    const pill = document.createElement("span");
    pill.className = "count-pill";
    pill.textContent = entry.vereinsseiten.length;

    button.append(label, pill);
    button.addEventListener("click", () => {
      state.selectedMunicipality = entry.name;
      render();
      document.querySelector("#results").scrollIntoView({ block: "start" });
    });

    item.append(button);
    elements.municipalityList.append(item);
  }
}

function renderResults(filteredData) {
  const visiblePages = getAllPages(filteredData);
  elements.resultsList.replaceChildren();
  elements.emptyState.hidden = visiblePages.length > 0;
  elements.summaryText.textContent = `${formatNumber(visiblePages.length)} URLs`;
  elements.selectedText.textContent = state.selectedMunicipality || "Alle Gemeinden";

  for (const { entry, page } of visiblePages) {
    elements.resultsList.append(createResultRow(entry, page));
  }
}

function createResultRow(entry, page) {
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
  const title = document.createElement("span");
  title.className = "result-title";
  title.textContent = page.titel || "Ohne Titel";

  const link = document.createElement("a");
  link.className = "result-url";
  link.href = page.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = page.url;

  content.append(title, link);

  const meta = document.createElement("div");
  meta.className = "result-meta";

  const score = document.createElement("span");
  score.className = "score-pill";
  score.textContent = `Score ${page.score ?? "-"}`;
  meta.append(score);

  if (entry.bundesland) {
    const statePill = document.createElement("span");
    statePill.className = "state-pill";
    statePill.textContent = entry.bundesland;
    meta.append(statePill);
  }

  if (page.titel_enthaelt_verein) {
    const titleHit = document.createElement("span");
    titleHit.className = "title-pill";
    titleHit.textContent = "Titel";
    meta.append(titleHit);
  }

  row.append(location, content, meta);
  return row;
}

function createMutedText(text) {
  const item = document.createElement("p");
  item.className = "empty-inline";
  item.textContent = text;
  return item;
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.minScoreInput.value = "";
  elements.maxScoreInput.value = "";
  elements.stateSelect.value = "";
  elements.sortSelect.value = "name";
  elements.titleOnlyInput.checked = false;
  state.selectedMunicipality = "";
  render();
}

elements.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const text = await file.text();
  setData(JSON.parse(text), file.name);
});

elements.resetButton.addEventListener("click", resetFilters);
elements.allButton.addEventListener("click", () => {
  state.selectedMunicipality = "";
  render();
});

for (const input of [
  elements.searchInput,
  elements.minScoreInput,
  elements.maxScoreInput,
  elements.stateSelect,
  elements.sortSelect,
  elements.titleOnlyInput,
]) {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

loadDefaultData();
