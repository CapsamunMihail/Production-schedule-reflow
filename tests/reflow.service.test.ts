import { describe, expect, it } from "vitest";
import { delayCascadeScenario } from "../src/data/scenario-delay-cascade";
import { maintenanceScenario } from "../src/data/scenario-maintenance";
import { shiftBoundaryScenario } from "../src/data/scenario-shift-boundary";
import { ReflowService } from "../src/reflow/reflow.service";
import type { ReflowInput } from "../src/reflow/types";

describe("ReflowService", () => {
  it("handles delay cascade scenario", () => {
    const service = new ReflowService();

    const result = service.reflow(delayCascadeScenario);

    const wo001 = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-001"
    );
    const wo002 = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-002"
    );
    const wo003 = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-003"
    );

    expect(wo001?.data.startDate).toBe("2026-06-01T08:00:00Z");
    expect(wo001?.data.endDate).toBe("2026-06-01T12:00:00Z");

    expect(wo002?.data.startDate).toBe("2026-06-01T12:00:00Z");
    expect(wo002?.data.endDate).toBe("2026-06-01T14:00:00Z");

    expect(wo003?.data.startDate).toBe("2026-06-01T14:00:00Z");
    expect(wo003?.data.endDate).toBe("2026-06-01T16:00:00Z");

    expect(result.changes).toHaveLength(3);
    expect(result.explanations).toContain("Constraint validation passed.");
  });

  it("handles shift boundary scenario", () => {
    const service = new ReflowService();

    const result = service.reflow(shiftBoundaryScenario);

    const workOrder = result.updatedWorkOrders.find(
      (item) => item.docId === "WO-101"
    );

    expect(workOrder?.data.startDate).toBe("2026-06-01T16:00:00Z");
    expect(workOrder?.data.endDate).toBe("2026-06-02T09:00:00Z");

    expect(result.changes).toHaveLength(1);
    expect(result.explanations).toContain("Constraint validation passed.");
  });

  it("handles maintenance conflict scenario", () => {
    const service = new ReflowService();

    const result = service.reflow(maintenanceScenario);

    const workOrder = result.updatedWorkOrders.find(
      (item) => item.docId === "WO-201"
    );

    expect(workOrder?.data.startDate).toBe("2026-06-01T11:00:00Z");
    expect(workOrder?.data.endDate).toBe("2026-06-01T17:00:00Z");

    expect(result.changes).toHaveLength(1);
    expect(result.explanations).toContain("Constraint validation passed.");
  });

  it("throws an error for circular dependencies", () => {
    const service = new ReflowService();

    const inputWithCircularDependency: ReflowInput = {
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
      manufacturingOrders: [],
      workOrders: [
        {
          docId: "WO-A",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-A",
            manufacturingOrderId: "MO-001",
            workCenterId: "WC-001",
            startDate: "2026-06-01T08:00:00Z",
            endDate: "2026-06-01T09:00:00Z",
            durationMinutes: 60,
            isMaintenance: false,
            dependsOnWorkOrderIds: ["WO-C"],
          },
        },
        {
          docId: "WO-B",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-B",
            manufacturingOrderId: "MO-001",
            workCenterId: "WC-001",
            startDate: "2026-06-01T09:00:00Z",
            endDate: "2026-06-01T10:00:00Z",
            durationMinutes: 60,
            isMaintenance: false,
            dependsOnWorkOrderIds: ["WO-A"],
          },
        },
        {
          docId: "WO-C",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-C",
            manufacturingOrderId: "MO-001",
            workCenterId: "WC-001",
            startDate: "2026-06-01T10:00:00Z",
            endDate: "2026-06-01T11:00:00Z",
            durationMinutes: 60,
            isMaintenance: false,
            dependsOnWorkOrderIds: ["WO-B"],
          },
        },
      ],
    };

    expect(() => service.reflow(inputWithCircularDependency)).toThrow(
      /Circular dependency detected/
    );
  });

  it("resolves work center conflicts for independent work orders", () => {
    const service = new ReflowService();

    const conflictInput: ReflowInput = {
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
      manufacturingOrders: [],
      workOrders: [
        {
          docId: "WO-301",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-301",
            manufacturingOrderId: "MO-004",
            workCenterId: "WC-001",
            startDate: "2026-06-01T08:00:00Z",
            endDate: "2026-06-01T10:00:00Z",
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: [],
          },
        },
        {
          docId: "WO-302",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-302",
            manufacturingOrderId: "MO-005",
            workCenterId: "WC-001",

            /**
             * This order overlaps WO-301 in the original schedule.
             * The reflow algorithm should move it after WO-301.
             */
            startDate: "2026-06-01T09:00:00Z",
            endDate: "2026-06-01T11:00:00Z",
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: [],
          },
        },
      ],
    };

    const result = service.reflow(conflictInput);

    const wo301 = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-301"
    );
    const wo302 = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-302"
    );

    expect(wo301?.data.startDate).toBe("2026-06-01T08:00:00Z");
    expect(wo301?.data.endDate).toBe("2026-06-01T10:00:00Z");

    expect(wo302?.data.startDate).toBe("2026-06-01T10:00:00Z");
    expect(wo302?.data.endDate).toBe("2026-06-01T12:00:00Z");

    expect(result.changes).toHaveLength(1);
    expect(result.explanations).toContain("Constraint validation passed.");
  });

  it("waits for all parent work orders before scheduling a child work order", () => {
    const service = new ReflowService();

    const input: ReflowInput = {
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
        {
          docId: "WC-002",
          docType: "workCenter",
          data: {
            name: "Extrusion Line 2",
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
      manufacturingOrders: [],
      workOrders: [
        {
          docId: "WO-PARENT-1",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-PARENT-1",
            manufacturingOrderId: "MO-006",
            workCenterId: "WC-001",
            startDate: "2026-06-01T08:00:00Z",
            endDate: "2026-06-01T10:00:00Z",
            durationMinutes: 120,
            isMaintenance: false,
            dependsOnWorkOrderIds: [],
          },
        },
        {
          docId: "WO-PARENT-2",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-PARENT-2",
            manufacturingOrderId: "MO-006",
            workCenterId: "WC-002",
            startDate: "2026-06-01T08:00:00Z",
            endDate: "2026-06-01T13:00:00Z",
            durationMinutes: 300,
            isMaintenance: false,
            dependsOnWorkOrderIds: [],
          },
        },
        {
          docId: "WO-CHILD",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-CHILD",
            manufacturingOrderId: "MO-006",
            workCenterId: "WC-001",

            /**
             * This child is originally planned before WO-PARENT-2 finishes.
             * It must wait for both parents, so it can only start at 13:00.
             */
            startDate: "2026-06-01T10:00:00Z",
            endDate: "2026-06-01T11:00:00Z",
            durationMinutes: 60,
            isMaintenance: false,
            dependsOnWorkOrderIds: ["WO-PARENT-1", "WO-PARENT-2"],
          },
        },
      ],
    };

    const result = service.reflow(input);

    const child = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-CHILD"
    );

    expect(child?.data.startDate).toBe("2026-06-01T13:00:00Z");
    expect(child?.data.endDate).toBe("2026-06-01T14:00:00Z");
    expect(result.explanations).toContain("Constraint validation passed.");
  });

  it("does not reschedule maintenance work orders and schedules normal work around them", () => {
    const service = new ReflowService();

    const input: ReflowInput = {
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
      manufacturingOrders: [],
      workOrders: [
        {
          docId: "WO-MAINT",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-MAINT",
            manufacturingOrderId: "MO-MAINT",
            workCenterId: "WC-001",
            startDate: "2026-06-01T10:00:00Z",
            endDate: "2026-06-01T12:00:00Z",
            durationMinutes: 120,
            isMaintenance: true,
            dependsOnWorkOrderIds: [],
          },
        },
        {
          docId: "WO-NORMAL",
          docType: "workOrder",
          data: {
            workOrderNumber: "WO-NORMAL",
            manufacturingOrderId: "MO-007",
            workCenterId: "WC-001",

            /**
             * This work order conflicts with the fixed maintenance work order.
             * It should be scheduled after maintenance ends.
             */
            startDate: "2026-06-01T10:00:00Z",
            endDate: "2026-06-01T11:00:00Z",
            durationMinutes: 60,
            isMaintenance: false,
            dependsOnWorkOrderIds: [],
          },
        },
      ],
    };

    const result = service.reflow(input);

    const maintenance = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-MAINT"
    );

    const normal = result.updatedWorkOrders.find(
      (workOrder) => workOrder.docId === "WO-NORMAL"
    );

    expect(maintenance?.data.startDate).toBe("2026-06-01T10:00:00Z");
    expect(maintenance?.data.endDate).toBe("2026-06-01T12:00:00Z");

    expect(normal?.data.startDate).toBe("2026-06-01T12:00:00Z");
    expect(normal?.data.endDate).toBe("2026-06-01T13:00:00Z");

    expect(result.explanations).toContain(
      "Work order WO-MAINT was not moved because it is a maintenance work order."
    );
    expect(result.explanations).toContain("Constraint validation passed.");
  });
});