export type DocumentType = "workOrder" | "workCenter" | "manufacturingOrder";

export interface BaseDocument<TData> {
  docId: string;
  docType: DocumentType;
  data: TData;
}

export interface WorkOrderData {
  workOrderNumber: string;
  manufacturingOrderId: string;
  workCenterId: string;

  startDate: string;
  endDate: string;
  durationMinutes: number;

  isMaintenance: boolean;

  dependsOnWorkOrderIds: string[];

  // Bonus-ready field. We can use it later if we have time.
  setupTimeMinutes?: number;
}

export interface WorkCenterShift {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: number;
  endHour: number;
}

export interface MaintenanceWindow {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface WorkCenterData {
  name: string;

  shifts: WorkCenterShift[];

  maintenanceWindows: MaintenanceWindow[];
}

export interface ManufacturingOrderData {
  manufacturingOrderNumber: string;
  itemId: string;
  quantity: number;
  dueDate: string;
}

export interface WorkOrderDocument extends BaseDocument<WorkOrderData> {
  docType: "workOrder";
}

export interface WorkCenterDocument extends BaseDocument<WorkCenterData> {
  docType: "workCenter";
}

export interface ManufacturingOrderDocument
  extends BaseDocument<ManufacturingOrderData> {
  docType: "manufacturingOrder";
}

export interface ReflowInput {
  workOrders: WorkOrderDocument[];
  workCenters: WorkCenterDocument[];
  manufacturingOrders?: ManufacturingOrderDocument[];
}

export interface ScheduleChange {
  workOrderId: string;
  workOrderNumber: string;

  oldStartDate: string;
  oldEndDate: string;

  newStartDate: string;
  newEndDate: string;

  movedByMinutes: number;
  reason: string;
}

export interface ReflowResult {
  updatedWorkOrders: WorkOrderDocument[];
  changes: ScheduleChange[];
  explanations: string[];
}