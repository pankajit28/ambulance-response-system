import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { connectSocket, disconnectSocket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [coords, setCoords] = useState(null);
  const [notes, setNotes] = useState("");
  const [request, setRequest] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      setCoords({ lng: 77.209, lat: 28.6139 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => {
        setStatusMsg("Using default map center. Enable location for live tracking.");
        setCoords({ lng: 77.209, lat: 28.6139 });
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    api(`/ambulances/nearby?lng=${coords.lng}&lat=${coords.lat}&maxDistance=20000`)
      .then((data) => setNearby(data.ambulances || []))
      .catch(() => setNearby([]));
  }, [coords]);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit("join:user", { userId: user.id });

    const onAccepted = ({ request: next }) => {
      setRequest(next);
      socket.emit("join:request", { requestId: next._id });
    };
    const onStatus = ({ request: next }) => setRequest(next);
    const onLocation = (payload) => {
      if (!payload) return;
      setAmbulancePos({ lng: payload.lng, lat: payload.lat, id: payload.ambulanceId });
    };

    socket.on("request:accepted", onAccepted);
    socket.on("request:status", onStatus);
    socket.on("ambulance:location", onLocation);

    return () => {
      socket.off("request:accepted", onAccepted);
      socket.off("request:status", onStatus);
      socket.off("ambulance:location", onLocation);
      disconnectSocket();
    };
  }, [user.id]);

  const requestHelp = async () => {
    setError("");
    try {
      const data = await api("/emergencies", {
        method: "POST",
        body: { lng: coords.lng, lat: coords.lat, notes },
      });
      setRequest(data.request);
      connectSocket().emit("join:request", { requestId: data.request._id });
    } catch (err) {
      setError(err.message);
    }
  };

  const ambulanceMarkers = useMemo(() => {
    if (ambulancePos) {
      return [
        {
          id: ambulancePos.id || "live",
          lat: ambulancePos.lat,
          lng: ambulancePos.lng,
          label: "Assigned ambulance",
          status: request?.status,
        },
      ];
    }
    return nearby.map((a) => ({
      id: a._id,
      lat: a.location.coordinates[1],
      lng: a.location.coordinates[0],
      label: a.vehicleNumber,
      status: a.status,
    }));
  }, [ambulancePos, nearby, request]);

  const center = coords ? [coords.lat, coords.lng] : [28.6139, 77.209];

  return (
    <section className="dashboard">
      <div className="panel">
        <h1>Request an ambulance</h1>
        <p className="muted">Help is dispatched to your current location.</p>
        {statusMsg && <p className="muted">{statusMsg}</p>}
        {error && <p className="error">{error}</p>}

        <label>
          What happened?
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Short description for the dispatcher"
          />
        </label>

        <button
          className="btn danger"
          disabled={!coords || (request && request.status !== "completed")}
          onClick={requestHelp}
        >
          {request && request.status !== "completed" ? "Request in progress…" : "Request ambulance"}
        </button>

        {request && (
          <div className="status-box">
            <strong>Status:</strong> {request.status.replace("_", " ")}
            {request.ambulance && (
              <p>
                Vehicle {request.ambulance.vehicleNumber}
                {request.driver ? ` · ${request.driver.name}` : ""}
              </p>
            )}
          </div>
        )}

        <h2>Nearby units</h2>
        <ul className="list">
          {nearby.length === 0 && <li className="muted">No available ambulances in range.</li>}
          {nearby.map((a) => (
            <li key={a._id}>
              {a.vehicleNumber} — {a.status}
            </li>
          ))}
        </ul>
      </div>
      <MapView
        center={center}
        patient={coords}
        ambulances={ambulanceMarkers}
      />
    </section>
  );
}
