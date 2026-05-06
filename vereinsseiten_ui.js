const DATA_FILES = ["filtered-vereinsseiten.json", "filtered_vereinsseiten.json"];

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
  titleOnlyInput: document.querySelector("#titleOnlyInput"),
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

  elements.sourceLabel.textContent = "Keine JSON automatisch geladen. Bitte Datei laden.";
}

function setData(data, sourceName) {
  state.rawData = Array.isArray(data) ? data : [];
  state.sourceName = sourceName;
  state.selectedMunicipality = "";
  elements.sourceLabel.textContent = `${sourceName} geladen`;
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
    titleOnly: elements.titleOnlyInput.checked,
  };
}

function entryMatchesSearch(entry, page, search) {
  if (!search) {
    return true;
  }

  return [entry.name, entry.typ, entry.bundesland, page.titel, page.url].some((value) =>
    normalize(value).includes(search)
  );
}

function filterData() {
  const filters = getFilters();

  return state.rawData
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
}

function getMunicipalityCounts(filteredData) {
  return new Map(filteredData.map((entry) => [entry.name, entry.vereinsseiten.length]));
}

function render() {
  const filteredData = filterData();
  renderSummary(filteredData);
  renderMunicipalities(filteredData);
  renderResults(filteredData);
}

function renderSummary(filteredData) {
  const urlCount = filteredData.reduce((sum, entry) => sum + entry.vereinsseiten.length, 0);
  elements.summaryText.textContent = `${filteredData.length} Gemeinden, ${urlCount} URLs`;
  elements.selectedText.textContent = state.selectedMunicipality || "Alle Gemeinden";
}

function renderMunicipalities(filteredData) {
  const counts = getMunicipalityCounts(filteredData);
  elements.municipalityList.replaceChildren();

  const entries = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "de-DE"));

  for (const [name, count] of entries) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = name === state.selectedMunicipality ? "active" : "";
    button.title = name;

    const label = document.createElement("span");
    label.className = "municipality-name";
    label.textContent = name;

    const pill = document.createElement("span");
    pill.className = "count-pill";
    pill.textContent = count;

    button.append(label, pill);
    button.addEventListener("click", () => {
      state.selectedMunicipality = name;
      render();
    });

    item.append(button);
    elements.municipalityList.append(item);
  }
}

function renderResults(filteredData) {
  elements.resultsList.replaceChildren();
  elements.emptyState.hidden = filteredData.length > 0;

  for (const entry of filteredData) {
    const group = document.createElement("article");
    group.className = "municipality-group";

    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = `${entry.name} (${entry.typ || "Typ unbekannt"})`;

    const count = document.createElement("span");
    count.className = "count-pill";
    count.textContent = `${entry.vereinsseiten.length} URLs`;

    header.append(title, count);
    group.append(header);

    for (const page of entry.vereinsseiten) {
      group.append(createResultRow(page));
    }

    elements.resultsList.append(group);
  }
}

function createResultRow(page) {
  const row = document.createElement("div");
  row.className = "result-row";

  const content = document.createElement("div");
  const title = document.createElement("p");
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

  if (page.titel_enthaelt_verein) {
    const titleHit = document.createElement("span");
    titleHit.className = "title-pill";
    titleHit.textContent = "Titel";
    meta.append(titleHit);
  }

  row.append(content, meta);
  return row;
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.minScoreInput.value = "";
  elements.maxScoreInput.value = "";
  elements.stateSelect.value = "";
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
  elements.titleOnlyInput,
]) {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

loadDefaultData();
