import { DependencyGraph } from "./reflow/dependency-graph";
import type { WorkOrderDocument } from "./reflow/types";

const workOrders: WorkOrderDocument[] = [
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
  {
    docId: "WO-001",
    docType: "workOrder",
    data: {
      workOrderNumber: "WO-001",
      manufacturingOrderId: "MO-001",
      workCenterId: "WC-001",
      startDate: "2026-06-01T08:00:00Z",
      endDate: "2026-06-01T10:00:00Z",
      durationMinutes: 120,
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
];

const graph = new DependencyGraph(workOrders);
const result = graph.topologicalSort();

console.log("Dependency graph example");
console.log("------------------------");
console.log(
  result.orderedWorkOrders.map((workOrder) => workOrder.docId).join(" -> ")
);