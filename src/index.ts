import { calculateEndDateWithAvailability } from "./utils/date-utils";
import type { MaintenanceWindow, WorkCenterShift } from "./reflow/types";

const shifts: WorkCenterShift[] = [
  { dayOfWeek: 1, startHour: 8, endHour: 17 },
  { dayOfWeek: 2, startHour: 8, endHour: 17 },
  { dayOfWeek: 3, startHour: 8, endHour: 17 },
  { dayOfWeek: 4, startHour: 8, endHour: 17 },
  { dayOfWeek: 5, startHour: 8, endHour: 17 },
];

const maintenanceWindows: MaintenanceWindow[] = [
  {
    startDate: "2026-06-01T12:00:00Z",
    endDate: "2026-06-01T14:00:00Z",
    reason: "Planned maintenance",
  },
];

const shiftBoundaryEnd = calculateEndDateWithAvailability({
  startDate: "2026-06-01T16:00:00Z",
  durationMinutes: 120,
  shifts,
  maintenanceWindows: [],
});

const maintenanceEnd = calculateEndDateWithAvailability({
  startDate: "2026-06-01T11:00:00Z",
  durationMinutes: 240,
  shifts,
  maintenanceWindows,
});

console.log("Production Schedule Reflow System");
console.log("---------------------------------");

console.log("Shift boundary example:");
console.log("Expected: 2026-06-02T09:00:00Z");
console.log("Actual:  ", shiftBoundaryEnd);

console.log("");

console.log("Maintenance example:");
console.log("Expected: 2026-06-01T17:00:00Z");
console.log("Actual:  ", maintenanceEnd);