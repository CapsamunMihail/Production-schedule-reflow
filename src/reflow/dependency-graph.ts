import type { WorkOrderDocument } from "./types";

export interface DependencyGraphResult {
  orderedWorkOrders: WorkOrderDocument[];
}

/**
 * DependencyGraph is responsible for ordering work orders safely.
 *
 * If WO-B depends on WO-A, then WO-A must appear before WO-B
 * in the final ordered list.
 *
 * This also detects circular dependencies, for example:
 * WO-A -> WO-B -> WO-C -> WO-A
 */
export class DependencyGraph {
  private readonly workOrdersById: Map<string, WorkOrderDocument>;

  constructor(private readonly workOrders: WorkOrderDocument[]) {
    this.workOrdersById = new Map(
      workOrders.map((workOrder) => [workOrder.docId, workOrder])
    );
  }

  public topologicalSort(): DependencyGraphResult {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const orderedWorkOrders: WorkOrderDocument[] = [];

    for (const workOrder of this.workOrders) {
      if (!visited.has(workOrder.docId)) {
        this.visit(workOrder.docId, visited, visiting, orderedWorkOrders);
      }
    }

    return {
      orderedWorkOrders,
    };
  }

  private visit(
    workOrderId: string,
    visited: Set<string>,
    visiting: Set<string>,
    orderedWorkOrders: WorkOrderDocument[]
  ): void {
    if (visited.has(workOrderId)) {
      return;
    }

    if (visiting.has(workOrderId)) {
      throw new Error(
        `Circular dependency detected involving work order "${workOrderId}".`
      );
    }

    const workOrder = this.workOrdersById.get(workOrderId);

    if (!workOrder) {
      throw new Error(
        `Dependency references missing work order "${workOrderId}".`
      );
    }

    visiting.add(workOrderId);

    for (const parentId of workOrder.data.dependsOnWorkOrderIds) {
      this.visit(parentId, visited, visiting, orderedWorkOrders);
    }

    visiting.delete(workOrderId);
    visited.add(workOrderId);
    orderedWorkOrders.push(workOrder);
  }
}