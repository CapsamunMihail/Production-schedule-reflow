import { ConstraintChecker } from "./constraint-checker";
import { DependencyGraph } from "./dependency-graph";
import type {
  MaintenanceWindow,
  ReflowInput,
  ReflowResult,
  ScheduleChange,
  WorkCenterDocument,
  WorkOrderDocument,
} from "./types";
import {
  calculateEndDateWithAvailability,
  diffInMinutes,
  moveToNextAvailableTime,
  parseUtcDate,
  toIsoUtc,
} from "../utils/date-utils";

/**
 * ReflowService recalculates a production schedule after disruptions.
 *
 * Current approach:
 * - Greedy scheduling
 * - Dependency-safe processing order
 * - Work center availability tracking
 * - Shift-aware duration calculation
 * - Maintenance windows are treated as blocked time
 *
 * This prioritizes producing a valid schedule over global optimization.
 */
export class ReflowService {
  public reflow(input: ReflowInput): ReflowResult {
    const workCentersById = this.buildWorkCenterMap(input.workCenters);

    /**
     * Preserve the original schedule order as much as possible.
     * Topological sorting will still ensure dependencies are processed first.
     */
    const workOrdersSortedByOriginalStart = [...input.workOrders].sort((a, b) => {
      return (
        parseUtcDate(a.data.startDate).toMillis() -
        parseUtcDate(b.data.startDate).toMillis()
      );
    });

    const graph = new DependencyGraph(workOrdersSortedByOriginalStart);
    const { orderedWorkOrders } = graph.topologicalSort();

    const updatedWorkOrdersById = new Map<string, WorkOrderDocument>();
    const scheduledEndByWorkOrderId = new Map<string, string>();

    /**
     * Tracks the latest scheduled end date for each work center.
     * This prevents overlaps on the same work center.
     */
    const workCenterAvailableAfter = new Map<string, string>();

    const changes: ScheduleChange[] = [];
    const explanations: string[] = [];

    /**
     * Maintenance work orders are fixed and cannot be moved.
     * To make normal work orders avoid them, we also treat them
     * as additional maintenance windows on their work centers.
     */
    const maintenanceWindowsByWorkCenterId =
      this.buildMaintenanceWindowsByWorkCenter(input.workCenters, input.workOrders);

    for (const workOrder of orderedWorkOrders) {
      const workCenter = workCentersById.get(workOrder.data.workCenterId);

      if (!workCenter) {
        throw new Error(
          `Work order "${workOrder.docId}" references missing work center "${workOrder.data.workCenterId}".`
        );
      }

      if (workOrder.data.isMaintenance) {
        /**
         * Hard requirement:
         * maintenance work orders cannot be rescheduled.
         */
        updatedWorkOrdersById.set(workOrder.docId, workOrder);
        scheduledEndByWorkOrderId.set(workOrder.docId, workOrder.data.endDate);

        this.updateWorkCenterAvailability(
          workCenterAvailableAfter,
          workOrder.data.workCenterId,
          workOrder.data.endDate
        );

        explanations.push(
          `Work order ${workOrder.data.workOrderNumber} was not moved because it is a maintenance work order.`
        );

        continue;
      }

      const dependencyReadyDate = this.getDependencyReadyDate(
        workOrder,
        scheduledEndByWorkOrderId
      );

      const workCenterReadyDate = workCenterAvailableAfter.get(
        workOrder.data.workCenterId
      );

      const earliestStartDate = this.maxIsoDate([
        workOrder.data.startDate,
        dependencyReadyDate,
        workCenterReadyDate,
      ]);

      const maintenanceWindows =
        maintenanceWindowsByWorkCenterId.get(workOrder.data.workCenterId) ?? [];

      const totalDurationMinutes =
        workOrder.data.durationMinutes + (workOrder.data.setupTimeMinutes ?? 0);

      /**
       * The earliestStartDate may still be outside a shift or inside maintenance.
       * Move it to the next actual available working time before saving it.
       */
      const actualStartDate = toIsoUtc(
        moveToNextAvailableTime(
          parseUtcDate(earliestStartDate),
          workCenter.data.shifts,
          maintenanceWindows
        )
      );

      const newEndDate = calculateEndDateWithAvailability({
        startDate: actualStartDate,
        durationMinutes: totalDurationMinutes,
        shifts: workCenter.data.shifts,
        maintenanceWindows,
      });

      const updatedWorkOrder: WorkOrderDocument = {
        ...workOrder,
        data: {
          ...workOrder.data,
          startDate: actualStartDate,
          endDate: newEndDate,
        },
      };

      updatedWorkOrdersById.set(workOrder.docId, updatedWorkOrder);
      scheduledEndByWorkOrderId.set(workOrder.docId, newEndDate);

      this.updateWorkCenterAvailability(
        workCenterAvailableAfter,
        workOrder.data.workCenterId,
        newEndDate
      );

      if (
        workOrder.data.startDate !== actualStartDate ||
        workOrder.data.endDate !== newEndDate
      ) {
        changes.push({
          workOrderId: workOrder.docId,
          workOrderNumber: workOrder.data.workOrderNumber,

          oldStartDate: workOrder.data.startDate,
          oldEndDate: workOrder.data.endDate,

          newStartDate: actualStartDate,
          newEndDate,

          movedByMinutes: diffInMinutes(workOrder.data.startDate, actualStartDate),
          reason: this.buildChangeReason({
            workOrder,
            dependencyReadyDate,
            workCenterReadyDate,
            earliestStartDate: actualStartDate,
          }),
        });

        explanations.push(
          `Work order ${workOrder.data.workOrderNumber} moved from ${workOrder.data.startDate} - ${workOrder.data.endDate} to ${actualStartDate} - ${newEndDate}.`
        );
      } else {
        explanations.push(
          `Work order ${workOrder.data.workOrderNumber} remained unchanged.`
        );
      }
    }

    /**
     * Return work orders in the original input order for easier comparison.
     */
    const updatedWorkOrders = input.workOrders.map((workOrder) => {
      const updated = updatedWorkOrdersById.get(workOrder.docId);

      if (!updated) {
        throw new Error(`Work order "${workOrder.docId}" was not scheduled.`);
      }

      return updated;
    });

    const constraintChecker = new ConstraintChecker();

    const validationResult = constraintChecker.validate({
      originalInput: input,
      updatedWorkOrders,
      workCenters: input.workCenters,
    });

    if (!validationResult.valid) {
      throw new Error(
        `Generated schedule is invalid:\n${validationResult.errors.join("\n")}`
      );
    }

    explanations.push("Constraint validation passed.");

    for (const warning of validationResult.warnings) {
      explanations.push(`Validation warning: ${warning}`);
    }

    return {
      updatedWorkOrders,
      changes,
      explanations,
    };
  }

  private buildWorkCenterMap(
    workCenters: WorkCenterDocument[]
  ): Map<string, WorkCenterDocument> {
    return new Map(workCenters.map((workCenter) => [workCenter.docId, workCenter]));
  }

  private getDependencyReadyDate(
    workOrder: WorkOrderDocument,
    scheduledEndByWorkOrderId: Map<string, string>
  ): string | undefined {
    if (workOrder.data.dependsOnWorkOrderIds.length === 0) {
      return undefined;
    }

    const parentEndDates = workOrder.data.dependsOnWorkOrderIds.map((parentId) => {
      const parentEndDate = scheduledEndByWorkOrderId.get(parentId);

      if (!parentEndDate) {
        throw new Error(
          `Parent work order "${parentId}" was not scheduled before "${workOrder.docId}".`
        );
      }

      return parentEndDate;
    });

    return this.maxIsoDate(parentEndDates);
  }

  private maxIsoDate(dates: Array<string | undefined>): string {
    const validDates = dates.filter((date): date is string => Boolean(date));

    if (validDates.length === 0) {
      throw new Error("Cannot calculate max date from empty date list.");
    }

    const maxDate = validDates
      .map((date) => parseUtcDate(date))
      .sort((a, b) => b.toMillis() - a.toMillis())[0];

    return toIsoUtc(maxDate);
  }

  private updateWorkCenterAvailability(
    workCenterAvailableAfter: Map<string, string>,
    workCenterId: string,
    endDate: string
  ): void {
    const currentAvailableAfter = workCenterAvailableAfter.get(workCenterId);

    if (!currentAvailableAfter) {
      workCenterAvailableAfter.set(workCenterId, endDate);
      return;
    }

    const maxDate = this.maxIsoDate([currentAvailableAfter, endDate]);
    workCenterAvailableAfter.set(workCenterId, maxDate);
  }

  private buildMaintenanceWindowsByWorkCenter(
    workCenters: WorkCenterDocument[],
    workOrders: WorkOrderDocument[]
  ): Map<string, MaintenanceWindow[]> {
    const maintenanceWindowsByWorkCenter = new Map<string, MaintenanceWindow[]>();

    for (const workCenter of workCenters) {
      maintenanceWindowsByWorkCenter.set(
        workCenter.docId,
        [...workCenter.data.maintenanceWindows]
      );
    }

    for (const workOrder of workOrders) {
      if (!workOrder.data.isMaintenance) {
        continue;
      }

      const currentWindows =
        maintenanceWindowsByWorkCenter.get(workOrder.data.workCenterId) ?? [];

      currentWindows.push({
        startDate: workOrder.data.startDate,
        endDate: workOrder.data.endDate,
        reason: `Fixed maintenance work order ${workOrder.data.workOrderNumber}`,
      });

      maintenanceWindowsByWorkCenter.set(
        workOrder.data.workCenterId,
        currentWindows
      );
    }

    return maintenanceWindowsByWorkCenter;
  }

  private buildChangeReason(params: {
    workOrder: WorkOrderDocument;
    dependencyReadyDate?: string;
    workCenterReadyDate?: string;
    earliestStartDate: string;
  }): string {
    const { workOrder, dependencyReadyDate, workCenterReadyDate, earliestStartDate } =
      params;

    const reasons: string[] = [];

    if (
      dependencyReadyDate &&
      parseUtcDate(dependencyReadyDate) > parseUtcDate(workOrder.data.startDate)
    ) {
      reasons.push(`dependencies completed at ${dependencyReadyDate}`);
    }

    if (
      workCenterReadyDate &&
      parseUtcDate(workCenterReadyDate) > parseUtcDate(workOrder.data.startDate)
    ) {
      reasons.push(`work center was busy until ${workCenterReadyDate}`);
    }

    if (earliestStartDate !== workOrder.data.startDate && reasons.length === 0) {
      reasons.push("start date was adjusted to the next valid available time");
    }

    if (reasons.length === 0) {
      reasons.push("end date changed due to shift or maintenance constraints");
    }

    return reasons.join("; ");
  }
}