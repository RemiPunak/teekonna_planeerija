# Smart Departure – Nutikas lahkumisaja planeerija

**Smart Departure** on mobiilisõbralik veebirakendus, mis aitab planeerida optimaalset lahkumisaega vastavalt soovitud sihtkohta saabumise kellaajale. Rakendus toetab erinevaid transpordiviise (jalgratas, ühistransport/buss, auto ja kõndimine) ning kuvab teekonna reaalajas kaardil.

Projekt on loodud õppeotstarbeliseks või isiklikuks kasutamiseks teekondade planeerimisel ja ühistranspordi graafikute analüüsimisel.

---

## Peamised funktsioonid

1. **Erinevad transpordiliigid:**
   * **Jalgratas, auto ja kõndimine:** Teekonna kestus ja lahkumisaeg kohandatakse vastavalt kiiruse liugurile (slider).
   * **Ühistransport (buss):** Kasutab reaalseid graafikuandmeid.

2. **Täpne teekond mööda teid (OSRM Tagasilangus):**
   * Kui peamine routing API tõrgub või tekivad CORS-i piirangud, lülitub rakendus sujuvalt ümber **OSRM (Open Source Routing Machine)** teenusele, et joonistada teekond täpselt mööda tänavavõrku (mitte linnulennult).

3. **Lähimate bussipeatuste otsing (Overpass API):**
   * Kui `peatus.ee` serverist ei leita graafikuinfot, otsib rakendus **Overpass API** abil reaalset lähimat bussipeatust (2 km raadiuses).
   * Arvutab eraldi jalgsi peatusesse kõndimise aja ja bussi sõiduaja, liites need kokku ning kuvades need visuaalselt eristatavana (nt tulemuskaardil ja graafikus: *Jalgsi 6 min + Buss 10 min*).

4. **Aadressi otsingu autocomplete:**
   * Nii pealehel kui ka seadete modaalis on integreeritud **Nominatim (OpenStreetMap)** aadressiotsing, mis pakub kirjutamise ajal reaalajas soovitusi.

5. **Asukoha määramine otse kaardilt:**
   * Kaardile klõpsates avaneb popup-menüü, kust saab valida punkti otse alguskohaks, sihtkohaks või vahepunktiks.

6. **Vahepunktide lisamine:**
   * Teekonnale saab dünaamiliselt lisada mitu vahepunkti ja neid kustutada.

---

## Failistruktuur

* `index.html` - Rakenduse kasutajaliides ja struktuur.
* `index.css` - Stiilifail (mobiilidisain, ujuvad kaardid, pimerežiimi värvid).
* `app.js` - Rakenduse põhiloogika (kaardi haldus, teekonna arvutused, API-päringud).
* `server.js` - Kohalik Node.js proksiserver päringute vahendamiseks ja CORS-i probleemide lahendamiseks.

---

## Kuidas käivitada kohalikult

Rakendust saab käivitada kahel viisil:

### Variant 1: Otse brauseris (lihtne käivitus)
Ava fail `index.html` otse oma veebibrauseris (`file:///` protokolliga). 
* *Märkus: Tänu integreeritud OSRM ja Overpass API tagasilangustele toimib teekonna joonistamine ja lähima peatuse arvutamine ka ilma kohaliku serverita!*

### Variant 2: Kohaliku Node.js serveriga (soovitatav)
Kui soovid kasutada reaalseid ühistranspordi graafikuid läbi `peatus.ee` ilma brauseri CORS piiranguteta:

1. Veendu, et sul on arvutisse paigaldatud [Node.js](https://nodejs.org/).
2. Ava terminal projekti kaustas.
3. Käivita server:
   ```bash
   node server.js
   ```
4. Ava brauseris aadress: [http://localhost:3000](http://localhost:3000)

---

## Kuidas kasutada iPhone'is või teistes nutiseadmetes

1. Ühenda oma arvuti ja iPhone samasse Wi-Fi võrku.
2. Otsi oma arvuti IP-aadress (käivita terminalis `ipconfig` ja vaata `IPv4 Address`).
3. Ava iPhone'i brauseris aadress: `http://<arvuti-IP>:3000` (nt `http://192.168.1.15:3000`).

---

## Tasuta veebiserverisse paigaldamine (Deployment)

Kuna tegu on staatilise HTML/JS rakendusega, mida toetab lihtne Node.js proksiserver, saab seda tasuta majutada järgmistes teenustes:

1. **Render (https://render.com) või Railway (https://railway.app):**
   * Sobib suurepäraselt `server.js` (Node.js) käivitamiseks.
   * Ühenda oma GitHubi repositoorium, vali platvormiks **Web Service** ja sisesta käivitusks `node server.js`.

2. **Vercel / Netlify (ainult esiliides):**
   * Kui soovid majutada ainult staatilist esiliidest (`index.html`, `app.js`, `index.css`), saad need otse sinna üles laadida. Rakendus töötab suurepäraselt ka ilma serverita tänu OSRM-i tagasilangusele.
