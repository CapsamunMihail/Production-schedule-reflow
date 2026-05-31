import type { ReflowInput } from "../reflow/types";

export const delayCascadeScenario: ReflowInput = {
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
      docId: "MO-001",
      docType: "manufacturingOrder",
      data: {
        manufacturingOrderNumber: "MO-001",
        itemId: "PIPE-100",
        quantity: 1000,
        dueDate: "2026-06-05T17:00:00Z",
      },
    },
  ],

  workOrders: [
    {
      docId: "WO-001",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-001",
        manufacturingOrderId: "MO-001",
        workCenterId: "WC-001",
        startDate: "2026-06-01T08:00:00Z",
        endDate: "2026-06-01T10:00:00Z",

        /**
         * Disruption:
         * originally planned as a 2-hour order,
         * but now it requires 4 working hours.
         */
        durationMinutes: 240,

        isMaintenance: false,
        dependsOnWorkOrderIds: [],
      },
    },
    {
      docId: "WO-002",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-002",
        manufacturingOrderId: "MO-001",
        workCenterId: "WC-001",
        startDate: "2026-06-01T10:00:00Z",
        endDate: "2026-06-01T12:00:00Z",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["WO-001"],
      },
    },
    {
      docId: "WO-003",
      docType: "workOrder",
      data: {
        workOrderNumber: "WO-003",
        manufacturingOrderId: "MO-001",
        workCenterId: "WC-001",
        startDate: "2026-06-01T12:00:00Z",
        endDate: "2026-06-01T14:00:00Z",
        durationMinutes: 120,
        isMaintenance: false,
        dependsOnWorkOrderIds: ["WO-002"],
      },
    },
  ],
};