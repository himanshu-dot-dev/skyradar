# SkyRadar 🛰️✈️
> **Real-Time 3D Global Flight Tracker** — An open-source, hardware-accelerated 3D flight tracking platform built on CesiumJS, React 19, TypeScript, and live community ADS-B feeds.

---

## 🌟 Overview

SkyRadar delivers a full-screen, photorealistic 3D Earth globe floating in space. Users can rotate, zoom, tilt, explore global flight corridors, and inspect aircraft navigating in real time above their actual geographical coordinates.

Built with a **$0 budget constraint**, SkyRadar leverages:
- **CesiumJS** WGS84 true ellipsoidal 3D Earth geometry with atmospheric Rayleigh scattering.
- **NASA GIBS Blue Marble Next Generation** (public domain WMTS) and **CartoDB Dark Matter** satellite/radar imagery.
- **Airplanes.live** and **adsb.lol** community ADS-B networks for live terrestrial aircraft tracking.
- **hexdb.io** free Mode-S metadata enrichment for airlines, registrations, and aircraft types.
- Client-side **dead reckoning linear extrapolation** ensuring 60 FPS motion without stuttering between data updates.

---

## 🏗️ Architecture

```
skyradar/
├── client/              # React 19 + TypeScript + Vite 6 + CesiumJS
│   ├── src/
│   │   ├── components/
│   │   │   ├── CesiumGlobe/   # 3D Earth viewer & camera controls
│   │   │   ├── Controls/      # HUD layer & camera navigation toolbar
│   │   │   └── Header/        # Tactical radar header & UTC ZULU clock
│   │   ├── store/             # Zustand state management
│   │   └── App.tsx            # Main application layout
│   └── public/cesium/         # Cesium static workers & imagery assets
├── server/              # Node.js + Express + TypeScript backend (Phase 3)
└── shared/              # Shared TypeScript interfaces (NormalizedAircraft, etc.)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+ or v24 LTS
- **npm**: v10+

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/skyradar.git
   cd skyradar
   ```

2. **Install all monorepo dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
   npm run dev:client
   ```
   Open `http://127.0.0.1:5173/` in your browser.

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Rotate Globe** | Left Click + Drag |
| **Zoom In / Out** | Mouse Wheel OR Right Click + Drag |
| **Tilt Horizon** | Middle Click / Scroll Wheel Click + Drag |
| **Reset View** | Click Rotate Icon (HUD Toolbar) |
| **Align North Up** | Click Compass Icon (HUD Toolbar) |
| **Aviation Hubs** | Click airport shortcut buttons (`LHR`, `JFK`, `HND`, `DXB`, etc.) |
| **Imagery Switcher**| Toggle between NASA Blue Marble, Tactical Dark, and Offline Natural Earth |
| **Day / Night Terminator** | Toggle Sun icon in HUD toolbar |

---

## 📦 Build for Production

```bash
# Build client production bundle
npm run build:client

# Preview built application
npm --workspace=client run preview
```

---

## 📜 Licensing & Attribution

- **CesiumJS**: Apache 2.0 License.
- **NASA GIBS**: NASA Earth Science Data and Information System (EOSDIS) open public domain data.
- **OpenStreetMap / CARTO**: © OpenStreetMap contributors, © CARTO.
- **Airplanes.live & adsb.lol**: Community-fed ADS-B networks under ODbL 1.0.
