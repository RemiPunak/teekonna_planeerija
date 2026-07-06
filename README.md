# 🗺️ Smart Departure – Nutikas teekonna ja lahkumisaja planeerija

Smart Departure on mobiilile optimeeritud veebirakendus, mis aitab arvutada optimaalset lahkumisaega, et jõuda sihtkohta täpselt soovitud kellaajaks.

🚀 **Rakendus on üleval aadressil:** [https://teekonna-planeerija.onrender.com/](https://teekonna-planeerija.onrender.com/)

---

## 🌟 Peamised funktsioonid

* **Transpordivahendite valik:** Jalgratas, buss, auto ja kõndimine.
* **Automaatsed tagasilangused:**
  * Kui `peatus.ee` server on kättesaamatu, otsib rakendus **Overpass API** abil üles lähimad bussipeatused ning arvutab teekonna ja kõndimisajad nende baasil.
  * Teekonnad joonistatakse alati mööda teid (mitte linnulennult) kasutades **OSRM** teenust.
* **Aja eristamine:** Tulemuskaardil ja graafikus kuvatakse eraldi jalgsi kõndimise ja bussisõidu aeg.
* **Aadressi autocomplete:** Reaalajas otsingusoovitused (Nominatim).
* **Kaardilt määramine:** Vali alguspunkt, sihtkoht või lisa vahepunkte otse kaardile klõpsates.

---

## 💻 Kohalik käivitamine

1. Veendu, et sul on paigaldatud **Node.js** (versioon 18+).
2. Käivita projekti kaustas terminalis:
   ```bash
   node server.js
   ```
3. Ava brauseris: [http://localhost:3000](http://localhost:3000)
