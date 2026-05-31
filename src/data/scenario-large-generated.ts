import type {
  ManufacturingOrderDocument,
  ReflowInput,
  WorkCenterDocument,
  WorkOrderDocument,
} from "../reflow/types";

interface GenerateLargeScenarioOptions {
  workOrderCount?: number;
  manufacturingOrderCount?: number;
  workCenterCount?: number;
}

/**
 * Generates a deterministic large demo scenario.
 *
 * The purpose is not to simulate a perfect real factory,
 * but to create enough realistic scheduling pressure:
 * - multiple work centers
 * - many work orders
 * - repeated work center conflicts
 * - dependency chains
 * - maintenance windows
 */
export function generateLargeScenario(
  options: GenerateLargeScenarioOptions = {}
): ReflowInput {
  const workOrderCount = options.workOrderCount ?? 100;
  const manufacturingOrderCount = options.manufacturingOrderCount ?? 20;
  const workCenterCount = options.workCenterCount ?? 5;

  const workCenters = generateWorkCenters(workCenterCount);
  const manufacturingOrders = generateManufacturingOrders(
    manufacturingOrderCount
  );

  const workOrders: WorkOrderDocument[] = [];

  for (let index = 0; index < workOrderCount; index++) {
    const orderNumber = index + 1;

    const manufacturingOrderIndex = index % manufacturingOrderCount;
    const manufacturingOrder = manufacturingOrders[manufacturingOrderIndex];

    const workCenterIndex = index % workCenterCount;
    const workCenter = workCenters[workCenterIndex];

    /**
     * This intentionally creates scheduling pressure.
     * Several work orders start at the same or nearby times,
     * so the reflow algorithm must resolve work center conflicts.
     */
    const dayOffset = Math.floor(index / 25);
    const hourOffset = index % 5;

    const startHour = 8 + hourOffset;
    const startDate = buildUtcDate({
      day: 1 + dayOffset,
      hour: startHour,
    });

    /**
     * Durations vary between 60 and 240 minutes.
     * Some orders become longer than their original end date implies,
     * creating delay cascades.
     */
    const durationMinutes = 60 + (index % 4) * 60;

    const originalPlannedDuration = Math.min(durationMinutes, 120);

    const originalEndDate = buildUtcDate({
      day: 1 + dayOffset,
      hour: startHour,
      minute: originalPlannedDuration,
    });

    /**
     * Create dependency chains inside each manufacturing order.
     * Every later operation in the same manufacturing order depends
     * on the previous operation from that manufacturing order.
     */
    const previousWorkOrderForSameManufacturingOrder = findPreviousWorkOrder(
      workOrders,
      manufacturingOrder.docId
    );

    const dependsOnWorkOrderIds = previousWorkOrderForSameManufacturingOrder
      ? [previousWorkOrderForSameManufacturingOrder.docId]
      : [];

    workOrders.push({
      docId: `WO-LARGE-${String(orderNumber).padStart(4, "0")}`,
      docType: "workOrder",
      data: {
        workOrderNumber: `WO-LARGE-${String(orderNumber).padStart(4, "0")}`,
        manufacturingOrderId: manufacturingOrder.docId,
        workCenterId: workCenter.docId,
        startDate,
        endDate: originalEndDate,
        durationMinutes,
        isMaintenance: false,
        dependsOnWorkOrderIds,

        /**
         * Bonus feature:
         * setup time is supported by the algorithm.
         * Add it to some orders to demonstrate this without making every order heavier.
         */
        setupTimeMinutes: index % 10 === 0 ? 30 : undefined,
      },
    });
  }

  return {
    workOrders,
    workCenters,
    manufacturingOrders,
  };
}

function generateWorkCenters(count: number): WorkCenterDocument[] {
  const workCenters: WorkCenterDocument[] = [];

  for (let index = 0; index < count; index++) {
    const workCenterNumber = index + 1;

    workCenters.push({
      docId: `WC-LARGE-${String(workCenterNumber).padStart(2, "0")}`,
      docType: "workCenter",
      data: {
        name: `Extrusion Line ${workCenterNumber}`,
        shifts: [
          { dayOfWeek: 1, startHour: 8, endHour: 17 },
          { dayOfWeek: 2, startHour: 8, endHour: 17 },
          { dayOfWeek: 3, startHour: 8, endHour: 17 },
          { dayOfWeek: 4, startHour: 8, endHour: 17 },
          { dayOfWeek: 5, startHour: 8, endHour: 17 },
        ],
        maintenanceWindows: buildMaintenanceWindowsForWorkCenter(
          workCenterNumber
        ),
      },
    });
  }

  return workCenters;
}

function buildMaintenanceWindowsForWorkCenter(workCenterNumber: number) {
  if (workCenterNumber === 2) {
    return [
      {
        startDate: "2026-06-01T12:00:00Z",
        endDate: "2026-06-01T14:00:00Z",
        reason: "Planned die cleaning",
      },
    ];
  }

  if (workCenterNumber === 4) {
    return [
      {
        startDate: "2026-06-02T10:00:00Z",
        endDate: "2026-06-02T12:00:00Z",
        reason: "Unplanned mechanical inspection",
      },
    ];
  }

  return [];
}

function generateManufacturingOrders(
  count: number
): ManufacturingOrderDocument[] {
  const manufacturingOrders: ManufacturingOrderDocument[] = [];

  for (let index = 0; index < count; index++) {
    const orderNumber = index + 1;

    manufacturingOrders.push({
      docId: `MO-LARGE-${String(orderNumber).padStart(3, "0")}`,
      docType: "manufacturingOrder",
      data: {
        manufacturingOrderNumber: `MO-LARGE-${String(orderNumber).padStart(
          3,
          "0"
        )}`,
        itemId: `PIPE-${100 + orderNumber}`,
        quantity: 100 + orderNumber * 25,
        dueDate: "2026-06-12T17:00:00Z",
      },
    });
  }

  return manufacturingOrders;
}

function findPreviousWorkOrder(
  workOrders: WorkOrderDocument[],
  manufacturingOrderId: string
): WorkOrderDocument | undefined {
  for (let index = workOrders.length - 1; index >= 0; index--) {
    const workOrder = workOrders[index];

    if (workOrder.data.manufacturingOrderId === manufacturingOrderId) {
      return workOrder;
    }
  }

  return undefined;
}

function buildUtcDate(params: {
  day: number;
  hour: number;
  minute?: number;
}): string {
  const baseDate = new Date(Date.UTC(2026, 5, params.day, params.hour, 0, 0));

  if (params.minute) {
    baseDate.setUTCMinutes(baseDate.getUTCMinutes() + params.minute);
  }

  return baseDate.toISOString().replace(".000Z", "Z");
}

export const largeGeneratedScenario = generateLargeScenario({
  workOrderCount: 100,
  manufacturingOrderCount: 20,
  workCenterCount: 5,
});