# 🗺️ Smart Departure – Nutikas teekonna ja lahkumisaja planeerija

**Smart Departure** on mobiilile optimeeritud kaasaegne veebirakendus, mis aitab arvutada optimaalset lahkumisaega, et jõuda sihtkohta täpselt soovitud kellaajaks. Rakendus arvestab valitud transpordivahendi (jalgratas, ühistransport/buss, auto, kõndimine) kiirusi ja reaalseid sõiduplaane.

---

## 🚀 Peamised funktsioonid

* **Transpordivahendite võrdlus:** Vali jalgratta, bussi, auto või kõndimise vahel. Kestused kuvatakse mugavalt vahelehtedel (tab-idel).
* **Kiiruse skaleerimine:** Slaideri abil saad reguleerida oma eeldatavat liikumiskiirust (v.a ühistranspordil, mis käib graafiku järgi).
* **Lähimate peatuste tuvastamine (Overpass API tagasilangus):** Kui bussiinfo päring `peatus.ee` serverist ei õnnestu, otsib rakendus automaatselt üles tegelikud lähimad bussipeatused algus- ja sihtkohale ning arvutab teekonna pikkused ja kõndimisajad nende baasil.
* **Täpne teekond mööda teid (OSRM tagasilangus):** Kui põhiline marsruutimisteenus on kättesaamatu, laeb rakendus teekonna OSRM-i kaudu, et joonistada teekonnajoon piki tänavaid, mitte linnulennult.
* **Jalgsi ja bussiaja visuaalne eristamine:** Nii tulemuskaardil kui ka graafikuaknas on selgelt näha, kui kaua peab kõndima ja kui kaua bussiga sõitma (nt `Kestus: 21 min (Jalgsi 8 min + Buss 13 min)`).
* **Aadressi autocomplete:** Nominatim (OpenStreetMap) mootoril põhinev aadressiotsing pakub kirjutamise ajal reaalajas soovitusi.
* **Asukoha valik otse kaardilt:** Tee kaardil klõps, et määrata punkt alguskohaks, sihtkohaks või lisada see vahepunktiks.
* **Mitme vahepunkti tugi:** Lisa oma teekonnale sujuvalt lisapeatusi.

---

## 🛠️ Tehniline ülesehitus

* **Esiliides (Frontend):** Puhas HTML5, CSS3 (mobiilisõbralik, pimeda režiimi esteetika) ja Vanilla JavaScript.
* **Kaardimootor:** Leaflet.js koos OpenStreetMap kaardikihtidega.
* **Tagaliides (Backend / Proxy):** Node.js põhine lihtne server, mis lahendab brauseri CORS piirangud ühistranspordi päringute tegemisel.

---

## 💻 Kohalik käivitamine

### 1. Vali lihtne käivitus (ainult esiliides)
Ava fail `index.html` otse veebibrauseris. Tänu sisseehitatud OSRM ja Overpass API tagasilangustele joonistuvad teekonnad mööda teid ja lähimate peatuste simulatsioon töötab ilma täiendava serverita!

### 2. Käivita koos proksiserveriga (soovitatav)
Kui soovid kasutada reaalset `peatus.ee` ühistranspordi andmebaasi:
1. Veendu, et sul on paigaldatud **Node.js** (versioon 18+).
2. Ava terminal projekti kaustas.
3. Käivita server:
   ```bash
   node server.js
   ```
4. Ava brauseris: [http://localhost:3000](http://localhost:3000)

---

## 🌐 Paigaldamine Renderisse (Hostimine)

Rakendus on ette valmistatud tasuta majutuseks teenuses **Render**:

1. Logi sisse **[Render.com](https://dashboard.render.com/)** keskkonda oma GitHubi kontoga.
2. Loo uus **Web Service**.
3. Ühenda repositoorium `teekonna_planeerija`.
4. Seadista:
   * **Runtime:** `Node`
   * **Start Command:** `npm start`
   * **Instance Type:** `Free`
5. Render ehitab rakenduse automaatselt ja loob sulle avaliku URL-i, mille kaudu saad rakendust kasutada igal ajal ka oma nutitelefonist.
