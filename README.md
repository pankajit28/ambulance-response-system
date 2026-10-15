# Emergency Ambulance Response System

Real-time ambulance dispatch platform for patients, drivers, and dispatchers.

**Stack:** React (Vite) · Node.js · Express · MongoDB · Socket.IO · Leaflet / OpenStreetMap

## Architecture

- Patients request help and watch live ambulance tracking.
- Drivers receive nearby emergencies, accept a request, and stream GPS.
- Dispatchers see all open requests and fleet status.
- Socket.IO rooms (`user:<id>`, `driver:<id>`, `request:<id>`) carry location and status events.

## Prerequisites

- Node.js 18+
- MongoDB (local) **or** a MongoDB Atlas connection string

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Edit `backend/.env` and set `MONGO_URI` if MongoDB is not on `localhost:27017`.

The API listens on **http://localhost:5000**.

Optional demo data (patients, drivers, ambulances):

```bash
npm run seed
```

Seed logins:

| Role       | Email                   | Password   |
|------------|-------------------------|------------|
| Patient    | patient@demo.com        | password123 |
| Driver     | driver@demo.com         | password123 |
| Dispatcher | dispatcher@demo.com     | password123 |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI is at **http://localhost:5173**.

Allow location access in the browser so maps and GPS updates work.

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register patient, driver, or dispatcher |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/emergencies` | Patient | Create emergency request |
| GET | `/api/emergencies/mine` | Yes | Own requests |
| GET | `/api/emergencies/pending` | Driver/Dispatcher | Open requests |
| PATCH | `/api/emergencies/:id/status` | Driver/Dispatcher | Update request status |
| PATCH | `/api/ambulances/me/status` | Driver | `available` / `busy` |
| PATCH | `/api/ambulances/me/location` | Driver | Update GeoJSON point |
| GET | `/api/ambulances/nearby?lng=&lat=&maxDistance=` | Yes | Nearby available units |

## Socket.IO events

**Client → server**

- `join:user` `{ userId }`
- `join:driver` `{ driverId }`
- `join:request` `{ requestId }`
- `location:update` `{ requestId, lng, lat, ambulanceId? }`
- `request:accept` `{ requestId, ambulanceId }`

**Server → client**

- `ambulance:location` live GPS
- `request:new` new nearby emergency
- `request:accepted` assignment to patient + driver rooms
- `request:status` status changes
- `error` validation / permission errors

## Project layout

```
backend/          Express API, Mongoose models, Socket.IO
frontend/         React dashboards and Leaflet map
```
