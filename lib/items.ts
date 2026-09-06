export type ItemDef = { id: string; label: string };

// Pre-Trip / Pre-Deployment checklist (21 items)
export const PRE_ITEMS: ItemDef[] = [
  { id: "battery", label: "Battery charge / condition / security" },
  { id: "brakes", label: "Brakes / parking brakes" },
  { id: "steering", label: "Steering / controls" },
  { id: "frontTyre", label: "Front tyre / wheel condition" },
  { id: "rearTyre", label: "Rear tyre / wheel condition" },
  { id: "tyrePressure", label: "Tyre pressure / visible integrity" },
  { id: "lights", label: "Headlight / rear lights" },
  { id: "indicators", label: "Indicators / signals" },
  { id: "horn", label: "Horn" },
  { id: "mirrorDriver", label: "Driver-side mirror" },
  { id: "mirrorPax", label: "Passenger-side / other mirror(s)" },
  { id: "dashboard", label: "Dashboard / warning indicators" },
  { id: "gps", label: "GPS / tracking (where fitted)" },
  { id: "chargingCable", label: "Charging connection / cable condition" },
  { id: "seats", label: "Seats / passenger area" },
  { id: "bodyPanels", label: "Body panels / visible scratches / dents" },
  { id: "looseParts", label: "Loose, broken or missing components" },
  { id: "unusualSound", label: "Unusual sound / vibration / smell" },
  { id: "cleanliness", label: "Cleanliness / readiness" },
  { id: "safetyKit", label: "Required safety equipment" },
  { id: "other", label: "Other" },
];

// Post-Trip / Return checklist (13 items)
export const POST_ITEMS: ItemDef[] = [
  { id: "brakesSteering", label: "Brakes / steering / controls" },
  { id: "tyres", label: "Tyres / wheels" },
  { id: "lightsSignalsHorn", label: "Lights / signals / horn" },
  { id: "mirrors", label: "Mirrors" },
  { id: "batteryCharging", label: "Battery / charging condition" },
  { id: "dashboard", label: "Dashboard / warning indicators" },
  { id: "gps", label: "GPS / tracking (where fitted)" },
  { id: "bodyPanels", label: "Body panels / scratches / dents" },
  { id: "seats", label: "Seats / passenger area" },
  { id: "looseParts", label: "Loose, broken or missing components" },
  { id: "unusualSound", label: "Unusual sound / vibration / smell" },
  { id: "cleanliness", label: "Cleanliness / readiness" },
  { id: "other", label: "Other" },
];

export type Status = "OK" | "DEFECT" | "N/A";
export type ItemState = { status: Status | ""; note: string; photos: string[] };
