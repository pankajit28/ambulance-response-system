import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const patientIcon = L.divIcon({
  className: "map-pin patient",
  html: '<span class="pin-dot">P</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const ambulanceIcon = L.divIcon({
  className: "map-pin ambulance",
  html: '<span class="pin-dot">A</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center);
  }, [center, map]);
  return null;
}

export default function MapView({
  center = [28.6139, 77.209],
  patient,
  ambulances = [],
  zoom = 14,
}) {
  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        {patient && (
          <Marker position={[patient.lat, patient.lng]} icon={patientIcon}>
            <Popup>Your location</Popup>
          </Marker>
        )}
        {ambulances.map((unit) => (
          <Marker
            key={unit.id}
            position={[unit.lat, unit.lng]}
            icon={ambulanceIcon}
          >
            <Popup>
              {unit.label || "Ambulance"}
              {unit.status ? ` · ${unit.status}` : ""}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
