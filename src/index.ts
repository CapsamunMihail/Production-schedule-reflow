import { delayCascadeScenario } from "./data/scenario-delay-cascade";
import { maintenanceScenario } from "./data/scenario-maintenance";
import { shiftBoundaryScenario } from "./data/scenario-shift-boundary";
import { ReflowService } from "./reflow/reflow.service";
import type { ReflowInput, ReflowResult } from "./reflow/types";

interface Scenario {
  name: string;
  description: string;
  input: ReflowInput;
}

const scenarios: Scenario[] = [
  {
    name: "Delay Cascade",
    description:
      "One delayed work order causes downstream dependent work orders to move.",
    input: delayCascadeScenario,
  },
  {
    name: "Shift Boundary",
    description:
      "A work order starts near the end of a shift and continues on the next working day.",
    input: shiftBoundaryScenario,
  },
  {
    name: "Maintenance Conflict",
    description:
      "A work order overlaps a maintenance window and must pause until maintenance ends.",
    input: maintenanceScenario,
  },
];

const reflowService = new ReflowService();

for (const scenario of scenarios) {
  const result = reflowService.reflow(scenario.input);
  printScenarioResult(scenario.name, scenario.description, result);
}

function printScenarioResult(
  name: string,
  description: string,
  result: ReflowResult
): void {
  console.log("\n==================================================");
  console.log(`Scenario: ${name}`);
  console.log("==================================================");
  console.log(description);

  console.log("\nUpdated Work Orders:");
  for (const workOrder of result.updatedWorkOrders) {
    console.log(
      `- ${workOrder.data.workOrderNumber}: ${workOrder.data.startDate} -> ${workOrder.data.endDate}`
    );
  }

  console.log("\nChanges:");
  if (result.changes.length === 0) {
    console.log("- No changes.");
  } else {
    for (const change of result.changes) {
      console.log(
        `- ${change.workOrderNumber}: ${change.oldStartDate} -> ${change.oldEndDate} moved to ${change.newStartDate} -> ${change.newEndDate}`
      );
      console.log(`  Reason: ${change.reason}`);
    }
  }

  console.log("\nExplanations:");
  for (const explanation of result.explanations) {
    console.log(`- ${explanation}`);
  }
}