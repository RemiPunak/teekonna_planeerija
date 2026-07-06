const http = require('http');

async function testLocalServer() {
  console.log("--- Test 1: Kohaliku serveri staatiliste failide kontroll ---");
  const files = ['/', '/index.css', '/app.js'];
  for (const file of files) {
    try {
      const res = await fetch(`http://localhost:3000${file}`);
      if (res.status === 200) {
        console.log(`[PASS] http://localhost:3000${file} laeti edukalt (200 OK)`);
      } else {
        console.error(`[FAIL] http://localhost:3000${file} tagastas staatuse ${res.status}`);
      }
    } catch (err) {
      console.error(`[FAIL] Kohaliku serveriga ei saanud ühendust faili ${file} jaoks:`, err.message);
    }
  }
}

async function testNominatimGeocoding() {
  console.log("\n--- Test 2: Nominatimi Geokodeerimise API kontroll ---");
  const testAddresses = ['Erminurme tee 22', 'Tartu Kesklinn'];
  for (const addr of testAddresses) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr + ', Tartu')}&format=json&limit=1`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SmartDepartureTest/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        console.log(`[PASS] Geokodeerimine '${addr}': leiti koordinaadid (${data[0].lat}, ${data[0].lon})`);
      } else {
        console.error(`[FAIL] Geokodeerimine '${addr}': tulemusi ei leitud`);
      }
    } catch (err) {
      console.error(`[FAIL] Geokodeerimine '${addr}' ebaõnnestus veaga:`, err.message);
    }
  }
}

async function testPeatusEeProxy() {
  console.log("\n--- Test 3: Peatus.ee proxy (GraphQL) kontroll ---");
  const query = `
    query {
      plan(
        from: { lat: 58.3902, lon: 26.7586 },
        to: { lat: 58.3735, lon: 26.7263 },
        arriveBy: false,
        time: "18:00:00",
        date: "2026-07-06",
        numItineraries: 1,
        transportModes: [{ mode: WALK }, { mode: TRANSIT }]
      ) {
        itineraries {
          duration
          legs {
            mode
            duration
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('http://localhost:3000/api/peatus-ee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (data.data?.plan?.itineraries?.length > 0) {
      const it = data.data.plan.itineraries[0];
      const legBreakdown = it.legs.map(l => `${l.mode}: ${Math.round(l.duration/60)}m`).join(' -> ');
      console.log(`[PASS] Peatus.ee proxy toimib: teekonna kestus ${Math.round(it.duration/60)} min (${legBreakdown})`);
    } else {
      console.error("[FAIL] Peatus.ee proxy: teekondi ei tagastatud või ilmnes viga:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("[FAIL] Ühendus Peatus.ee proxy-ga ebaõnnestus:", err.message);
  }
}

async function runTests() {
  console.log("KÄIVITAN AUTOMAATSED INTEGRATSIOONITESTID...\n");
  await testLocalServer();
  await testNominatimGeocoding();
  await testPeatusEeProxy();
  console.log("\nTESTIMINE LÕPETATUD.");
}

runTests();
