import type { ReflowInput } from "../reflow/types";

export const maintenanceScenario: ReflowInput = {
  workCenters: [
    {
      docId: "WC-001",
      docType: "workCenter",
      data: {
        name: "Extrusion Line 1",
        shifts: [
          { dayOfWeek: 1, startHour: 8, endHour: 17 },
          { dayOfWeek: 2, startHour: 8, endHour: 17 },
          { dayOfWeek: 3, startHour: 8, endHour: 17 },
          { dayOfWeek: 4, startHour: 8, endHour: 17 },
          { dayOfWeek: 5, startHour: 8, endHour: 17 },
        ],
        maintenanceWindows: [
          {
            startDate: "2026-06-01T12:00:00Z",
            endDate: "2026-06-01T14:00:00Z",
            reason: "Planned maintenance",
          },
        ],
      },
    },
  ],

  manufacturingOrders: [
    {
      docId: "MO-003",
      docType: "manufacturingOrder",
      data: {
        manufacturingOrderNumber: "MO-003",
        itemId: "PIPE-300",
        quantity: 750,
        dueDate: "2026-06-06T17:00:00Z",
      },
    },
  ],

  workOrders: [
    {
      docId: "WO-201",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-201",
        manufacturingOrderId: "MO-003",
        workCenterId: "WC-001",

        /**
         * This order overlaps a maintenance window.
         * The scheduler must pause work between 12:00 and 14:00.
         */
        startDate: "2026-06-01T11:00:00Z",
        endDate: "2026-06-01T15:00:00Z",

        durationMinutes: 240,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
  ],
};