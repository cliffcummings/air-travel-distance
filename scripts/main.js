import { LoadHeaderFooter } from "./utils.mjs";

const srcIataInput = document.querySelector("#src-airport-code");
const srcCountryInput = document.querySelector("#src-country-code");
const srcButton = document.querySelector("#src-lookup-btn");
const srcResult = document.querySelector("#src-airport-result");

const dstIataInput = document.querySelector("#dst-airport-code");
const dstCountryInput = document.querySelector("#dst-country-code");
const dstButton = document.querySelector("#dst-lookup-btn");
const dstResult = document.querySelector("#dst-airport-result");

const distanceResult = document.querySelector("#distance-result");

const addDstButton = document.querySelector("#add-dst-button");
const dstColumn = document.querySelector("#dst-column");

const sourceBtns = document.querySelectorAll(".source-btn");
const btnLocal = document.querySelector("#btn-local");
const btnAirlabs = document.querySelector("#btn-airlabs");
const btnAviationStack = document.querySelector("#btn-aviationstack");

const dataSourceStatus = document.querySelector("#data-source-status");
const toggleLatLngBtn = document.querySelector("#toggle-latlong-btn");

// -------------------------------------------------------
// API keys are stored as constants — when the project
// matures, these keys should move these to a server-side
// environment variable so they aren't exposed in the
// client-side code.
// -------------------------------------------------------
const AIRLABS_KEY = "2c5f87a4-5719-4ee1-8130-ebe6cf17ac9f";
const AVIATIONSTACK_KEY = "4d1a4a79c8c9c10e094019028275c0e7";

let airportData = [];
let srcAirport = null;
let dstCounter = 1;
let currentSource = "local";
let showLatLng = true;

function toggleLatLng() {
  showLatLng = !showLatLng;
  toggleLatLngBtn.textContent = showLatLng ? "Hide Lat/Lng" : "Show Lat/Lng";
  refreshAllResults();
}

function formatAirportResult(airport) {
  if (showLatLng) {
    return `${airport.iata_code} - ${airport.name} <span class="latlng">| Lat: ${airport.lat}, Lng: ${airport.lng}</span>`;
  } else {
    return `${airport.iata_code} - ${airport.name}`;
  }
}

function refreshAllResults() {
  // Update source airport result
  if (srcAirport) {
    srcResult.innerHTML = formatAirportResult(srcAirport);
  }

  // Update destination airport result(s)
  const allResultEls = document.querySelectorAll(".dst-airport-result");
  allResultEls.forEach((resultEl) => {
    const iataMatch = resultEl.textContent.match(/^([A-Z]{3})\s+-/);
    if (iataMatch) {
      const iata = iataMatch[1];
      const airport = airportData.find((a) => a.iata_code === iata);
      if (airport) {
        resultEl.innerHTML = formatAirportResult(airport);
      }
    }
  });
}

// -------------------------------------------------------
// Data source conversion functions
// -------------------------------------------------------

// Local UsAirports.json format - already in correct format
function convertLocalFormat(airport) {
  return {
    name: airport.name,
    iata_code: airport.iata_code,
    lat: parseFloat(airport.lat),
    lng: parseFloat(airport.lng),
    country_code: airport.country_code
  };
}

// AirLabs API format conversion
function convertAirLabsFormat(airport) {
  return {
    name: airport.name,
    iata_code: airport.iata_code,
    lat: parseFloat(airport.lat),
    lng: parseFloat(airport.lng),
    country_code: airport.country_code
  };
}

// AviationStack API format conversion
function convertAviationStackFormat(airport) {
  return {
    name: airport.airport_name,
    iata_code: airport.iata_code,
    lat: parseFloat(airport.latitude),
    lng: parseFloat(airport.longitude),
    country_code: airport.country_iso2
  };
}

// -------------------------------------------------------
// Load airports based on selected source
// -------------------------------------------------------

async function loadAirports() {
  if (airportData.length > 0) return airportData;
  try {
    let rawData = [];
    dataSourceStatus.textContent = "Loading airport data...";

    if (currentSource === "local") {
      const response = await fetch("/data/UsAirports.json");
      if (!response.ok) throw new Error(`Failed to load local airport data. Status: ${response.status}`);
      const data = await response.json();
      rawData = data.response;
      airportData = rawData.map(convertLocalFormat);

    } else if (currentSource === "airlabs") {
      const response = await fetch(`https://airlabs.co/api/v9/airports?api_key=${AIRLABS_KEY}`);
      if (!response.ok) throw new Error(`AirLabs request failed. Status: ${response.status}`);
      const data = await response.json();
      rawData = data.response;
      airportData = rawData.map(convertAirLabsFormat);

    } else if (currentSource === "aviationstack") {
      const response = await fetch(`https://api.aviationstack.com/v1/airports?access_key=${AVIATIONSTACK_KEY}&limit=7000&offset=0`);
      if (!response.ok) throw new Error(`AviationStack request failed. Status: ${response.status}`);
      const data = await response.json();
      rawData = data.data;
      airportData = rawData.map(convertAviationStackFormat);
    }

    dataSourceStatus.textContent = `*** ${airportData.length} airports loaded successfully! ***`;
    return airportData;
    } catch (error) {
      return null;
    }
}

// -------------------------------------------------------
// Data source button handlers
// -------------------------------------------------------

sourceBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sourceBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    airportData = []; // clear cache - new source data to be fetched
    dataSourceStatus.textContent = "";

    if (btn === btnLocal) currentSource = "local";
    else if (btn === btnAirlabs) currentSource = "airlabs";
    else if (btn === btnAviationStack) currentSource = "aviationstack";
  });
});

async function lookupAirport(iataInput, countryInput, resultEl, distanceEl) {
  const iata = iataInput.value.trim().toUpperCase();
  const country = countryInput.value.trim().toUpperCase();

  if (iata.length !== 3) {
    resultEl.textContent = "Please enter a valid 3-letter airport code.";
    return;
  }
  
  if (country.length !== 2) {
    resultEl.textContent = "Please enter a valid 2-letter country code.";
    return;
  }

  resultEl.textContent = "Loading airport data..."

  try {
    const airports = await loadAirports();
    if (airports === null) {
      resultEl.textContent = "Error loading airport data"
      return;
    }

    const airport = airports.find(
      (a) =>
        a.iata_code === iata &&
        a.country_code.toUpperCase() === country
    );

    if (airport) {
      resultEl.innerHTML = formatAirportResult(airport);
      if (iataInput === srcIataInput) {
        srcAirport = airport;
        updateAllDistances();
      } else {
        updateDistance(airport, distanceEl);      }

    } else {
        resultEl.textContent = `No airport found for IATA code "${iata}" in country "${country}".`;
      }
  } catch (error) {
    resultEl.textContent = `Error looking up airport: ${error.message}`;
  }
}

function updateDistance(dstAirport, distanceEl) {
  if (srcAirport && dstAirport) {
    const miles = calcDistance(
      srcAirport.lat, srcAirport.lng,
      dstAirport.lat, dstAirport.lng
    );
    distanceEl.textContent = `Distance from ${srcAirport.iata_code} to ${dstAirport.iata_code}: ${miles} miles`;
  }
}

function updateAllDistances() {
  const allDistanceEls = document.querySelectorAll(".distance-result");
  const allResultEls = document.querySelectorAll(".dst-airport-result");
  allDistanceEls.forEach((distanceEl, i) => {
    const resultText = allResultEls[i].textContent;
    const iataMatch = resultText.match(/^([A-Z]{3})\s+-/);
    if (iataMatch) {
      const iata = iataMatch[1];
      const airport = airportData.find((a) => a.iata_code === iata);
      if (airport) {
        updateDistance(airport, distanceEl);
      } else {
        distanceEl.textContent = "";
      }
    } else {
      distanceEl.textContent = "";
    }
  });
}

function createDstBlock(id) {
  const div = document.createElement("div");
  div.classList.add("airport-lookup");
  div.id = `dst-lookup-${id}`;
  div.innerHTML = `
    <h3>Destination Airport ${id}</h3>
    <label>Enter 2-Letter Country Code (US is default):</label>
    <input type="text" class="dst-country-input" maxlength="2" placeholder="e.g. US" value="US"/>
    <label>Enter 3-Letter Airport Code:</label>
    <input type="text" class="dst-iata-input" maxlength="3" placeholder="e.g. LAX" />
    <button type="button" class="dst-lookup-btn">Look Up</button>
    <button type="button" class="dst-remove-btn">Remove</button>
    <p class="dst-airport-result"></p>
    <p class="distance-result"></p>
  `;

  const iataInput = div.querySelector(".dst-iata-input");
  const countryInput = div.querySelector(".dst-country-input");
  const lookupBtn = div.querySelector(".dst-lookup-btn");
  const resultEl = div.querySelector(".dst-airport-result");
  const distanceEl = div.querySelector(".distance-result");

  lookupBtn.addEventListener("click", () =>
    lookupAirport(iataInput, countryInput, resultEl, distanceEl)
  );

  iataInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupAirport(iataInput, countryInput, resultEl, distanceEl)
  });
  
  const removeBtn = div.querySelector(".dst-remove-btn");

  removeBtn.addEventListener("click", () => {
    div.remove();
  })
  
  return div;
}

addDstButton.addEventListener("click", () => {
  dstCounter++;
  const newBlock = createDstBlock(dstCounter);
  dstColumn.insertBefore(newBlock, addDstButton);
});

srcButton.addEventListener("click", () =>
  lookupAirport(srcIataInput, srcCountryInput, srcResult, null)
);

dstButton.addEventListener("click", () =>
  lookupAirport(dstIataInput, dstCountryInput, dstResult, distanceResult)
);

toggleLatLngBtn.addEventListener("click", toggleLatLng);

srcIataInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lookupAirport(srcIataInput, srcCountryInput, srcResult, null);
});

dstIataInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lookupAirport(dstIataInput, dstCountryInput, dstResult, distanceResult);
});

const srcRemoveBtn = document.querySelector("#src-remove-btn");

srcRemoveBtn.addEventListener("click", () => {
  srcResult.textContent = "";
  srcAirport = null;
  srcIataInput.value = "";
  srcCountryInput.value = "US";
  updateAllDistances();
})

// Haversine formula function: used to calculate the shortest distance
// between two points on a sphere (the Earth) using their latitude and
// longitude coordinates.
function calcDistance(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.8;
  // Define toRad function - converts degrees to radians
  const toRad = (deg) => (deg * Math.PI) / 180;

  // Calculate radian differences between latitudes and longitudes
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (earthRadiusMiles * c).toFixed(1);
}

LoadHeaderFooter();