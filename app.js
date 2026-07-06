// Smart Departure - app.js

// Rakenduse globaalne olek
let state = {
  start: { lat: 58.39990, lon: 26.75319, address: 'Tartu Südamekodu, 13' }, // Vaikeväärtus
  end: { lat: 58.38021, lon: 26.72241, address: 'Tartu Raekoja plats' },     // Vaikeväärtus
  waypoints: [], // Vahepunktid kujul: { lat, lon, address }
  mode: 'BICYCLE',
  arriveTime: '', // Saabumisaeg (HH:MM)
  speed: 25, // km/h
  duration: 0, // Kestus sekundites
  distance: 0, // Vahemaa meetrites
  map: null,
  markers: {
    start: null,
    end: null,
    waypoints: []
  },
  routePolyline: null
};

// Vaikimisi koordinaadid Tartu kesklinnale ja Tartu Südamekodule (kiiremaks laadimiseks)
const COORDS_SUDAMEKODU = { lat: 58.39990, lon: 26.75319, address: 'Tartu Südamekodu, 13' };
const COORDS_RAEKOJA = { lat: 58.38021, lon: 26.72241, address: 'Tartu Raekoja plats' };

// Abifunktsioon API URL-i valimiseks vastavalt protokollile ja keskkonnale
function getApiUrl() {
  if (window.location.protocol === 'file:' || window.location.hostname.includes('github.io')) {
    return 'https://api.peatus.ee/routing/v1/routers/estonia/index/graphql';
  }
  return '/api/peatus-ee';
}


// Paneelide kokkupakkimise, avamise ja pealkirja uuendamise funktsioonid
function updateSearchTitle() {
  const compactRouteText = document.getElementById('compact-route-text');
  const searchPanel = document.querySelector('.search-panel');
  if (!compactRouteText || !searchPanel) return;

  if (searchPanel.classList.contains('collapsed')) {
    const startName = state.start.address ? state.start.address.split(',')[0].trim() : 'Vali lähtekoht';
    const endName = state.end.address ? state.end.address.split(',')[0].trim() : 'Vali sihtkoht';
    compactRouteText.textContent = `${startName} ➔ ${endName}`;
  }
}

function collapsePanels() {
  const searchPanel = document.querySelector('.search-panel');
  const bottomSheet = document.querySelector('.bottom-sheet');
  const compactRouteDisplay = document.getElementById('compact-route-display');
  
  if (searchPanel) {
    searchPanel.classList.add('collapsed');
    updateSearchTitle();
  }
  if (bottomSheet) {
    bottomSheet.classList.add('collapsed');
  }
  if (compactRouteDisplay) {
    compactRouteDisplay.classList.remove('hidden');
  }
}

function expandPanels() {
  const searchPanel = document.querySelector('.search-panel');
  const bottomSheet = document.querySelector('.bottom-sheet');
  const compactRouteDisplay = document.getElementById('compact-route-display');
  
  if (searchPanel) {
    searchPanel.classList.remove('collapsed');
    updateSearchTitle();
  }
  if (bottomSheet) {
    bottomSheet.classList.remove('collapsed');
  }
  if (compactRouteDisplay) {
    compactRouteDisplay.classList.add('hidden');
  }
}

// Kaardi initsialiseerimine
function initMap() {
  // Tartu keskpunkt
  state.map = L.map('map', {
    zoomControl: false,
    tap: false // iOS klikkimisprobleemide vältimiseks
  }).setView([58.3806, 26.7251], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);

  // Värskenda kaardi suurust akna muutumisel
  setTimeout(() => state.map.invalidateSize(), 300);

  // Loo klõpsamise kuulaja kaardile aadressi lisamiseks
  state.map.on('click', async (e) => {
    const latlng = e.latlng;
    
    // Loome Leaflet popupi valikutega
    const popupContent = document.createElement('div');
    popupContent.className = 'map-click-popup';
    popupContent.style.minWidth = '150px';
    popupContent.style.padding = '4px 0';
    
    popupContent.innerHTML = `
      <div style="font-weight: 700; font-size: 10px; margin-bottom: 6px; padding: 0 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Määra asukoht</div>
      <button class="popup-btn" id="popup-set-start" style="display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; background: none; font-size: 13px; font-weight: 500; color: #1e293b; cursor: pointer; transition: background 0.15s; border-radius: 4px;">🚩 Alguspunktiks</button>
      <button class="popup-btn" id="popup-set-end" style="display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; background: none; font-size: 13px; font-weight: 500; color: #1e293b; cursor: pointer; transition: background 0.15s; border-radius: 4px;">📍 Sihtkohaks</button>
      <button class="popup-btn" id="popup-add-wp" style="display: block; width: 100%; text-align: left; padding: 8px 12px; border: none; background: none; font-size: 13px; font-weight: 500; color: #1e293b; cursor: pointer; transition: background 0.15s; border-radius: 4px;">🔸 Vahepunktiks</button>
    `;
    
    // Lisa nupud sündmustega
    popupContent.querySelector('#popup-set-start').addEventListener('click', async () => {
      state.map.closePopup();
      const addr = await reverseGeocode(latlng.lat, latlng.lng);
      state.start = { lat: latlng.lat, lon: latlng.lng, address: addr };
      document.getElementById('input-start').value = addr;
      calculateRoute();
    });

    popupContent.querySelector('#popup-set-end').addEventListener('click', async () => {
      state.map.closePopup();
      const addr = await reverseGeocode(latlng.lat, latlng.lng);
      state.end = { lat: latlng.lat, lon: latlng.lng, address: addr };
      document.getElementById('input-end').value = addr;
      calculateRoute();
    });

    popupContent.querySelector('#popup-add-wp').addEventListener('click', async () => {
      state.map.closePopup();
      const addr = await reverseGeocode(latlng.lat, latlng.lng);
      state.waypoints.push({ lat: latlng.lat, lon: latlng.lng, address: addr });
      renderWaypoints();
      calculateRoute();
    });

    // Stiilime popup nupud hoveriks
    popupContent.querySelectorAll('.popup-btn').forEach(btn => {
      btn.onmouseover = () => btn.style.background = '#f1f5f9';
      btn.onmouseout = () => btn.style.background = 'none';
    });

    L.popup()
      .setLatLng(latlng)
      .setContent(popupContent)
      .openOn(state.map);
  });
}

// Laadi seaded localStorage'ist
function loadSettings() {
  const savedStart = localStorage.getItem('sd_default_start');
  const savedEnd = localStorage.getItem('sd_default_end');
  const savedMode = localStorage.getItem('sd_default_mode');
  const savedSpeed = localStorage.getItem('sd_default_speed');

  if (savedStart) {
    state.start.address = savedStart;
    // Kui on vaikimisi aadress, proovime selle hiljem asukoha tuvastamisel geokodeerida
  }
  if (savedEnd) {
    state.end.address = savedEnd;
  }
  if (savedMode) {
    state.mode = savedMode;
  }
  if (savedSpeed) {
    state.speed = parseInt(savedSpeed, 10);
  }

  // Uuenda seadete modaali sisendeid
  document.getElementById('default-start').value = state.start.address;
  document.getElementById('default-end').value = state.end.address;
  document.getElementById('default-mode').value = state.mode;
  document.getElementById('default-speed').value = state.speed;

  // Sea kellaajaks vaikimisi praegune aeg + 1 tund
  const now = new Date();
  now.setHours(now.getHours() + 1);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  state.arriveTime = `${hours}:${minutes}`;
  document.getElementById('input-arrive-time').value = state.arriveTime;

  // Uuenda kiiruse slaideri vaikeväärtus vastavalt režiimile
  updateSpeedSliderLimits();
}

// Salvesta seaded
function saveSettings() {
  const defaultStart = document.getElementById('default-start').value;
  const defaultEnd = document.getElementById('default-end').value;
  const defaultMode = document.getElementById('default-mode').value;
  const defaultSpeed = parseInt(document.getElementById('default-speed').value, 10);

  localStorage.setItem('sd_default_start', defaultStart);
  localStorage.setItem('sd_default_end', defaultEnd);
  localStorage.setItem('sd_default_mode', defaultMode);
  localStorage.setItem('sd_default_speed', defaultSpeed);

  state.mode = defaultMode;
  state.speed = defaultSpeed;
  
  // Uuendame sisendeid
  document.getElementById('input-start').value = defaultStart;
  document.getElementById('input-end').value = defaultEnd;
  
  // Sulgeme paneeli ja arvutame uuesti
  document.getElementById('settings-overlay').classList.add('hidden');
  
  // Geokodeerime uued aadressid
  Promise.all([
    geocodeAddress(defaultStart).then(coords => { if(coords) state.start = coords; }),
    geocodeAddress(defaultEnd).then(coords => { if(coords) state.end = coords; })
  ]).then(() => {
    updateTabsUI();
    updateSpeedSliderLimits();
    calculateRoute();
  });
}

// GPS asukoha pärimine
function locateUser() {
  const gpsButton = document.getElementById('btn-gps');
  gpsButton.innerHTML = `<svg class="spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="16"/></svg>`;

  if (!navigator.geolocation) {
    alert("Teie brauser ei toeta asukoha tuvastamist. Kasutame vaikeasukohta.");
    fallbackToDefaultStart();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      try {
        const addressName = await reverseGeocode(lat, lon);
        state.start = { lat, lon, address: addressName };
        document.getElementById('input-start').value = addressName;
        calculateRoute();
      } catch (err) {
        state.start = { lat, lon, address: `${lat.toFixed(4)}, ${lon.toFixed(4)}` };
        document.getElementById('input-start').value = state.start.address;
        calculateRoute();
      } finally {
        resetGpsButtonIcon();
      }
    },
    (error) => {
      console.warn("Asukoha tuvastamine ebaõnnestus:", error.message);
      alert("GPS asukohta ei saanud tuvastada (keelatud või puudub). Kasutame vaikeasukohta Tartu Südamekodu, 13.");
      fallbackToDefaultStart();
      resetGpsButtonIcon();
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

function resetGpsButtonIcon() {
  document.getElementById('btn-gps').innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

async function fallbackToDefaultStart() {
  // Proovime geokodeerida Tartu Südamekodu, 13. Kui see ebaõnnestub, võtame hardcoded koordinaadid
  try {
    const coords = await geocodeAddress(state.start.address || 'Tartu Südamekodu, 13');
    if (coords) {
      state.start = coords;
    } else {
      state.start = { ...COORDS_SUDAMEKODU };
    }
  } catch (e) {
    state.start = { ...COORDS_SUDAMEKODU };
  }
  document.getElementById('input-start').value = state.start.address;
  calculateRoute();
}

// Nominatim Geokodeerimine (Aadressist koordinaadid)
async function geocodeAddress(addressQuery) {
  // Kui sisend on tühi või vaikimisi teadaolev, tagasta vastav asukoht otse
  if (!addressQuery || addressQuery.trim() === '') return null;
  if (addressQuery.toLowerCase().includes('südamekodu') || addressQuery.toLowerCase().includes('sudamekodu')) {
    return { ...COORDS_SUDAMEKODU };
  }
  if (addressQuery.toLowerCase().includes('raekoja') || addressQuery.toLowerCase().includes('raekoda') || addressQuery.toLowerCase().includes('kesklinn') || addressQuery.toLowerCase() === 'tartu') {
    return { ...COORDS_RAEKOJA };
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery + ', Tartu')}&viewbox=26.58,58.32,26.82,58.45&bounded=1&format=json&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SmartDepartureApp/1.0 (fadya@example.com)' }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        address: data[0].display_name.split(',')[0] + (data[0].display_name.split(',')[1] ? ', ' + data[0].display_name.split(',')[1].trim() : '')
      };
    }
    // Kui Tartu piires ei leitud, proovime ilma viewbox piiranguta
    const globalUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1`;
    const globalResp = await fetch(globalUrl, {
      headers: { 'User-Agent': 'SmartDepartureApp/1.0 (fadya@example.com)' }
    });
    const globalData = await globalResp.json();
    if (globalData && globalData.length > 0) {
      return {
        lat: parseFloat(globalData[0].lat),
        lon: parseFloat(globalData[0].lon),
        address: globalData[0].display_name.split(',')[0]
      };
    }
  } catch (error) {
    console.error("Geokodeerimise viga:", error);
  }
  return null;
}

// Nominatim Pöördgeokodeerimine (Koordinaatidest aadress)
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SmartDepartureApp/1.0 (fadya@example.com)' }
    });
    const data = await response.json();
    if (data && data.address) {
      return getShortAddress(data.address);
    }
  } catch (error) {
    console.error("Pöördgeokodeerimise viga:", error);
  }
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

// Loo lühike ja loetav aadress objekti andmetest
function getShortAddress(addr) {
  const road = addr.road || addr.street || addr.pedestrian || '';
  const houseNumber = addr.house_number || '';
  const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
  const city = addr.city || addr.town || addr.village || '';
  
  if (road && houseNumber) {
    return `${road} ${houseNumber}`;
  } else if (road) {
    return road;
  } else if (suburb) {
    return suburb;
  } else if (city) {
    return city;
  }
  return 'Tundmatu asukoht';
}

// Autocomplete soovituste kuvamine
function setupAutocomplete(inputId, suggestionsId, stateKey, waypointIndex = null) {
  const input = document.getElementById(inputId);
  const suggestionsBox = document.getElementById(suggestionsId);
  let debounceTimeout;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    const query = input.value.trim();
    
    if (query.length < 3) {
      suggestionsBox.classList.add('hidden');
      return;
    }

    debounceTimeout = setTimeout(async () => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&viewbox=26.58,58.32,26.82,58.45&bounded=1&format=json&limit=5`;
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'SmartDepartureApp/1.0 (fadya@example.com)' }
        });
        const data = await response.json();
        
        suggestionsBox.innerHTML = '';
        if (data && data.length > 0) {
          suggestionsBox.classList.remove('hidden');
          data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            
            // Loo lühem esitlusnimetus
            const parts = item.display_name.split(',');
            const shortName = parts[0] + (parts[1] ? ', ' + parts[1].trim() : '') + (parts[2] ? ', ' + parts[2].trim() : '');
            
            div.textContent = shortName;
            div.addEventListener('click', () => {
              input.value = shortName;
              suggestionsBox.classList.add('hidden');
              
              const coords = {
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                address: shortName
              };

              if (waypointIndex !== null) {
                state.waypoints[waypointIndex] = coords;
                calculateRoute();
              } else if (stateKey) {
                state[stateKey] = coords;
                calculateRoute();
              }
            });
            suggestionsBox.appendChild(div);
          });
        } else {
          suggestionsBox.classList.add('hidden');
        }
      } catch (err) {
        console.error("Soovituste päringu viga:", err);
      }
    }, 400);
  });

  // Sulge soovitused, kui klikitakse mujale
  document.addEventListener('click', (e) => {
    if (e.target !== input && e.target !== suggestionsBox) {
      suggestionsBox.classList.add('hidden');
    }
  });
}

// Vahepunktide dünaamiline haldus (Waypoints)
function renderWaypoints() {
  const container = document.getElementById('waypoints-container');
  container.innerHTML = '';

  state.waypoints.forEach((wp, index) => {
    const row = document.createElement('div');
    row.className = 'input-row waypoint-row';
    row.innerHTML = `
      <span class="dot-indicator waypoint-dot"></span>
      <div class="input-container">
        <input type="text" id="input-wp-${index}" placeholder="Vali vahepunkt..." value="${wp.address || ''}" autocomplete="off">
        <div id="wp-suggestions-${index}" class="suggestions-box hidden"></div>
      </div>
      <button class="small-icon-button btn-remove-waypoint" data-index="${index}" title="Eemalda vahepunkt">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    container.appendChild(row);

    // Vali sisendi autocomplete
    setupAutocomplete(`input-wp-${index}`, `wp-suggestions-${index}`, null, index);
  });

  // Eemaldamise nupu sidumine
  document.querySelectorAll('.btn-remove-waypoint').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      state.waypoints.splice(idx, 1);
      renderWaypoints();
      calculateRoute();
    });
  });
}

// Uuenda kaardi markereid vastavalt olekule
function updateMapMarkers() {
  // Eemalda vanad markerid
  if (state.markers.start) state.map.removeLayer(state.markers.start);
  if (state.markers.end) state.map.removeLayer(state.markers.end);
  state.markers.waypoints.forEach(m => state.map.removeLayer(m));
  state.markers.waypoints = [];

  // Loo uued markerid ikoonidega
  const startIcon = L.divIcon({
    className: 'custom-marker start-marker-icon',
    html: '<div style="background-color: #2563eb; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14]
  });

  const endIcon = L.divIcon({
    className: 'custom-marker end-marker-icon',
    html: '<div style="background-color: #ef4444; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3)"></div>',
    iconSize: [14, 14]
  });

  // Alguspunkt
  if (state.start.lat && state.start.lon) {
    state.markers.start = L.marker([state.start.lat, state.start.lon], {
      icon: startIcon,
      draggable: true
    }).addTo(state.map);

    state.markers.start.on('dragend', async (e) => {
      const newLatLng = e.target.getLatLng();
      const addr = await reverseGeocode(newLatLng.lat, newLatLng.lng);
      state.start = { lat: newLatLng.lat, lon: newLatLng.lng, address: addr };
      document.getElementById('input-start').value = addr;
      calculateRoute();
    });
  }

  // Sihtkoht
  if (state.end.lat && state.end.lon) {
    state.markers.end = L.marker([state.end.lat, state.end.lon], {
      icon: endIcon,
      draggable: true
    }).addTo(state.map);

    state.markers.end.on('dragend', async (e) => {
      const newLatLng = e.target.getLatLng();
      const addr = await reverseGeocode(newLatLng.lat, newLatLng.lng);
      state.end = { lat: newLatLng.lat, lon: newLatLng.lng, address: addr };
      document.getElementById('input-end').value = addr;
      calculateRoute();
    });
  }

  // Vahepunktid
  state.waypoints.forEach((wp, index) => {
    if (wp.lat && wp.lon) {
      const wpIcon = L.divIcon({
        className: 'custom-marker waypoint-marker-icon',
        html: `<div style="background-color: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [12, 12]
      });

      const m = L.marker([wp.lat, wp.lon], {
        icon: wpIcon,
        draggable: true
      }).addTo(state.map);

      m.on('dragend', async (e) => {
        const newLatLng = e.target.getLatLng();
        const addr = await reverseGeocode(newLatLng.lat, newLatLng.lng);
        state.waypoints[index] = { lat: newLatLng.lat, lon: newLatLng.lng, address: addr };
        renderWaypoints();
        calculateRoute();
      });

      state.markers.waypoints.push(m);
    }
  });
}

// Teekonna päring api.peatus.ee GraphQL APIst
async function calculateRoute() {
  updateMapMarkers();

  if (!state.start.lat || !state.start.lon || !state.end.lat || !state.end.lon) {
    return;
  }

  // Näita laadimise staatust tulemuskaardil
  document.getElementById('result-departure-time').textContent = "Arvutab...";
  document.getElementById('result-duration').textContent = "Päritakse teekonna detaile...";

  // Valmista ette GraphQL muutujad
  const intermediate = state.waypoints
    .filter(wp => wp.lat && wp.lon)
    .map(wp => ({ lat: wp.lat, lon: wp.lon }));

  // Kuupäeva formaat (Y-M-D täna)
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Vali transpordiviisi GraphQL argumendid (väärtused kirjutatakse päringusse otse, et vältida api.peatus.ee 500 viga)
  let modesStr = '[{ mode: BICYCLE }]';
  if (state.mode === 'TRANSIT') {
    modesStr = '[{ mode: WALK }, { mode: TRANSIT }]';
  } else if (state.mode === 'CAR') {
    modesStr = '[{ mode: CAR }]';
  } else if (state.mode === 'WALK') {
    modesStr = '[{ mode: WALK }]';
  }

  // GraphQL päring
  const query = `
    query PlanRoute($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!, $intermediate: [InputCoordinates!]!, $time: String!, $date: String!) {
      plan(
        from: { lat: $fromLat, lon: $fromLon }
        to: { lat: $toLat, lon: $toLon }
        intermediatePlaces: $intermediate
        arriveBy: true
        time: $time
        date: $date
        numItineraries: 1
        transportModes: ${modesStr}
      ) {
        itineraries {
          duration
          startTime
          endTime
          legs {
            mode
            startTime
            endTime
            duration
            distance
            legGeometry {
              points
            }
          }
        }
      }
    }
  `;

  const variables = {
    fromLat: state.start.lat,
    fromLon: state.start.lon,
    toLat: state.end.lat,
    toLon: state.end.lon,
    intermediate: intermediate,
    time: state.arriveTime + ":00",
    date: dateStr
  };

  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    
    const resData = await response.json();
    
    if (resData.errors) {
      console.warn("GraphQL tagastas vead:", resData.errors);
      const osrmOk = await fetchOSRMFallback();
      if (!osrmOk) fallbackStraightLineRoute();
      collapsePanels();
      return;
    }

    const plan = resData.data?.plan;
    if (plan && plan.itineraries && plan.itineraries.length > 0) {
      drawRouteOnMap(plan.itineraries[0]);
    } else {
      console.warn("Teekondi ei leitud, kasutame tagasilangust.");
      const osrmOk = await fetchOSRMFallback();
      if (!osrmOk) await fallbackStraightLineRoute();
    }
    collapsePanels();
  } catch (error) {
    console.error("Viga teekonna planeerimisel, proovin OSRM-i:", error);
    const osrmOk = await fetchOSRMFallback();
    if (!osrmOk) await fallbackStraightLineRoute();
    collapsePanels();
  }
}

// OSRM tasuta API kaudu teekonna leidmine mööda teid (kui peatus.ee ei tööta või CORS blokeerib)
async function fetchOSRMFallback() {
  const points = [];
  points.push(`${state.start.lon},${state.start.lat}`);
  state.waypoints.forEach(wp => {
    if (wp.lat && wp.lon) points.push(`${wp.lon},${wp.lat}`);
  });
  points.push(`${state.end.lon},${state.end.lat}`);
  
  const url = `https://router.project-osrm.org/route/v1/driving/${points.join(';')}?overview=full&geometries=geojson`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distance = route.distance; // meetrites
      const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // [lon, lat] -> [lat, lon]
      
      state.distance = distance;
      state.duration = route.duration; // Auto kestus sekundites
      state.routeLegs = null; // Lähtesta eelmise marsruudi leg-id
      
      if (state.routePolyline) state.map.removeLayer(state.routePolyline);
      
      let color = '#2563eb';
      if (state.mode === 'CAR') color = '#10b981';
      if (state.mode === 'WALK') color = '#f59e0b';
      if (state.mode === 'TRANSIT') color = '#8b5cf6';
      
      if (state.mode === 'TRANSIT') {
        // Eristame jalgsi ja bussi osad kaardil segmentidena mööda teed
        const featureGroup = L.featureGroup();
        const splitIndex1 = Math.round(coords.length * 0.20);
        const splitIndex2 = Math.round(coords.length * 0.85);
        
        // 1. Kõnd algusest peatusesse (oranž katkendlik)
        L.polyline(coords.slice(0, splitIndex1 + 1), {
          color: '#f59e0b',
          weight: 4,
          dashArray: '5, 8'
        }).addTo(featureGroup);
        
        // 2. Bussisõit peatusest peatusesse (lilla pidev)
        L.polyline(coords.slice(splitIndex1, splitIndex2 + 1), {
          color: '#8b5cf6',
          weight: 5,
          opacity: 0.9
        }).addTo(featureGroup);
        
        // 3. Kõnd peatusest sihtkohta (oranž katkendlik)
        L.polyline(coords.slice(splitIndex2), {
          color: '#f59e0b',
          weight: 4,
          dashArray: '5, 8'
        }).addTo(featureGroup);
        
        state.routePolyline = featureGroup.addTo(state.map);
      } else {
        state.routePolyline = L.polyline(coords, {
          color: color,
          weight: 5,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(state.map);
      }
      
      state.map.fitBounds(state.routePolyline.getBounds(), { padding: [50, 50] });
      
      recalculateDepartureTime();
      return true;
    }
  } catch (err) {
    console.warn("OSRM API kaudu teekonna leidmine ebaõnnestus:", err);
  }
  return false;
}

// Tagasilanguse arvutus (nt sirgjooneline koordinaatide vahemaa) võrguvigade puhul
async function fallbackStraightLineRoute() {
  // Arvuta distants koordinaatide vahel (Haversine valem)
  const dist = getHaversineDistance(
    state.start.lat, state.start.lon,
    state.end.lat, state.end.lon
  );

  // Lisa vahepunktide distantsid
  let totalDist = dist;
  let prevPoint = state.start;
  state.waypoints.forEach(wp => {
    if (wp.lat && wp.lon) {
      totalDist += getHaversineDistance(prevPoint.lat, prevPoint.lon, wp.lat, wp.lon);
      prevPoint = wp;
    }
  });
  if (state.waypoints.length > 0) {
    totalDist += getHaversineDistance(prevPoint.lat, prevPoint.lon, state.end.lat, state.end.lon);
  }

  // Salvesta distants
  state.distance = totalDist;

  if (state.routePolyline) state.map.removeLayer(state.routePolyline);

  if (state.mode === 'TRANSIT') {
    const featureGroup = L.featureGroup();
    
    const lat1 = state.start.lat;
    const lon1 = state.start.lon;
    const lat2 = state.end.lat;
    const lon2 = state.end.lon;
    
    // Lähimad peatused Overpass API abil
    const startStop = await getNearestBusStop(lat1, lon1);
    const endStop = await getNearestBusStop(lat2, lon2);
    
    state.startStop = startStop;
    state.endStop = endStop;
    
    let latB = lat1, lonB = lon1;
    let latC = lat2, lonC = lon2;
    
    if (startStop && endStop) {
      latB = startStop.lat;
      lonB = startStop.lon;
      latC = endStop.lat;
      lonC = endStop.lon;
    } else {
      const firstDest = state.waypoints.length > 0 ? state.waypoints[0] : state.end;
      const lastStart = state.waypoints.length > 0 ? state.waypoints[state.waypoints.length - 1] : state.start;
      
      latB = lat1 + (firstDest.lat - lat1) * 0.20;
      lonB = lon1 + (firstDest.lon - lon1) * 0.20;
      
      latC = lastStart.lat + (lat2 - lastStart.lat) * 0.85;
      lonC = lastStart.lon + (lon2 - lastStart.lon) * 0.85;
    }
    
    // 1. Kõnd algusest peatusesse (oranž katkendlik)
    L.polyline([[lat1, lon1], [latB, lonB]], {
      color: '#f59e0b',
      weight: 4,
      dashArray: '5, 8'
    }).addTo(featureGroup);
    
    // 2. Bussisõit peatusest peatusesse (lilla pidev)
    const busPath = [[latB, lonB]];
    state.waypoints.forEach(wp => {
      if (wp.lat && wp.lon) busPath.push([wp.lat, wp.lon]);
    });
    busPath.push([latC, lonC]);
    
    L.polyline(busPath, {
      color: '#8b5cf6',
      weight: 5,
      opacity: 0.9
    }).addTo(featureGroup);
    
    // 3. Kõnd peatusest sihtkohta (oranž katkendlik)
    L.polyline([[latC, lonC], [lat2, lon2]], {
      color: '#f59e0b',
      weight: 4,
      dashArray: '5, 8'
    }).addTo(featureGroup);
    
    state.routePolyline = featureGroup.addTo(state.map);
  } else {
    // Tavaline sirgjooneline teekond muude transpordiliikide jaoks
    const path = [
      [state.start.lat, state.start.lon],
      ...state.waypoints.map(wp => [wp.lat, wp.lon]),
      [state.end.lat, state.end.lon]
    ];
    const color = state.mode === 'CAR' ? '#10b981' : (state.mode === 'WALK' ? '#f59e0b' : '#2563eb');
    state.routePolyline = L.polyline(path, { color: color, weight: 4, dashArray: '5, 10' }).addTo(state.map);
  }

  state.map.fitBounds(state.routePolyline.getBounds(), { padding: [40, 40] });

  // Arvuta default kestus kiiruse slideri järgi
  recalculateDepartureTime();
}

// Kaardile teekonna joonistamine
function drawRouteOnMap(itinerary) {
  if (state.routePolyline) {
    state.map.removeLayer(state.routePolyline);
  }

  state.duration = itinerary.duration; // sekundites
  state.routeLegs = itinerary.legs; // Salvesta leg-id detailsema info saamiseks
  
  // Arvutame kogu distantsi kõigist leg-idest
  state.distance = itinerary.legs.reduce((acc, leg) => acc + (leg.distance || 0), 0);

  let allCoords = [];
  itinerary.legs.forEach(leg => {
    if (leg.legGeometry && leg.legGeometry.points) {
      const decoded = decodePolyline(leg.legGeometry.points);
      allCoords = allCoords.concat(decoded);
    }
  });

  // Kui polylines polnud punkte, lisame alguse ja lõpu sirgjoonena
  if (allCoords.length === 0) {
    allCoords = [
      [state.start.lat, state.start.lon],
      ...state.waypoints.map(wp => [wp.lat, wp.lon]),
      [state.end.lat, state.end.lon]
    ];
  }

  // Joonista teekond
  let color = '#2563eb'; // Ratas/Transit - sinine
  if (state.mode === 'CAR') color = '#10b981'; // Auto - roheline
  if (state.mode === 'WALK') color = '#f59e0b'; // Jalgsi - oranž
  if (state.mode === 'TRANSIT') color = '#8b5cf6'; // Buss - lilla

  state.routePolyline = L.polyline(allCoords, {
    color: color,
    weight: 5,
    opacity: 0.8,
    lineJoin: 'round'
  }).addTo(state.map);

  // Keskesta teekonnale
  state.map.fitBounds(state.routePolyline.getBounds(), {
    padding: [50, 50]
  });

  // Kuva tulemused
  recalculateDepartureTime(itinerary.startTime, itinerary.endTime);
}

// Lahkumisaja arvutus ja kuvamine
function recalculateDepartureTime(apiStartTimeMs = null, apiEndTimeMs = null) {
  let depTimeStr = "--:--";
  let arrTimeStr = "--:--";
  let durSeconds = state.duration;
  let walkMin = 0;
  let busMin = 0;

  // Kui tegemist on ratta/jalgsi/autoga, skaleerime kestuse vastavalt slaideri kiirusele
  if (state.mode === 'TRANSIT') {
    if (apiStartTimeMs && state.routeLegs) {
      // Arvuta tegelik jalgsi ja bussi kestus API vastusest
      state.routeLegs.forEach(leg => {
        const legMin = Math.round(leg.duration / 60);
        if (leg.mode === 'WALK') {
          walkMin += legMin;
        } else {
          busMin += legMin;
        }
      });
      durSeconds = (walkMin + busMin) * 60;
    } else {
      // Kui API ebaõnnestus (sirgjooneline tagasilangus)
      let walkDist = 0;
      let busDist = 0;
      const dist = state.distance;
      
      if (state.startStop && state.endStop) {
        walkDist = getHaversineDistance(state.start.lat, state.start.lon, state.startStop.lat, state.startStop.lon) + 
                   getHaversineDistance(state.end.lat, state.end.lon, state.endStop.lat, state.endStop.lon);
        busDist = getHaversineDistance(state.startStop.lat, state.startStop.lon, state.endStop.lat, state.endStop.lon);
      } else {
        walkDist = Math.min(dist * 0.2, 400) + Math.min(dist * 0.1, 200);
        busDist = Math.max(dist - walkDist, 100);
      }
      
      const walkSec = walkDist / (5 / 3.6); // 5 km/h jalgsi
      const busSec = busDist / (20 / 3.6); // 20 km/h bussiga
      
      walkMin = Math.round(walkSec / 60) || 1;
      busMin = Math.round(busSec / 60) || 1;
      durSeconds = (walkMin + busMin) * 60;
    }
  } else {
    const speedMs = state.speed / 3.6; // km/h -> m/s
    durSeconds = state.distance / speedMs;
  }

  const durationMin = Math.round(durSeconds / 60);

  // Kui API andis konkreetsed ajad (nt ühistranspordi graafikust)
  if (state.mode === 'TRANSIT' && apiStartTimeMs && apiEndTimeMs) {
    const depDate = new Date(apiStartTimeMs);
    const depHrs = String(depDate.getHours()).padStart(2, '0');
    const depMins = String(depDate.getMinutes()).padStart(2, '0');
    depTimeStr = `${depHrs}:${depMins}`;

    const arrDate = new Date(apiEndTimeMs);
    const arrHrs = String(arrDate.getHours()).padStart(2, '0');
    const arrMins = String(arrDate.getMinutes()).padStart(2, '0');
    arrTimeStr = `${arrHrs}:${arrMins}`;
  } else {
    // Muul juhul arvutame käsitsi sihtkellaajast tagasi
    const [arrHours, arrMinutes] = state.arriveTime.split(':').map(Number);
    const targetDate = new Date();
    targetDate.setHours(arrHours);
    targetDate.setMinutes(arrMinutes);
    targetDate.setSeconds(0);

    // Lahuta kestus sekundites stardiaja saamiseks
    const depDate = new Date(targetDate.getTime() - (durSeconds * 1000));
    const depHrs = String(depDate.getHours()).padStart(2, '0');
    const depMins = String(depDate.getMinutes()).padStart(2, '0');
    depTimeStr = `${depHrs}:${depMins}`;
    arrTimeStr = state.arriveTime;
  }

  // Uuenda UI
  document.getElementById('result-departure-time').textContent = depTimeStr;
  
  const distanceKm = (state.distance / 1000).toFixed(1);
  let durationDetails = `<strong>${durationMin} min</strong>`;
  if (state.mode === 'TRANSIT') {
    durationDetails = `<strong>${durationMin} min</strong> (Jalgsi ${walkMin} min + Buss ${busMin} min)`;
  }

  document.getElementById('result-duration').innerHTML = 
    `Teekonna kestus: ${durationDetails} | Distants: ${distanceKm} km | Jõuab kohale kell <strong>${arrTimeStr}</strong>`;

  // Uuenda tabs-i kestused pealiskaudselt
  updateTabsTimesDisplay(durationMin);
}

// Uuenda tabs paneeli kestuste näitu
function updateTabsTimesDisplay(activeDurationMin) {
  // Kuva aktiivsel vahelehel arvutatud aeg
  const modeKey = state.mode.toLowerCase();
  const activeTabTime = document.getElementById(`tab-time-${modeKey}`);
  if (activeTabTime) {
    activeTabTime.textContent = `${activeDurationMin} min`;
  }
}

// Uuenda liuguri (slider) piiranguid vastavalt valitud transpordivahendile
function updateSpeedSliderLimits() {
  const speedSlider = document.getElementById('input-speed');
  const speedDisplay = document.getElementById('speed-display');

  if (state.mode === 'BICYCLE') {
    speedDisplay.classList.remove('timetable-link');
    speedSlider.disabled = false;
    speedSlider.min = 5;
    speedSlider.max = 50;
    // Laadi eelistus või kasuta vaikimisi 25 km/h
    state.speed = parseInt(localStorage.getItem('sd_default_speed') || '25', 10);
    speedSlider.value = state.speed;
  } else if (state.mode === 'WALK') {
    speedDisplay.classList.remove('timetable-link');
    speedSlider.disabled = false;
    speedSlider.min = 3;
    speedSlider.max = 12;
    state.speed = 5; // Vaikeväärtus kõndimisele
    speedSlider.value = state.speed;
  } else if (state.mode === 'CAR') {
    speedDisplay.classList.remove('timetable-link');
    speedSlider.disabled = false;
    speedSlider.min = 10;
    speedSlider.max = 90;
    state.speed = 40; // Vaikeväärtus linnasõidule
    speedSlider.value = state.speed;
  } else if (state.mode === 'TRANSIT') {
    // Bussigraafik on fikseeritud, keelame slaideri
    speedDisplay.classList.add('timetable-link');
    speedSlider.disabled = true;
    speedDisplay.textContent = "Graafiku järgi";
    return;
  }

  speedDisplay.textContent = `${state.speed} km/h`;
}

// Polyline dekodeerija (Google encoded polyline algoritm)
function decodePolyline(encoded) {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Haversine valem vahemaa arvutamiseks maakera kumerusel (meetrites)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Maa raadius meetrites
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const deltaPhi = (lat2-lat1) * Math.PI/180;
  const deltaLambda = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // meetrites
}

// Leiab lähima bussipeatuse (Overpass API)
async function getNearestBusStop(lat, lon) {
  const query = `
    [out:json];
    node["highway"="bus_stop"](around:2000, ${lat}, ${lon});
    out center 1;
  `;
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query)
    });
    const data = await response.json();
    if (data.elements && data.elements.length > 0) {
      const stop = data.elements[0];
      return {
        lat: stop.lat,
        lon: stop.lon,
        name: stop.tags.name || 'Bussipeatus'
      };
    }
  } catch (err) {
    console.warn("Lähima bussipeatuse otsimine ebaõnnestus:", err);
  }
  return null;
}

// Vahekaartide (Tabs) stiili uuendamine
function updateTabsUI() {
  document.querySelectorAll('.tab-button').forEach(btn => {
    if (btn.getAttribute('data-mode') === state.mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Genereerib ja kuvab simuleeritud ühistranspordi väljumised (kui graafikuinfot ei leita)
async function renderFallbackTimetable(listContainer, overlay) {
  listContainer.innerHTML = `
    <div class="timetable-loading">
      <div class="spinner-circle"></div>
      <span>Otsime lähimaid bussipeatusi...</span>
    </div>
  `;
  
  const startStop = await getNearestBusStop(state.start.lat, state.start.lon);
  const endStop = await getNearestBusStop(state.end.lat, state.end.lon);
  
  let walkDist = 0;
  let busDist = 0;
  let originStopName = 'Lähimasse peatusesse';
  
  if (startStop && endStop) {
    walkDist = getHaversineDistance(state.start.lat, state.start.lon, startStop.lat, startStop.lon) + 
               getHaversineDistance(state.end.lat, state.end.lon, endStop.lat, endStop.lon);
    busDist = getHaversineDistance(startStop.lat, startStop.lon, endStop.lat, endStop.lon);
    originStopName = startStop.name + ' peatus';
  } else {
    const dist = getHaversineDistance(state.start.lat, state.start.lon, state.end.lat, state.end.lon);
    walkDist = Math.min(dist * 0.2, 400) + Math.min(dist * 0.1, 200);
    busDist = Math.max(dist - walkDist, 100);
  }
  
  const walkSec = walkDist / (5 / 3.6); // 5 km/h jalgsi
  const busSec = busDist / (20 / 3.6); // 20 km/h bussiga
  
  const walkMin = Math.round(walkSec / 60) || 1;
  const busMin = Math.round(busSec / 60) || 1;
  const durationMin = walkMin + busMin;

  listContainer.innerHTML = '';
  const today = new Date();

  for (let i = 0; i < 5; i++) {
    // Genereeri 5 väljumist (nihkega 15 minutit)
    const depDate = new Date(today.getTime() + (i * 15 * 60 * 1000) + (5 * 60 * 1000));
    const arrDate = new Date(depDate.getTime() + (durationMin * 60 * 1000));
    
    const depTime = String(depDate.getHours()).padStart(2, '0') + ':' + String(depDate.getMinutes()).padStart(2, '0');
    const arrTime = String(arrDate.getHours()).padStart(2, '0') + ':' + String(arrDate.getMinutes()).padStart(2, '0');
    
    const summaryText = `Jalgsi ${walkMin} min (${originStopName}) &rarr; <strong>Buss</strong> (${busMin} min) &rarr; Jalgsi sihtkohta`;

    const item = document.createElement('div');
    item.className = 'timetable-item';
    item.innerHTML = `
      <div class="timetable-item-left">
        <div class="timetable-times">${depTime} &rarr; ${arrTime}</div>
        <div class="timetable-duration">Kestus: <strong>${durationMin} min</strong> (Jalgsi ${walkMin} min + Buss ${busMin} min)</div>
        <div class="timetable-summary">${summaryText}</div>
      </div>
      <button class="timetable-select-btn" data-arrtime="${arrTime}">Vali</button>
    `;

    item.querySelector('.timetable-select-btn').addEventListener('click', () => {
      state.arriveTime = arrTime;
      document.getElementById('input-arrive-time').value = arrTime;
      overlay.classList.add('hidden');
      calculateRoute();
    });

    listContainer.appendChild(item);
  }
}

// Kuvab täna väljuvad bussid (bussigraafiku pop-up)
async function showTimetablePopup() {
  const overlay = document.getElementById('timetable-overlay');
  const listContainer = document.getElementById('timetable-list');
  
  overlay.classList.remove('hidden');
  
  // Spinner loadinguks
  listContainer.innerHTML = `
    <div class="timetable-loading">
      <div class="spinner-circle"></div>
      <span>Laeb täna väljuvaid busse...</span>
    </div>
  `;

  if (!state.start.lat || !state.start.lon || !state.end.lat || !state.end.lon) {
    listContainer.innerHTML = `<div class="timetable-loading"><span>Viga: Teekonna algus- või sihtkoht on määramata.</span></div>`;
    return;
  }

  // Teeme päringu järgmise 5 ühenduse saamiseks (alates praegusest hetkest)
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const currentHours = String(today.getHours()).padStart(2, '0');
  const currentMinutes = String(today.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}:00`;

  const query = `
    query GetTimetable($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!, $time: String!, $date: String!) {
      plan(
        from: { lat: $fromLat, lon: $fromLon }
        to: { lat: $toLat, lon: $toLon }
        arriveBy: false
        time: $time
        date: $date
        numItineraries: 5
        transportModes: [{ mode: WALK }, { mode: TRANSIT }]
      ) {
        itineraries {
          duration
          startTime
          endTime
          legs {
            mode
            route {
              shortName
            }
            duration
          }
        }
      }
    }
  `;

  const variables = {
    fromLat: state.start.lat,
    fromLon: state.start.lon,
    toLat: state.end.lat,
    toLon: state.end.lon,
    time: currentTime,
    date: dateStr
  };

  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const resData = await response.json();
    
    if (resData.errors || !resData.data?.plan?.itineraries || resData.data.plan.itineraries.length === 0) {
      console.warn("Graafikuinfot ei leitud või ilmnes viga, laen tagasilanguse graafiku.");
      await renderFallbackTimetable(listContainer, overlay);
      return;
    }

    const itineraries = resData.data.plan.itineraries;
    listContainer.innerHTML = '';

    itineraries.forEach(it => {
      const depDate = new Date(it.startTime);
      const arrDate = new Date(it.endTime);
      
      const depTime = String(depDate.getHours()).padStart(2, '0') + ':' + String(depDate.getMinutes()).padStart(2, '0');
      const arrTime = String(arrDate.getHours()).padStart(2, '0') + ':' + String(arrDate.getMinutes()).padStart(2, '0');
      const durationMin = Math.round(it.duration / 60);

      // Koosta leg-idest kokkuvõte
      let walkDurationMin = 0;
      let busDurationMin = 0;
      const legSummaries = [];

      it.legs.forEach(leg => {
        const legDur = Math.round(leg.duration / 60);
        if (leg.mode === 'WALK') {
          walkDurationMin += legDur;
          legSummaries.push(`Jalgsi ${legDur} min`);
        } else if (leg.mode === 'BUS') {
          busDurationMin += legDur;
          const lineNum = leg.route?.shortName || 'Buss';
          legSummaries.push(`<strong>Buss ${lineNum}</strong> (${legDur} min)`);
        } else {
          busDurationMin += legDur;
          legSummaries.push(`${leg.mode} ${legDur} min`);
        }
      });
      const summaryText = legSummaries.join(' &rarr; ');

      const item = document.createElement('div');
      item.className = 'timetable-item';
      item.innerHTML = `
        <div class="timetable-item-left">
          <div class="timetable-times">${depTime} &rarr; ${arrTime}</div>
          <div class="timetable-duration">Kestus: <strong>${durationMin} min</strong> (Jalgsi ${walkDurationMin} min + Buss ${busDurationMin} min)</div>
          <div class="timetable-summary">${summaryText}</div>
        </div>
        <button class="timetable-select-btn" data-arrtime="${arrTime}">Vali</button>
      `;

      item.querySelector('.timetable-select-btn').addEventListener('click', () => {
        state.arriveTime = arrTime;
        document.getElementById('input-arrive-time').value = arrTime;
        overlay.classList.add('hidden');
        calculateRoute();
      });

      listContainer.appendChild(item);
    });

  } catch (err) {
    console.error("Viga bussigraafiku laadimisel, laen tagasilanguse graafiku:", err);
    renderFallbackTimetable(listContainer, overlay);
  }
}

// Liidese sündmuste kuulajad
function setupEventListeners() {
  // GPS nupu klõps
  document.getElementById('btn-gps').addEventListener('click', locateUser);

  // Keskendamise nupp
  document.getElementById('btn-recenter').addEventListener('click', () => {
    if (state.routePolyline) {
      state.map.fitBounds(state.routePolyline.getBounds(), { padding: [50, 50] });
    } else if (state.start.lat && state.start.lon) {
      state.map.setView([state.start.lat, state.start.lon], 14);
    }
  });

  // Transpordi vahekaardid
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.getAttribute('data-mode');
      updateTabsUI();
      updateSpeedSliderLimits();
      calculateRoute();
    });
  });

  // Saabumisaja muutmine
  const timeInput = document.getElementById('input-arrive-time');
  timeInput.addEventListener('change', () => {
    state.arriveTime = timeInput.value;
    calculateRoute();
  });


  // Kiiruse slaideri reguleerimine ja "Graafiku järgi" klõps
  const speedSlider = document.getElementById('input-speed');
  const speedDisplay = document.getElementById('speed-display');
  
  speedSlider.addEventListener('input', () => {
    state.speed = parseInt(speedSlider.value, 10);
    speedDisplay.textContent = `${state.speed} km/h`;
    recalculateDepartureTime();
  });

  speedDisplay.addEventListener('click', () => {
    if (state.mode === 'TRANSIT') {
      showTimetablePopup();
    }
  });

  // Vahepunkti lisamine
  document.getElementById('btn-add-waypoint').addEventListener('click', () => {
    // Lisa tühi vahepunkt poolele teele
    let targetLat = 58.3806;
    let targetLon = 26.7251;
    if (state.start.lat && state.end.lat) {
      targetLat = (state.start.lat + state.end.lat) / 2;
      targetLon = (state.start.lon + state.end.lon) / 2;
    }

    state.waypoints.push({
      lat: targetLat,
      lon: targetLon,
      address: 'Vahepunkt ' + (state.waypoints.length + 1)
    });
    
    renderWaypoints();
    calculateRoute();
  });

  // Seadete modaal
  const settingsBtn = document.getElementById('btn-settings');
  const settingsOverlay = document.getElementById('settings-overlay');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const saveDefaultsBtn = document.getElementById('btn-save-defaults');

  settingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
  });

  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.add('hidden');
    }
  });

  saveDefaultsBtn.addEventListener('click', saveSettings);

  // Bussigraafiku hüpikakna sulgemine
  const timetableOverlay = document.getElementById('timetable-overlay');
  const closeTimetableBtn = document.getElementById('btn-close-timetable');

  closeTimetableBtn.addEventListener('click', () => {
    timetableOverlay.classList.add('hidden');
  });

  timetableOverlay.addEventListener('click', (e) => {
    if (e.target === timetableOverlay) {
      timetableOverlay.classList.add('hidden');
    }
  });

  // Kaardi lohistamise ja suumimise kuulajad paneelide ajutiseks peitmiseks
  let mapInteractionTimeout = null;
  
  if (state.map) {
    const hidePanels = () => {
      if (state.routePolyline) {
        document.querySelector('.bottom-sheet')?.classList.add('panel-hidden');
        document.querySelector('.search-panel')?.classList.add('panel-hidden');
      }
    };

    const showPanels = () => {
      if (mapInteractionTimeout) clearTimeout(mapInteractionTimeout);
      mapInteractionTimeout = setTimeout(() => {
        document.querySelector('.bottom-sheet')?.classList.remove('panel-hidden');
        document.querySelector('.search-panel')?.classList.remove('panel-hidden');
      }, 1000);
    };

    state.map.on('movestart', hidePanels);
    state.map.on('zoomstart', hidePanels);
    state.map.on('moveend', showPanels);
    state.map.on('zoomend', showPanels);
  }

  // Käsitsi paneelide kokkupakkimine ja avamine klikkides päistel
  const searchPanel = document.querySelector('.search-panel');
  const bottomSheet = document.querySelector('.bottom-sheet');
  const dragHandle = document.querySelector('.drag-handle');
  const resultCard = document.querySelector('.result-card');

  const compactRouteDisplay = document.getElementById('compact-route-display');
  if (compactRouteDisplay) {
    compactRouteDisplay.addEventListener('click', () => {
      expandPanels();
    });
  }

  if (dragHandle && bottomSheet) {
    dragHandle.addEventListener('click', () => {
      bottomSheet.classList.toggle('collapsed');
    });
  }

  if (resultCard && bottomSheet) {
    resultCard.addEventListener('click', () => {
      if (bottomSheet.classList.contains('collapsed')) {
        bottomSheet.classList.remove('collapsed');
      }
    });
  }
}

// Initsialiseeri rakendus lehe laadimisel
window.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadSettings();
  
  // Sea sisenditesse algsed aadressid
  document.getElementById('input-start').value = state.start.address;
  document.getElementById('input-end').value = state.end.address;

  // Loo autocomplete otsinguväljadele
  setupAutocomplete('input-start', 'start-suggestions', 'start');
  setupAutocomplete('input-end', 'end-suggestions', 'end');
  setupAutocomplete('default-start', 'default-start-suggestions', null);
  setupAutocomplete('default-end', 'default-end-suggestions', null);

  setupEventListeners();

  // Esmane teekonna geokodeerimine ja joonistamine
  Promise.all([
    geocodeAddress(state.start.address).then(coords => { if(coords) state.start = coords; }),
    geocodeAddress(state.end.address).then(coords => { if(coords) state.end = coords; })
  ]).then(() => {
    updateTabsUI();
    calculateRoute();
  });
});
