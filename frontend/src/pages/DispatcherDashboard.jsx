import { useEffect, useState } from "react";
import { api } from "../api/client";
import { connectSocket, disconnectSocket } from "../socket/socket";
import MapView from "../components/MapView";

export default function DispatcherDashboard() {
  const [requests, setRequests] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [live, setLive] = useState({});

  const load = async () => {
    const [pending, fleet] = await Promise.all([
      api("/emergencies/pending"),
      api("/ambulances"),
    ]);
    setRequests(pending.requests || []);
    setAmbulances(fleet.ambulances || []);
  };

  useEffect(() => {
    load().catch(() => {});
    const socket = connectSocket();

    const refresh = () => load().catch(() => {});
    const onLocation = (payload) => {
      if (!payload?.ambulanceId) return;
      setLive((prev) => ({
        ...prev,
        [payload.ambulanceId]: { lng: payload.lng, lat: payload.lat },
      }));
    };

    socket.on("request:new", refresh);
    socket.on("request:accepted", refresh);
    socket.on("request:status", refresh);
    socket.on("ambulance:location", onLocation);

    return () => {
      socket.off("request:new", refresh);
      socket.off("request:accepted", refresh);
      socket.off("request:status", refresh);
      socket.off("ambulance:location", onLocation);
      disconnectSocket();
    };
  }, []);

  const markers = ambulances.map((a) => {
    const override = live[a._id];
    return {
      id: a._id,
      lat: override?.lat ?? a.location.coordinates[1],
      lng: override?.lng ?? a.location.coordinates[0],
      label: a.vehicleNumber,
      status: a.status,
    };
  });

  return (
    <section className="dashboard">
      <div className="panel">
        <h1>Dispatch board</h1>
        <h2>Open emergencies</h2>
        <ul className="list">
          {requests.length === 0 && <li className="muted">Queue is empty.</li>}
          {requests.map((r) => (
            <li key={r._id}>
              <strong>{r.patient?.name}</strong> — {r.status}
              <div className="muted">{r.notes || "No notes"}</div>
            </li>
          ))}
        </ul>
        <h2>Fleet</h2>
        <ul className="list">
          {ambulances.map((a) => (
            <li key={a._id}>
              {a.vehicleNumber} · {a.status} · {a.driver?.name}
            </li>
          ))}
        </ul>
      </div>
      <MapView center={[28.6139, 77.209]} ambulances={markers} zoom={12} />
    </section>
  );
}
