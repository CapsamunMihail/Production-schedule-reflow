import type { ReflowInput } from "../reflow/types";

export const shiftBoundaryScenario: ReflowInput = {
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
        maintenanceWindows: [],
      },
    },
  ],

  manufacturingOrders: [
    {
      docId: "MO-002",
      docType: "manufacturingOrder",
      data: {
        manufacturingOrderNumber: "MO-002",
        itemId: "PIPE-200",
        quantity: 500,
        dueDate: "2026-06-05T17:00:00Z",
      },
    },
  ],

  workOrders: [
    {
      docId: "WO-101",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-101",
        manufacturingOrderId: "MO-002",
        workCenterId: "WC-001",

        /**
         * This order starts one hour before the shift ends.
         * It needs 120 working minutes, so it must continue next day.
         */
        startDate: "2026-06-01T16:00:00Z",
        endDate: "2026-06-01T18:00:00Z",

        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
  ],
};