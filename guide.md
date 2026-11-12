# PANDUAN MEMULA — Cara Menjalankan Projek Smart Garden

**Untuk:** Student yang pertama kali guna projek ni
**Masa yang diperlukan:** ± 30 minit (sekali sahaja)
**Perkara yang akan anda capai:** Dashboard Smart Garden berjalan di browser anda, dan anda faham cara demo depan examiner

---

## BAHAGIAN 0 — Anda perlu tahu 3 benda je dulu

| Perkataan | Maksud simple |
|---|---|
| **Terminal** | Tempat taip arahan (macam ruang chat dengan komputer) |
| **Node.js** | Program yang diperlukan untuk jalankan website ni |
| **npm** | Alat yang datang bersama Node.js — dia pasang bahan-bahan projek |

Website ni **tidak** perlu upload ke internet untuk diuji. Ia jalan dalam komputer anda sendiri.

---

## BAHAGIAN 1 — Install Node.js (sekali sahaja)

1. Buka browser, pergi ke: **https://nodejs.org**
2. Klik butang hijau **"LTS"** (versi stabil, jangan pilih "Current")
3. Fail installer akan turun — buka fail tu, klik **Next → Next → Install** (biar semua default)
4. Selepas siap, kita uji sama ada berjaya:
   - Tekan kekunci **Windows**, taip **`cmd`**, tekan Enter (kotak hitam akan keluar)
   - Taip ini, tekan Enter:
     ```
     node -v
     ```
   - Kalau keluar nombor macam `v22.11.0` → **BERJAYA** ✅
   - Kalau keluar `'node' is not recognized` → restart komputer, cuba lagi. Masih gagal? Hubungi saya.

---

## BAHAGIAN 2 — Install VS Code (tempat buka code)

1. Pergi ke: **https://code.visualstudio.com**
2. Klik **Download for Windows**, install macam biasa (Next → Next → Finish)
3. Bila install, TANDA tick ✅ pilihan **"Add to PATH"** kalau ada (penting!)

> VS Code ni macam Microsoft Word, tapi untuk code. Anda tak perlu paham code dulu — guna dia cuma untuk buka folder projek dan terminal.

---

## BAHAGIAN 3 — Dapatkan fail projek

1. Saya akan bagi anda **folder zip** nama `plant-it`
2. **Right-click** fail zip → **Extract All** → pilih lokasi senang dijumpai, contoh `D:\Projek\`
3. Anda akan dapat folder `plant-it` — **JANGAN rename atau buang mana-mana fail dalamnya**

---

## BAHAGIAN 4 — Jalankan projek (routine utama) 🚀

Ikut ini **setiap kali** nak buka dashboard:

**Step 1** — Buka folder projek dalam VS Code:
- Buka VS Code → **File → Open Folder** → pilih folder `plant-it` → klik **Select Folder**

**Step 2** — Buka terminal DALAM VS Code:
- Tekan **Ctrl + `** (kekunci di bawah Esc, sebelah nombor 1)
- Atau menu **Terminal → New Terminal** (kotak hitam keluar di bawah)

**Step 3** — Pasang bahan projek (hanya **kali pertama sahaja**):
- Taip ini, tekan Enter:
  ```
  npm install
  ```
- Tunggu 1–5 minit. Ia akan turun banyak fail (norma, jangan panik). Kena ada **internet**.

**Step 4** — Hidupkan website:
- Taip ini, tekan Enter:
  ```
  npm run dev
  ```
- Akan keluar tulisan macam ni:
  ```
  ➜  Local:  http://localhost:5173/
  ```

**Step 5** — Buka browser (Chrome/Edge), taip alamat:
```
http://localhost:5173
```

🎉 **Siap!** Dashboard Smart Garden akan keluar.

> **PENTING:** Biarkan terminal tu terbuka (jangan tutup selagi nak guna website). Nak berhenti? Klik terminal, tekan **Ctrl + C**. Nak buka lagi? Ulang Step 4 sahaja.

---

## BAHAGIAN 5 — Apa yang anda akan nampak

- **4 kad pasu** di atas — Pasu 3 nama **Pak Choy 🥬** dengan angka yang bergerak sendiri (dia main *replay* data sebenar sebulan, 1 saat = 30 minit data)
- **Pasu 1, 2 dan 4** akan tunjuk **`--` / Unavailable** — ini BETUL, bukan rosak. Pasu tu memang belum ada sensor
- **Pasu 4** ada badge **Sensor Fault** — itu contoh demo bila sensor rosak
- Bawah sikit ada **Water Tank** dan **Ambient** (suhu bilik)
- Ada **switch "Display Mode"** atas kanan header — klik untuk paparan skrin penuh (untuk wall display), tekan **Esc** untuk keluar
- Angka moisture Pasu 3 akan berubah sendiri tiap beberapa saat — itu data replay hidup

---

## BAHAGIAN 6 — Masalah biasa & penyelesaian 🔧

| Masalah | Punca | Penyelesaian |
|---|---|---|
| `'npm' is not recognized` | Node.js belum terpasang / terminal lama | Install Node (Bahagian 1), **tutup dan buka semula** terminal, cuba lagi |
| `npm install` stuck / gagal | Internet tak stabil | Check internet, padam folder `node_modules` dalam projek, taip `npm install` semula |
| Port 5173 dah digunakan | Terminal lain masih run | Tutup semua terminal, atau taip `npm run dev -- --port 3000` dan buka `localhost:3000` |
| Browser blank putih | Terminal sudah tertutup | Buka semula terminal, run `npm run dev` semula |
| Warning kuning masa `npm install` | Biasa sahaja | Abaikan, asalkan akhirnya ada `added xxx packages` |

Masih gagal? **Screenshot** error tu dan hantar kepada saya. Jangan cuba teka-teki padam fail.

---

## BAHAGIAN 7 — Peraturan emas 📜

1. **JANGAN padam atau rename** folder `src/` — situ semua code projek
2. Folder `node_modules` BOLEH padam (dia auto-regenerate dengan `npm install`)
3. Edit code hanya guna VS Code, bukan Notepad
4. Setiap kali saya bagi fail baru, ganti fail lama, pastu refresh browser (Ctrl + R)

---

## Glosari mini

- **`npm install`** = pasang bahan-bahan projek (kali pertama je)
- **`npm run dev`** = hidupkan website dalam komputer sendiri
- **`localhost:5173`** = alamat website dalam komputer anda (tak keluar ke internet)
- **Terminal** = kotak hitam untuk taip arahan
- **`Ctrl + C`** = hentikan website

---

## BAHAGIAN 8 — Cara demo depan examiner 🎬

Gunakan checklist ni supaya demo smooth dan kena dengan markah rubrik:

**Persediaan (5 minit sebelum masuk bilik):**
- Terminal dah run (`npm run dev`), website dah buka kat `localhost:5173`
- Saiz browser 100% (Ctrl + 0 kalau tak pasti)
- Tutup tab lain, notifikasi mute

**Aliran demo (ikut urutan):**

1. **Buka dashboard** — tunjuk 4 kad pasu. Cakap: "4 pasu, tapi hanya Pasu 3 ada sensor (replay data Pak Choy sebulan). Pasu lain tunjuk Unavailable sebab takde sensor — kami tak tipu-t tipu nombor."
2. **Pasu 3** — tunjuk moisture berubah sendiri (tunggu 10 saat). Cakap: "1 saat = 30 minit data, sebulan loop dalam 24 minit." Tunjuk history strip "120 recorded readings."
3. **Pasu 4** — tunjuk badge **Sensor Fault** + "Last valid X.X". Cakap: "Ini demo bila sensor pH rosak — sistem tak guna nombor lama, dia bagi tahu bila last valid reading."
4. **Room temp chip** atas kad — "Suhu bilik dipapar kat setiap kad, sebab kami tiada sensor per-pasu, jadi kongsi sensor satu bilik."
5. **Display Mode** — klik switch atas kanan, tunjuk paparan skrin penuh. Tekan **Esc** untuk keluar. "Ini untuk wall display 24/7."
6. **Offline demo** — buka tab baru, taip `http://localhost:5173/?offline=1`. Tunjuk banner merah "Raspberry Pi Offline." Cakap: "Kalau Pi mati, dashboard tak padam — dia keep last valid data, tapi label jelas."
7. **Mobile** — kecilkan browser ke lebar phone (atau buka DevTools → device mode). Tunjuk card auto-stack, takde horizontal scroll.

**Kalau examiner tanya "AI tu macam mana?":**
- Jawab: "Bukan ML/LLM, tapi scoring function tempatan. Banding suhu/kelembapan/cahaya bilik dengan kesukaan 13 pokok dalam katalog, bagi markah 0–100, tertinggi menang. Pasu 3 kunci Pak Choy sebab replay data dia. Threshold moisture/pH pasu pun auto-tukar ikut kesukaan pokok tu."
- Kalau tanya "kenapa tak guna ChatGPT?" → "Sebab ni wall display 24/7, kena offline-stable & percuma. Tapi kami ada rancang Groq sebagai chatbot tambahan (Bahagian 9)."

**Kalau examiner tanya "mana real data?":**
- Jawab: "Sekarang guna data contoh (replay Pak Choy sebulan) untuk demo. Bila sambung sensor real, ganti fungsi `fetch*` dalam `src/data/mockPlantData.ts` dengan API call — types dan UI tak payah tuka."

---

## BAHAGIAN 9 — Checklist integrasi Groq AI (tambahan) 🤖

Kalau nak tambah fitur AI betul dengan Groq, ikut ni:

**Persediaan:**
- Daftar akaun percuma di **console.groq.com**, ambil API key
- `npm install openai` (Groq guna format OpenAI-compatible)

**Backend (FastAPI, dalam Pi):**
- Buat endpoint `POST /api/ai/advice`
- Terima data sensor dari frontend (moisture, pH, suhu, kelembapan, cahaya)
- Bina prompt: "Anda pembantu kebun. Data sensor: {...}. Jawab 3 ayat."
- Call Groq API:
  - baseURL: `https://api.groq.com/openai/v1`
  - model: `llama-3.3-70b-versatile`
- Balikkan jawapan sebagai JSON

**Frontend:**
- Tambah panel/card "Tanya AI" yang call endpoint tu
- Papar jawapan Groq
- **JANGAN** letak API key dalam code frontend — simpan dalam backend sahaja!

**Demo Groq (kalau dah siap):**
1. Buka dashboard, tunjuk data live
2. Klik "Tanya AI"
3. Soalan contoh: "Moisture pasu saya 45%, apa patut buat?"
4. Tunjuk Groq jawab berdasarkan data sebenar

**Kegunaan dalam slide:**
- Kita guna 2 teknik AI: formula scoring tempatan (pilih pokok sesuai pasu — pantas, offline, percuma) + Groq LLM (nasihat penjagaan dalam bahasa manusia)
- Tunjuk korang faham bila nak guna AI apa
- Kalau tanya "kenapa Groq bukan ChatGPT?": percuma (free tier), sangat laju, API OpenAI-compatible (senang tukar provider)

---

## Rujukan pantas (fail penting)

| Fail | Fungsi |
|---|---|
| `src/data/systemConfig.ts` | Threshold, which pots AI, tank config |
| `src/utils/plantAdvisor.ts` | Scoring AI, applyAssignments, watering targets |
| `src/data/plantCatalog.ts` | 13 pokok + kesukaan diaorang |
| `src/data/mockPlantData.ts` | Data contoh (replay Pak Choy) |
| `src/data/api.ts` | Adapter untuk backend real |
| `src/components/dashboard/PotCard.tsx` | Card pasu |
| `src/pages/Dashboard.tsx` | Layout utama |
| `src/index.css` | Warna & theme |

---

**Nota akhir:** Kalau stuck, screenshot error + hantar kepada saya. Jangan cuba teka-teki padam fail. 🌱
