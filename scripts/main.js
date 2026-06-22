import { LoadHeaderFooter, setLocalStorage, getLocalStorage, clearLocalStorage } from "./utils.mjs";

const srcIataInput = document.querySelector("#src-airport-code");
const srcCountryInput = document.querySelector("#src-country-code");
const srcButton = document.querySelector("#src-lookup-btn");
const srcResult = document.querySelector("#src-airport-result");
const savedSrcAirport = getLocalStorage("srcAirport");

const srcRemoveBtn = document.querySelector("#src-remove-btn");
const addDstButton = document.querySelector("#add-dst-button");
const dstColumn = document.querySelector("#dst-column");

const sourceBtns = document.querySelectorAll(".source-btn");
const btnLocal = document.querySelector("#btn-local");
const btnAirlabs = document.querySelector("#btn-airlabs");
const btnAviationStack = document.querySelector("#btn-aviationstack");

const dataSourceStatus = document.querySelector("#data-source-status");
const toggleLatLngBtn = document.querySelector("#toggle-latlong-btn");
const clearStorageBtn = document.querySelector("#clear-storage-btn");

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
let dstCounter = 0;
let showLatLng = getLocalStorage("showLatLng") ?? true;
let currentSource = getLocalStorage("currentSource") || "local";

toggleLatLngBtn.textContent = showLatLng ? "Hide Lat/Lng" : "Show Lat/Lng";

sourceBtns.forEach((b) => b.classList.remove("active"));
if (currentSource === "local") btnLocal.classList.add("active");
else if (currentSource === "airlabs") btnAirlabs.classList.add("active");
else if (currentSource === "aviationstack") btnAviationStack.classList.add("active");

function toggleLatLng() {
  showLatLng = !showLatLng;
  toggleLatLngBtn.textContent = showLatLng ? "Hide Lat/Lng" : "Show Lat/Lng";
  setLocalStorage("showLatLng", showLatLng)
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

if (savedSrcAirport) {
  srcAirport = savedSrcAirport;
  srcCountryInput.value = savedSrcAirport.country_code;
  srcIataInput.value = savedSrcAirport.iata_code;
  srcResult.innerHTML = formatAirportResult(savedSrcAirport);
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
      const response = await fetch("data/UsAirports.json");
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

    setLocalStorage("currentSource", currentSource);
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
        setLocalStorage("srcAirport", srcAirport);
        updateAllDistances();
      } else {
        updateDistance(airport, distanceEl);
      }

    } else {
        resultEl.textContent = `No airport found for IATA code "${iata}" in country "${country}".`;
      }
  } catch (error) {
    resultEl.textContent = `Error looking up airport: ${error.message}`;
  }
}

// -------------------------------------------------------
// Distance calculation and display
// -------------------------------------------------------

function updateDistance(dstAirport, distanceEl) {
  if (srcAirport && dstAirport) {
    const miles = calcDistance(
      srcAirport.lat, srcAirport.lng,
      dstAirport.lat, dstAirport.lng
    );
    distanceEl.dataset.miles = miles;
    distanceEl.dataset.src = srcAirport.iata_code;
    distanceEl.dataset.dst = dstAirport.iata_code;
    updateDistanceDisplay(distanceEl)
  }
}

function updateDistanceDisplay(distanceEl) {
  const oneWay = parseFloat(distanceEl.dataset.miles);
  if (isNaN(oneWay)) return;

  const src = distanceEl.dataset.src;
  const dst = distanceEl.dataset.dst;

  const block = distanceEl.closest(".airport-lookup");
  const rtBtn = block?.querySelector(".rt-btn");
  const hotelInput = block?.querySelector(".hotel-price-input");
  const priceInput = block?.querySelector(".ticket-price-input");
  const priceResult = block?.querySelector(".price-per-mile-result");

  const isRT = rtBtn?.classList.contains("active") ?? false;
  const displayMiles = isRT ? (oneWay * 2).toFixed(0) : oneWay.toFixed(0);
  const label = isRT ? "Round Trip" : "One Way";

  distanceEl.textContent = `Distance from ${src} to ${dst}: ${displayMiles} miles (${label})`;
  const totalPrice = (parseFloat(hotelInput?.value) || 0) + (parseFloat(priceInput.value) || 0);
  updatePricePerMile(priceResult, totalPrice, parseFloat(displayMiles));
}

function updatePricePerMile(priceResult, totalPrice, totalMiles) {
  if (!priceResult) return;
  if ((totalPrice > 0) && (totalMiles > 0)) {
    const cpp = ((totalPrice / totalMiles) * 100).toFixed(1);
    priceResult.textContent = `Price per mile: ${cpp}¢`;
  } else {
    priceResult.textContent = "";
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
        delete distanceEl.dataset.miles;
      }
    } else {
      distanceEl.textContent = "";
      delete distanceEl.dataset.miles;
    }
  });
}

// -------------------------------------------------------
// Desitnation block builder - used for all dst blocks
// -------------------------------------------------------

function createDstBlock(id) {
  const div = document.createElement("div");
  div.classList.add("airport-lookup", "dst-block");
  div.id = `dst-lookup-${id}`;
  div.innerHTML = `
    <h3>Destination Airport ${id}</h3>
    <label>Enter 2-Letter Country Code (US is default):</label>
    <input type="text" class="dst-country-input" maxlength="2" placeholder="e.g. US" value="US"/>

    <label>Enter 3-Letter Airport Code:</label>
    <input type="text" class="dst-iata-input" maxlength="3" placeholder="e.g. LAX" />

    <button type="button" class="dst-lookup-btn">Look Up</button>
    <button type="button" class="rt-btn" title="Toggle Round Tripe">RT</button>
    <button type="button" class="dst-remove-btn">Remove</button>

    <p class="dst-airport-result"></p>
    <p class="distance-result"></p>
    <div class="price-section">
      <div class="price-row">
        <label>Hotel Price ($):</label>
        <input type="number" class="hotel-price-input" min="0" step="1" placeholder="0" value="0" />
      </div>
      <div class="price-row">
        <label>Ticket Price ($):</label>
        <input type="number" class="ticket-price-input" min="0" step="1" placeholder="e.g. 425" />
        <span class="price-per-mile-result"></span>
      </div>
    </div>
  `;

  const iataInput = div.querySelector(".dst-iata-input");
  const countryInput = div.querySelector(".dst-country-input");
  const lookupBtn = div.querySelector(".dst-lookup-btn");
  const resultEl = div.querySelector(".dst-airport-result");
  const distanceEl = div.querySelector(".distance-result");
  const removeBtn = div.querySelector(".dst-remove-btn");
  const rtBtn = div.querySelector(".rt-btn");
  const priceInput = div.querySelector(".ticket-price-input");
  const priceResult = div.querySelector(".price-per-mile-result");

  lookupBtn.addEventListener("click", () =>
    lookupAirport(iataInput, countryInput, resultEl, distanceEl)
  );

  iataInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupAirport(iataInput, countryInput, resultEl, distanceEl)
  });
  
  rtBtn.addEventListener("click", () => {
    rtBtn.classList.toggle("active");
    updateDistanceDisplay(distanceEl);
  });

  const hotelInput = div.querySelector(".hotel-price-input");

  function getTotalPrice() {
    return (parseFloat(hotelInput.value) || 0) + (parseFloat(priceInput.value) || 0);
  };

  hotelInput.addEventListener("input", () => {
    const miles = parseFloat(distanceEl.dataset.miles);
    if (isNaN(miles)) return;
    const isRT = rtBtn.classList.contains("active");
    const displayMiles = isRT ? miles * 2 : miles;
    updatePricePerMile(priceResult, getTotalPrice(), displayMiles);
  });

  priceInput.addEventListener("input", () => {
    const miles = parseFloat(distanceEl.dataset.miles);
    if (isNaN(miles)) return;
    const isRT = rtBtn.classList.contains("active");
    const displayMiles = isRT ? miles * 2 : miles;
    updatePricePerMile(priceResult, getTotalPrice(), displayMiles);
  });

  removeBtn.addEventListener("click", () => {
    div.remove();
  });

  return div;
};

function addDstBlock() {
  dstCounter++;
  const newBlock = createDstBlock(dstCounter);
  dstColumn.insertBefore(newBlock, addDstButton);
  return newBlock;
};

// -------------------------------------------------------
// Initialize first destination block on page load
// -------------------------------------------------------

addDstBlock();

// -------------------------------------------------------
// Top-level event listeners
// -------------------------------------------------------

addDstButton.addEventListener("click", addDstBlock);

srcButton.addEventListener("click", () =>
  lookupAirport(srcIataInput, srcCountryInput, srcResult, null)
);

toggleLatLngBtn.addEventListener("click", toggleLatLng);

srcIataInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lookupAirport(srcIataInput, srcCountryInput, srcResult, null);
});

srcRemoveBtn.addEventListener("click", () => {
  srcResult.textContent = "";
  srcAirport = null;
  srcIataInput.value = "";
  srcCountryInput.value = "US";
  clearLocalStorage("srcAirport");
  updateAllDistances();
})

clearStorageBtn.addEventListener("click", () => {
  clearLocalStorage("currentSource");
  clearLocalStorage("srcAirport");
  clearLocalStorage("showLatLng");

  currentSource = "local";
  srcAirport = null;
  showLatLng = true;

  sourceBtns.forEach((b) => b.classList.remove("active"));
  btnLocal.classList.add("active");

  srcResult.textContent = "";
  srcIataInput.value = "";
  srcCountryInput.value = "US";

  // Remove all destination blocks and restart with one
  document.querySelectorAll('.dst-block').forEach((block) => block.remove());
  dstCounter = 0;
  addDstBlock();

  toggleLatLngBtn.textContent = "Hide Lat/Lng";

  airportData = [];
  dataSourceStatus.textContent = "";
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