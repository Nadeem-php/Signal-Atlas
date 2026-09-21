/*
 * Signal Atlas front-end prototype.
 * To make this live, set window.NEWS_MAP_API_URL to your server-side endpoint.
 * That endpoint should return { place, center: [lat,lng], zoom, incidents: Incident[] }.
 * Fetch news server-side so API keys are protected and articles can be deduplicated.
 */

const locationCatalog = {
  "bengaluru, india": {
    label: "Bengaluru, India", center: [12.9716, 77.5946], zoom: 12, radius: "12 km", coverage: 84, sourceTypes: 4,
    incidents: [
      { id: "blr-1", type: "urgent", category: "Public safety", time: "42 min ago", title: "Illustrative alert: traffic diversion on the Inner Ring Road", description: "A sample clustered incident showing how an official notice and local reporting appear together.", location: "Domlur · 2.4 km away", point: [12.9592, 77.6387], sources: [{ name: "Official notice", url: "https://www.bengaluruurban.nic.in/" }, { name: "Local reporting", url: "https://www.thehindu.com/" }] },
      { id: "blr-2", type: "watch", category: "Weather", time: "1 hr ago", title: "Illustrative alert: localized heavy-rain advisory", description: "Sample weather-related signal, grouped by place and reporting time.", location: "Koramangala · 3.1 km away", point: [12.9352, 77.6245], sources: [{ name: "Weather bulletin", url: "https://mausam.imd.gov.in/" }, { name: "News desk", url: "https://indianexpress.com/" }] },
      { id: "blr-3", type: "update", category: "Transit", time: "2 hrs ago", title: "Illustrative update: metro service notice", description: "A sample operational update with an original publisher trail.", location: "MG Road · 1.3 km away", point: [12.9758, 77.6066], sources: [{ name: "Transit update", url: "https://english.bmrc.co.in/" }] },
      { id: "blr-4", type: "watch", category: "Civic", time: "3 hrs ago", title: "Illustrative report: temporary water supply disruption", description: "Sample incident data only. Production feeds should clearly identify report and publication time.", location: "Indiranagar · 4.0 km away", point: [12.9784, 77.6408], sources: [{ name: "Civic source", url: "https://bwssb.karnataka.gov.in/" }, { name: "Regional desk", url: "https://www.deccanherald.com/" }] },
      { id: "blr-5", type: "update", category: "Community", time: "5 hrs ago", title: "Illustrative update: public event route advisory", description: "A sample lower-severity signal for situational awareness.", location: "Cubbon Park · 1.9 km away", point: [12.9765, 77.5928], sources: [{ name: "City bulletin", url: "https://bbmp.gov.in/" }] },
      { id: "blr-6", type: "watch", category: "Roads", time: "6 hrs ago", title: "Illustrative report: works near city junction", description: "Sample reports are used in this prototype to avoid presenting invented news as live incidents.", location: "Shivajinagar · 2.7 km away", point: [12.9868, 77.6028], sources: [{ name: "Road authority", url: "https://transport.karnataka.gov.in/" }, { name: "Local desk", url: "https://www.newindianexpress.com/" }] }
    ]
  },
  "mumbai, india": {
    label: "Mumbai, India", center: [19.076, 72.8777], zoom: 11, radius: "15 km", coverage: 79, sourceTypes: 4,
    incidents: [
      { id: "mum-1", type: "watch", category: "Transit", time: "35 min ago", title: "Illustrative alert: service update on a commuter corridor", description: "Example clustered signal for a Mumbai location search.", location: "Dadar · 3.2 km away", point: [19.0181, 72.8436], sources: [{ name: "Transit operator", url: "https://wr.indianrailways.gov.in/" }, { name: "Local reporting", url: "https://www.hindustantimes.com/" }] },
      { id: "mum-2", type: "urgent", category: "Weather", time: "1 hr ago", title: "Illustrative alert: coastal weather advisory", description: "Example only — live status requires connected source providers.", location: "Marine Drive · 4.5 km away", point: [18.943, 72.8238], sources: [{ name: "Weather bulletin", url: "https://mausam.imd.gov.in/" }, { name: "City desk", url: "https://indianexpress.com/" }] },
      { id: "mum-3", type: "update", category: "Civic", time: "2 hrs ago", title: "Illustrative update: civic work notification", description: "A lower-severity sample update in the active search region.", location: "Bandra · 5.4 km away", point: [19.0596, 72.8295], sources: [{ name: "Civic notice", url: "https://portal.mcgm.gov.in/" }] },
      { id: "mum-4", type: "watch", category: "Roads", time: "4 hrs ago", title: "Illustrative report: short-term road access change", description: "Sample incident card with source provenance.", location: "Sion · 6.1 km away", point: [19.0435, 72.8638], sources: [{ name: "Traffic authority", url: "https://trafficpolicemumbai.maharashtra.gov.in/" }, { name: "Regional reporting", url: "https://www.thehindu.com/" }] }
    ]
  },
  "new delhi, india": {
    label: "New Delhi, India", center: [28.6139, 77.209], zoom: 11, radius: "14 km", coverage: 88, sourceTypes: 4,
    incidents: [
      { id: "del-1", type: "urgent", category: "Public safety", time: "25 min ago", title: "Illustrative alert: temporary access controls announced", description: "Sample clustered reporting for the New Delhi view.", location: "Connaught Place · 1.8 km away", point: [28.6315, 77.2167], sources: [{ name: "Official alert", url: "https://delhipolice.gov.in/" }, { name: "National desk", url: "https://www.thehindu.com/" }] },
      { id: "del-2", type: "update", category: "Transit", time: "1 hr ago", title: "Illustrative update: station operational notice", description: "Example transit signal; no claim of current conditions is made in prototype mode.", location: "Rajiv Chowk · 1.2 km away", point: [28.6328, 77.2197], sources: [{ name: "Metro update", url: "https://delhimetrorail.com/" }] },
      { id: "del-3", type: "watch", category: "Air quality", time: "2 hrs ago", title: "Illustrative report: local air-quality watch", description: "Example environmental report displayed with a primary public source.", location: "India Gate · 2.5 km away", point: [28.6129, 77.2295], sources: [{ name: "Air quality data", url: "https://cpcb.nic.in/" }, { name: "City desk", url: "https://indianexpress.com/" }] },
      { id: "del-4", type: "watch", category: "Roads", time: "5 hrs ago", title: "Illustrative report: route advisory", description: "Sample card for a city-level location query.", location: "Karol Bagh · 4.4 km away", point: [28.6517, 77.1904], sources: [{ name: "Traffic bulletin", url: "https://delhitrafficpolice.nic.in/" }] }
    ]
  },
  "london, united kingdom": {
    label: "London, United Kingdom", center: [51.5072, -0.1276], zoom: 12, radius: "12 km", coverage: 82, sourceTypes: 4,
    incidents: [
      { id: "lon-1", type: "watch", category: "Transit", time: "30 min ago", title: "Illustrative alert: service disruption notice", description: "Example source-clustered transport update for a London location search.", location: "Westminster · 1.1 km away", point: [51.5014, -0.1419], sources: [{ name: "Transit status", url: "https://tfl.gov.uk/" }, { name: "City reporting", url: "https://www.bbc.co.uk/news/england/london" }] },
      { id: "lon-2", type: "urgent", category: "Weather", time: "1 hr ago", title: "Illustrative alert: localized weather warning", description: "Prototype record; live deployment must obtain confirmed public alerts.", location: "South Bank · 1.8 km away", point: [51.5055, -0.116], sources: [{ name: "Weather service", url: "https://www.metoffice.gov.uk/" }] },
      { id: "lon-3", type: "update", category: "Civic", time: "3 hrs ago", title: "Illustrative update: scheduled city works", description: "Sample local-area update with provenance space for original sources.", location: "Shoreditch · 3.9 km away", point: [51.5266, -0.0786], sources: [{ name: "City notice", url: "https://www.london.gov.uk/" }, { name: "Reporting desk", url: "https://www.theguardian.com/uk-news" }] },
      { id: "lon-4", type: "watch", category: "Community", time: "6 hrs ago", title: "Illustrative report: local gathering advisory", description: "Example non-emergency awareness signal.", location: "Hyde Park · 3.2 km away", point: [51.5073, -0.1657], sources: [{ name: "Local authority", url: "https://www.westminster.gov.uk/" }] }
    ]
  }
};

const defaultLocation = locationCatalog["bengaluru, india"];
const state = { activeLocation: defaultLocation, visibleCount: 4, selectedId: null, activeTypes: new Set(["urgent", "watch", "update"]), markers: [] };

const elements = {
  input: document.querySelector("#placeSearch"),
  runSearch: document.querySelector("#runSearch"),
  clearSearch: document.querySelector("#clearSearch"),
  mapArea: document.querySelector("#mapArea"),
  radius: document.querySelector("#radiusValue"),
  resultSummary: document.querySelector("#resultSummary"),
  coveragePercent: document.querySelector("#coveragePercent"),
  coverageFill: document.querySelector("#coverageFill"),
  coverageCopy: document.querySelector("#coverageCopy"),
  list: document.querySelector("#incidentList"),
  template: document.querySelector("#incidentTemplate"),
  loadMore: document.querySelector("#loadMore"),
  incidentCount: document.querySelector("#incidentCount"),
  filterButton: document.querySelector("#filterButton"),
  filterMenu: document.querySelector("#filterMenu"),
  themeToggle: document.querySelector("#themeToggle")
};

const map = L.map("map", { zoomControl: false, attributionControl: true }).setView(defaultLocation.center, defaultLocation.zoom);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);

function makeMarker(incident) {
  const icon = L.divIcon({
    className: `incident-marker ${incident.type}`,
    html: "<span></span>",
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  const marker = L.marker(incident.point, { icon, title: incident.title }).addTo(map);
  marker.bindPopup(`<div class="popup-type">${incident.category}</div><strong class="popup-title">${incident.title}</strong><div class="popup-copy">${incident.location}</div>`);
  marker.on("click", () => selectIncident(incident.id, false));
  return marker;
}

function visibleIncidents() {
  return state.activeLocation.incidents.filter((incident) => state.activeTypes.has(incident.type));
}

function renderMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers = visibleIncidents().map(makeMarker);
}

function renderFeed() {
  const incidents = visibleIncidents();
  const shown = incidents.slice(0, state.visibleCount);
  elements.list.replaceChildren();
  shown.forEach((incident) => {
    const node = elements.template.content.cloneNode(true);
    const main = node.querySelector(".incident-main");
    main.dataset.id = incident.id;
    if (state.selectedId === incident.id) main.classList.add("selected");
    node.querySelector(".incident-rail").classList.add(incident.type);
    node.querySelector(".incident-category").textContent = incident.category;
    node.querySelector(".incident-time").textContent = incident.time;
    node.querySelector(".incident-title").textContent = incident.title;
    node.querySelector(".incident-description").textContent = incident.description;
    node.querySelector(".incident-location").textContent = incident.location;
    incident.sources.forEach((source) => {
      const link = document.createElement("a");
      link.className = "source-link";
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = source.name;
      link.setAttribute("aria-label", `Open ${source.name} in a new tab`);
      node.querySelector(".source-row").append(link);
    });
    main.addEventListener("click", () => selectIncident(incident.id, true));
    elements.list.append(node);
  });
  elements.incidentCount.textContent = incidents.length;
  elements.loadMore.hidden = incidents.length <= state.visibleCount;
  elements.resultSummary.textContent = `${incidents.length} incident signals from ${state.activeLocation.sourceTypes} source types`;
}

function selectIncident(id, flyTo) {
  const incident = state.activeLocation.incidents.find((item) => item.id === id);
  if (!incident) return;
  state.selectedId = id;
  renderFeed();
  if (flyTo) map.flyTo(incident.point, Math.max(map.getZoom(), 14), { duration: 0.6 });
  const target = state.markers.find((marker) => {
    const position = marker.getLatLng();
    return position.lat === incident.point[0] && position.lng === incident.point[1];
  });
  target?.openPopup();
}

function updateLocation(location) {
  state.activeLocation = location;
  state.visibleCount = 4;
  state.selectedId = null;
  elements.input.value = location.label;
  elements.mapArea.textContent = location.label;
  elements.radius.textContent = location.radius;
  elements.coveragePercent.textContent = `${location.coverage}%`;
  elements.coverageFill.style.width = `${location.coverage}%`;
  elements.coverageCopy.textContent = `${location.sourceTypes} independent source types reporting`;
  map.flyTo(location.center, location.zoom, { duration: 0.65 });
  renderMarkers();
  renderFeed();
}

function findLocation(query) {
  const normalized = query.trim().toLowerCase();
  if (locationCatalog[normalized]) return locationCatalog[normalized];
  return Object.entries(locationCatalog).find(([key]) => key.includes(normalized) || normalized.includes(key.split(",")[0]))?.[1];
}

function hasValidLocationShape(location) {
  return location && Array.isArray(location.center) && location.center.length === 2 && Array.isArray(location.incidents);
}

async function requestLiveLocation(query) {
  if (!window.NEWS_MAP_API_URL) return null;
  const url = new URL(window.NEWS_MAP_API_URL, window.location.origin);
  url.searchParams.set("place", query);
  url.searchParams.set("hours", document.querySelector("#timeRange").value);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`The incident service returned ${response.status}.`);
  const result = await response.json();
  if (!hasValidLocationShape(result)) throw new Error("The incident service returned an invalid location payload.");
  return {
    label: result.place || query,
    center: result.center,
    zoom: result.zoom || 12,
    radius: result.radius || "12 km",
    coverage: Number.isFinite(result.coverage) ? result.coverage : 0,
    sourceTypes: result.sourceTypes || 0,
    incidents: result.incidents
  };
}

async function runSearch() {
  const query = elements.input.value.trim();
  const sampleLocation = findLocation(query);
  if (sampleLocation) {
    updateLocation(sampleLocation);
    return;
  }
  if (window.NEWS_MAP_API_URL) {
    const originalLabel = elements.runSearch.innerHTML;
    elements.runSearch.disabled = true;
    elements.runSearch.textContent = "Finding signals…";
    try {
      const liveLocation = await requestLiveLocation(query);
      updateLocation(liveLocation);
      return;
    } catch (error) {
      elements.input.setCustomValidity(error.message || "The incident service could not be reached.");
      elements.input.reportValidity();
    } finally {
      elements.runSearch.disabled = false;
      elements.runSearch.innerHTML = originalLabel;
    }
    return;
  }
  const location = sampleLocation;
  if (location) {
    updateLocation(location);
    return;
  }
  elements.input.setCustomValidity("This prototype currently includes Bengaluru, Mumbai, New Delhi, and London.");
  elements.input.reportValidity();
}

elements.runSearch.addEventListener("click", () => { runSearch(); });
elements.input.addEventListener("keydown", (event) => { if (event.key === "Enter") runSearch(); });
elements.input.addEventListener("input", () => { elements.input.setCustomValidity(""); elements.clearSearch.style.display = elements.input.value ? "block" : "none"; });
elements.clearSearch.addEventListener("click", () => { elements.input.value = ""; elements.clearSearch.style.display = "none"; elements.input.focus(); });
document.querySelectorAll("[data-place]").forEach((button) => button.addEventListener("click", () => updateLocation(findLocation(button.dataset.place))));

elements.loadMore.addEventListener("click", () => { state.visibleCount = visibleIncidents().length; renderFeed(); });
elements.filterButton.addEventListener("click", () => {
  const willOpen = elements.filterMenu.hidden;
  elements.filterMenu.hidden = !willOpen;
  elements.filterButton.setAttribute("aria-expanded", String(willOpen));
});
elements.filterMenu.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
  if (input.checked) state.activeTypes.add(input.value); else state.activeTypes.delete(input.value);
  state.visibleCount = 4;
  state.selectedId = null;
  renderMarkers();
  renderFeed();
}));

document.querySelector("#zoomIn").addEventListener("click", () => map.zoomIn());
document.querySelector("#zoomOut").addEventListener("click", () => map.zoomOut());
document.querySelector("#recenter").addEventListener("click", () => map.flyTo(state.activeLocation.center, state.activeLocation.zoom, { duration: .6 }));
elements.themeToggle.addEventListener("click", () => {
  const night = document.documentElement.dataset.theme !== "night";
  document.documentElement.dataset.theme = night ? "night" : "";
  elements.themeToggle.setAttribute("aria-label", night ? "Switch to light theme" : "Switch to dark theme");
});

renderMarkers();
renderFeed();
