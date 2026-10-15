import { useEffect, useState } from "react";
import { api } from "../api/client";
import { connectSocket, disconnectSocket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";

export default function DriverDashboard() {
  const { user, ambulance, setAmbulance } = useAuth();
  const [coords, setCoords] = useState(null);
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/emergencies/pending")
      .then((data) => setPending(data.requests || []))
      .catch((err) => setError(err.message));

    api("/emergencies/mine").then((data) => {
      const open = (data.requests || []).find((r) => r.status !== "completed");
      if (open) setActive(open);
    });
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit("join:driver", { driverId: user.id });

    const onNew = ({ request }) => {
      setPending((list) => [request, ...list.filter((r) => r._id !== request._id)]);
    };
    const onAccepted = ({ request }) => {
      setPending((list) => list.filter((r) => r._id !== request._id));
      if (String(request.driver?._id || request.driver) === String(user.id)) {
        setActive(request);
        socket.emit("join:request", { requestId: request._id });
      }
    };
    const onStatus = ({ request }) => {
      if (String(request.driver?._id || request.driver) === String(user.id)) {
        setActive(request.status === "completed" ? null : request);
      }
    };

    socket.on("request:new", onNew);
    socket.on("request:accepted", onAccepted);
    socket.on("request:status", onStatus);

    return () => {
      socket.off("request:new", onNew);
      socket.off("request:accepted", onAccepted);
      socket.off("request:status", onStatus);
      disconnectSocket();
    };
  }, [user.id]);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setCoords(next);
        const socket = connectSocket();
        socket.emit("location:update", {
          ...next,
          requestId: active?._id,
          ambulanceId: ambulance?._id,
        });
      },
      () => {
        const fallback = { lng: 77.2295, lat: 28.6129 };
        setCoords(fallback);
      },
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, ambulance]);

  const toggleStatus = async () => {
    const status = ambulance?.status === "available" ? "busy" : "available";
    const data = await api("/ambulances/me/status", { method: "PATCH", body: { status } });
    setAmbulance(data.ambulance);
  };

  const accept = (requestId) => {
    connectSocket().emit("request:accept", { requestId, ambulanceId: ambulance?._id });
  };

  const advance = async (status) => {
    if (!active) return;
    try {
      const data = await api(`/emergencies/${active._id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setActive(data.request.status === "completed" ? null : data.request);
    } catch (err) {
      setError(err.message);
    }
  };

  const center = coords ? [coords.lat, coords.lng] : [28.6139, 77.209];
  const patient =
    active?.pickupLocation?.coordinates
      ? {
          lng: active.pickupLocation.coordinates[0],
          lat: active.pickupLocation.coordinates[1],
        }
      : null;

  return (
    <section className="dashboard">
      <div className="panel">
        <h1>Driver console</h1>
        <p className="muted">
          {ambulance?.vehicleNumber || "Ambulance"} · {ambulance?.status || "unknown"}
        </p>
        <button className="btn ghost" type="button" onClick={toggleStatus}>
          Set {ambulance?.status === "available" ? "busy" : "available"}
        </button>
        {error && <p className="error">{error}</p>}

        {active ? (
          <div className="status-box">
            <h2>Active request</h2>
            <p>{active.patient?.name} · {active.status.replace("_", " ")}</p>
            <p className="muted">{active.notes || "No notes"}</p>
            {active.status === "accepted" && (
              <button className="btn" onClick={() => advance("en_route")}>
                Mark en route
              </button>
            )}
            {active.status === "en_route" && (
              <button className="btn" onClick={() => advance("completed")}>
                Complete drop-off
              </button>
            )}
          </div>
        ) : (
          <>
            <h2>Incoming requests</h2>
            <ul className="list">
              {pending.length === 0 && <li className="muted">No pending emergencies.</li>}
              {pending.map((r) => (
                <li key={r._id} className="list-row">
                  <div>
                    <strong>{r.patient?.name || "Patient"}</strong>
                    <div className="muted">{r.notes || "Emergency"}</div>
                  </div>
                  <button className="btn" type="button" onClick={() => accept(r._id)}>
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <MapView
        center={center}
        patient={patient}
        ambulances={
          coords
            ? [{ id: "me", lat: coords.lat, lng: coords.lng, label: "Your unit", status: ambulance?.status }]
            : []
        }
      />
    </section>
  );
}
