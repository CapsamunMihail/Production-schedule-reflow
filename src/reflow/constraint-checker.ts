import type {
  ReflowInput,
  WorkCenterDocument,
  WorkOrderDocument,
} from "./types";
import {
  calculateEndDateWithAvailability,
  isWithinShift,
  parseUtcDate,
  moveToNextAvailableTime,
} from "../utils/date-utils";

export interface ConstraintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ConstraintChecker validates that the generated schedule respects
 * the hard scheduling constraints from the technical test.
 *
 * It is intentionally separated from ReflowService so the scheduling logic
 * and validation logic remain easy to understand and test independently.
 */
export class ConstraintChecker {
  public validate(params: {
    originalInput: ReflowInput;
    updatedWorkOrders: WorkOrderDocument[];
    workCenters: WorkCenterDocument[];
  }): ConstraintValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const workCentersById = new Map(
      params.workCenters.map((workCenter) => [workCenter.docId, workCenter])
    );

    const updatedWorkOrdersById = new Map(
      params.updatedWorkOrders.map((workOrder) => [workOrder.docId, workOrder])
    );

    errors.push(
      ...this.validateDependencies(params.updatedWorkOrders, updatedWorkOrdersById)
    );

    errors.push(...this.validateWorkCenterOverlaps(params.updatedWorkOrders));

    errors.push(
      ...this.validateAvailability(params.updatedWorkOrders, workCentersById)
    );

    errors.push(
      ...this.validateMaintenanceWorkOrdersWereNotMoved(
        params.originalInput.workOrders,
        updatedWorkOrdersById
      )
    );

    warnings.push(
      ...this.validateStartsAreAvailable(
        params.updatedWorkOrders,
        workCentersById
      )
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateDependencies(
    workOrders: WorkOrderDocument[],
    workOrdersById: Map<string, WorkOrderDocument>
  ): string[] {
    const errors: string[] = [];

    for (const workOrder of workOrders) {
      const workOrderStart = parseUtcDate(workOrder.data.startDate);

      for (const parentId of workOrder.data.dependsOnWorkOrderIds) {
        const parent = workOrdersById.get(parentId);

        if (!parent) {
          errors.push(
            `Work order ${workOrder.data.workOrderNumber} depends on missing parent ${parentId}.`
          );
          continue;
        }

        const parentEnd = parseUtcDate(parent.data.endDate);

        if (workOrderStart < parentEnd) {
          errors.push(
            `Dependency violation: ${workOrder.data.workOrderNumber} starts at ${workOrder.data.startDate}, but parent ${parent.data.workOrderNumber} ends at ${parent.data.endDate}.`
          );
        }
      }
    }

    return errors;
  }

  private validateWorkCenterOverlaps(workOrders: WorkOrderDocument[]): string[] {
    const errors: string[] = [];

    const workOrdersByWorkCenter = new Map<string, WorkOrderDocument[]>();

    for (const workOrder of workOrders) {
      const current = workOrdersByWorkCenter.get(workOrder.data.workCenterId) ?? [];
      current.push(workOrder);
      workOrdersByWorkCenter.set(workOrder.data.workCenterId, current);
    }

    for (const [workCenterId, workCenterOrders] of workOrdersByWorkCenter) {
      const sortedOrders = [...workCenterOrders].sort((a, b) => {
        return (
          parseUtcDate(a.data.startDate).toMillis() -
          parseUtcDate(b.data.startDate).toMillis()
        );
      });

      for (let index = 1; index < sortedOrders.length; index++) {
        const previous = sortedOrders[index - 1];
        const current = sortedOrders[index];

        const previousEnd = parseUtcDate(previous.data.endDate);
        const currentStart = parseUtcDate(current.data.startDate);

        if (currentStart < previousEnd) {
          errors.push(
            `Work center overlap on ${workCenterId}: ${previous.data.workOrderNumber} ends at ${previous.data.endDate}, but ${current.data.workOrderNumber} starts at ${current.data.startDate}.`
          );
        }
      }
    }

    return errors;
  }

  /**
   * Because work orders can pause outside shifts and during maintenance,
   * a simple start-end overlap check is not enough.
   *
   * Instead, we recalculate the expected end date using the same availability
   * rules and compare it against the scheduled end date.
   */
  private validateAvailability(
    workOrders: WorkOrderDocument[],
    workCentersById: Map<string, WorkCenterDocument>
  ): string[] {
    const errors: string[] = [];

    for (const workOrder of workOrders) {
      if (workOrder.data.isMaintenance) {
        continue;
      }

      const workCenter = workCentersById.get(workOrder.data.workCenterId);

      if (!workCenter) {
        errors.push(
          `Work order ${workOrder.data.workOrderNumber} references missing work center ${workOrder.data.workCenterId}.`
        );
        continue;
      }

      const expectedEndDate = calculateEndDateWithAvailability({
        startDate: workOrder.data.startDate,
        durationMinutes:
          workOrder.data.durationMinutes + (workOrder.data.setupTimeMinutes ?? 0),
        shifts: workCenter.data.shifts,
        maintenanceWindows: workCenter.data.maintenanceWindows,
      });

      if (expectedEndDate !== workOrder.data.endDate) {
        errors.push(
          `Availability violation: ${workOrder.data.workOrderNumber} has end date ${workOrder.data.endDate}, but expected ${expectedEndDate} based on shifts and maintenance windows.`
        );
      }
    }

    return errors;
  }

  private validateMaintenanceWorkOrdersWereNotMoved(
    originalWorkOrders: WorkOrderDocument[],
    updatedWorkOrdersById: Map<string, WorkOrderDocument>
  ): string[] {
    const errors: string[] = [];

    for (const originalWorkOrder of originalWorkOrders) {
      if (!originalWorkOrder.data.isMaintenance) {
        continue;
      }

      const updatedWorkOrder = updatedWorkOrdersById.get(originalWorkOrder.docId);

      if (!updatedWorkOrder) {
        errors.push(
          `Maintenance work order ${originalWorkOrder.data.workOrderNumber} is missing from updated schedule.`
        );
        continue;
      }

      const startChanged =
        originalWorkOrder.data.startDate !== updatedWorkOrder.data.startDate;
      const endChanged =
        originalWorkOrder.data.endDate !== updatedWorkOrder.data.endDate;

      if (startChanged || endChanged) {
        errors.push(
          `Maintenance work order ${originalWorkOrder.data.workOrderNumber} was moved, but maintenance work orders must remain fixed.`
        );
      }
    }

    return errors;
  }

  /**
   * Lightweight shift validation.
   *
   * Full segment-level validation would require storing execution segments.
   * @upgrade Store generated execution segments and validate every segment
   * against shifts and maintenance windows.
   */
  private validateStartsAreAvailable(
    workOrders: WorkOrderDocument[],
    workCentersById: Map<string, WorkCenterDocument>
  ): string[] {
    const warnings: string[] = [];

    for (const workOrder of workOrders) {
      if (workOrder.data.isMaintenance) {
        continue;
      }

      const workCenter = workCentersById.get(workOrder.data.workCenterId);

      if (!workCenter) {
        continue;
      }

      const start = parseUtcDate(workOrder.data.startDate);

      const nextAvailable = moveToNextAvailableTime(
        start,
        workCenter.data.shifts,
        workCenter.data.maintenanceWindows
      );

      if (nextAvailable.toMillis() !== start.toMillis()) {
        warnings.push(
          `Shift warning: ${workOrder.data.workOrderNumber} starts at ${workOrder.data.startDate}, which is not an available working time. Next available time is ${nextAvailable.toISO()}.`
        );
      }

      if (!isWithinShift(start, workCenter.data.shifts)) {
        warnings.push(
          `Shift warning: ${workOrder.data.workOrderNumber} does not start inside a configured shift.`
        );
      }
    }

    return warnings;
  }
}