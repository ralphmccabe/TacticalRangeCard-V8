# Tactical Range Card (TRC-V8)
### Precision Ballistics, DOPE Management & Tactical ISR C4ISR Suite
**Version:** `v8.77.5.6`  
**License:** MIT  

---

## 🎯 Overview
**Tactical Range Card V8** is an advanced tactical computing platform combining precision long-range ballistics, environmental atmospheric solvers, DOPE library generation, and real-time **Tactical ISR (Intelligence, Surveillance, and Reconnaissance)** multi-device sensor streaming.

---

## ⚡ Window 7: Tactical ISR & Multi-Feed Matrix

Window 7 transforms TRC into a full squad-level **C4ISR (Command, Control, Communications, Computers, Intelligence, Surveillance, and Reconnaissance)** tactical video hub:

* **2x2 Multi-Cam Squad Grid**: Simultaneous real-time streaming across 4 operational channels:
  * **Tile 1 (Air-1 Drone)**: Aerial overview & drone recon.
  * **Tile 2 (Lead Bodycam)**: Primary field operator chest-rig stream (`feed-body-1`).
  * **Tile 3 (Point Scout)**: Point scout pack-mount / Chromebook stream (`feed-body-2`).
  * **Tile 4 (Base C2 Command)**: Base Command Post PC integrated webcam or screen share (`feed-base-c2`).
* **Smart Collision Avoidance**: Automatically detects device types (Desktop PC, Mobile Phone, Chromebook) and inspects active network channels to prevent stream collisions.
* **Direct Role Deep-Links**: Launch any device directly into its designated tactical role via URL parameters:
  * Point Scout: `https://<YOUR_IP>:8443/?role=scout`
  * Lead Bodycam: `https://<YOUR_IP>:8443/?role=lead`
  * Base C2 Command: `https://<YOUR_IP>:8443/?role=c2`
* **Geo Matrix & Intel Vault Integration**: Pin live asset positions (PC Command, Mobile Rig, Scout) with custom tactical badges, live GPS coordinates, and snapshot imagery directly to the Leaflet satellite map and encrypted Intel Vault.

---

## 🚀 How to Run the Local Squad Mesh Server

To stream live video and sensor telemetry between PCs, phones, and Chromebooks over your local Wi-Fi network:

### 1. Start the Relay Server
On your main PC / Command Post:
* **Option A**: Double-click `START_MOBILE_SERVER.bat`
* **Option B**: Run via Node.js in terminal:
  ```bash
  node serve_mobile.js
  ```

### 2. Connect Squad Devices (Same Wi-Fi Network)
* **Command Desk (PC)**: Open `https://localhost:8443` or `http://localhost:8080`.
* **Lead Bodycam (Phone)**: Scan the QR code in Window 7 or navigate to `https://<YOUR_PC_IP>:8443/?role=lead`.
* **Point Scout (Chromebook / Second Device)**: Open `https://<YOUR_PC_IP>:8443/?role=scout`.

> **Note on SSL / HTTPS**: Mobile browsers require a secure HTTPS context to grant camera access. When opening port `8443` for the first time, tap **"Advanced" &rarr; "Proceed"** to accept the local Wi-Fi encryption certificate.

---

## ☁️ Cloud & GitHub Pages Deployment

* **GitHub Pages**: When hosted statically on GitHub Pages, the full ballistics suite, DOPE calculators, range cards, and simulation feeds run entirely client-side in the browser.
* **Live Video Relay**: Live video streaming between separate devices requires an active relay backend (`serve_mobile.js`). For field squads on local Wi-Fi/hotspots, the local Node server runs on any laptop. For global multi-user internet streaming, the relay backend can be hosted on cloud platforms (Render, Railway, Fly.io, or VPS).

---

## 📂 Key Architecture Files

* `index.html`: Tactical Range Card single-page application and Window 7 structure.
* `isr_logic.js`: Multi-channel ISR engine, 2x2 grid renderer, device camera broadcasting, and telemetry cache.
* `serve_mobile.js`: High-performance HTTP/HTTPS static server and ultra-low-latency JPEG/telemetry relay API.
* `sw.js`: Service Worker providing offline caching and progressive web app (PWA) installation.
* `VERSION_HISTORY.txt`: Exhaustive technical change logs and version notes.
