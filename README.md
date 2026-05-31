# Production Schedule Reflow

A TypeScript implementation of a production schedule reflow algorithm for manufacturing work orders.

The scheduler recalculates work order start and end dates after disruptions while respecting:

- work order dependencies
- work center capacity
- shift boundaries
- maintenance windows
- fixed maintenance work orders

This project was built as a technical test for a production scheduling / ERP-style problem.

---

## Overview

Manufacturing schedules often change because of real-world disruptions:

- a work order takes longer than expected
- a work center becomes unavailable
- a maintenance window blocks production time
- dependent work orders must wait for previous operations
- multiple work orders compete for the same work center

This project takes a current schedule snapshot and produces a new valid schedule snapshot.

The result includes:

- updated work orders
- a list of schedule changes
- explanations for why work orders moved
- validation that hard constraints are respected

---

## Tech Stack

- TypeScript
- Node.js
- Luxon for date/time handling
- Vitest for automated tests

---

## Project Structure

```text
src/
├── data/
│   ├── scenario-delay-cascade.ts
│   ├── scenario-shift-boundary.ts
│   ├── scenario-maintenance.ts
│   └── scenario-large-generated.ts
├── reflow/
│   ├── constraint-checker.ts
│   ├── dependency-graph.ts
│   ├── reflow.service.ts
│   └── types.ts
├── utils/
│   └── date-utils.ts
└── index.ts

tests/
└── reflow.service.test.ts

prompts/
├── algorithm-design.md
├── dependency-graph.md
├── reflow-service.md
├── sample-scenarios.md
├── constraint-checker.md
├── automated-tests.md
├── technical-hardening.md
└── large-demo-data.md
```

---

## Setup

Install dependencies:

```bash
npm install
```

---

## Run Demo Scenarios

```bash
npm run dev
```

This runs several sample scenarios:

1. Delay Cascade
2. Shift Boundary
3. Maintenance Conflict
4. Large Generated Dataset

The smaller scenarios print detailed output.  
The large generated scenario prints a summary so the console output remains readable.

---

## Run Tests

```bash
npm test
```

The test suite covers:

- delay cascade scheduling
- shift boundary handling
- maintenance window handling
- circular dependency detection
- work center conflict resolution
- multiple parent dependencies
- fixed maintenance work orders

---

## Build

```bash
npm run build
```

---

## Core Concepts

### Work Orders

A work order represents a scheduled manufacturing operation.

Each work order has:

- start date
- end date
- duration in working minutes
- work center
- dependency list
- maintenance flag

The scheduler uses `durationMinutes` as the source of truth for how much working time is required.

---

### Work Centers

A work center represents a production resource, for example an extrusion line.

Each work center has:

- shift schedule
- maintenance windows

Only one work order can run on the same work center at a time.

---

### Manufacturing Orders

Manufacturing orders provide production context for work orders.

In this implementation, manufacturing orders are included in the input model, but the scheduling logic is driven mainly by work orders, work centers, dependencies, and availability constraints.

---

## Algorithm Approach

The scheduler uses a greedy reflow strategy focused on producing a valid schedule.

The algorithm follows these steps:

1. Sort work orders by original start date.
2. Build a dependency graph.
3. Run topological sort so parent work orders are processed before child work orders.
4. Detect circular dependencies early.
5. Process each work order in dependency-safe order.
6. For each work order, calculate the earliest possible start date based on:
   - original start date
   - latest parent end date
   - work center availability
7. Move the start date to the next valid working time if needed.
8. Calculate the end date by counting only available working minutes.
9. Track work center availability to prevent overlaps.
10. Return updated work orders, changes, and explanations.
11. Validate the generated schedule with `ConstraintChecker`.

---

## Constraint Handling

### Dependencies

A work order can depend on one or more parent work orders.

The child work order cannot start until all parent work orders have completed.

Example:

```text
WO-A -> WO-B -> WO-C
```

The scheduler processes this in dependency-safe order:

```text
WO-A, then WO-B, then WO-C
```

Multiple parent dependencies are also supported.

---

### Work Center Conflicts

A work center can only process one work order at a time.

If two work orders overlap on the same work center, the later one is moved after the previous work order finishes.

---

### Shift Boundaries

Work can happen only during configured shifts.

Example:

```text
Shift: 08:00-17:00
Work order starts: 16:00
Duration: 120 minutes
```

Result:

```text
16:00-17:00 = 60 minutes worked
next day 08:00-09:00 = 60 minutes worked
```

The final end date becomes the next working day at 09:00.

---

### Maintenance Windows

Maintenance windows block production time.

If a work order overlaps maintenance, the work pauses and resumes after the maintenance window.

Example:

```text
Work order starts: 11:00
Duration: 240 minutes
Maintenance: 12:00-14:00
```

Result:

```text
11:00-12:00 = 60 minutes worked
12:00-14:00 = maintenance pause
14:00-17:00 = 180 minutes worked
```

The final end date becomes 17:00.

---

### Maintenance Work Orders

Work orders with `isMaintenance: true` are treated as fixed.

They are not rescheduled.

Normal work orders are scheduled around them.

---

## Sample Scenarios

### 1. Delay Cascade

A delayed work order causes downstream dependent work orders to move.

```text
WO-001 -> WO-002 -> WO-003
```

If WO-001 takes longer than originally planned, WO-002 and WO-003 are moved accordingly.

---

### 2. Shift Boundary

A work order starts near the end of a shift and cannot finish before the shift ends.

The scheduler pauses the work and resumes it on the next available shift.

---

### 3. Maintenance Conflict

A work order overlaps a planned maintenance window.

The scheduler pauses the work during maintenance and resumes afterward.

---

### 4. Large Generated Dataset

The project also includes a larger deterministic demo dataset.

By default, it generates:

- 5 work centers
- 20 manufacturing orders
- 100 work orders
- dependency chains
- repeated work center conflicts
- maintenance windows
- setup time on selected work orders

This scenario demonstrates that the algorithm works beyond small hand-written examples.

---

## Output Example

The reflow service returns:

```ts
{
  updatedWorkOrders: WorkOrderDocument[];
  changes: ScheduleChange[];
  explanations: string[];
}
```

Example change:

```ts
{
  workOrderId: "WO-002",
  workOrderNumber: "WO-002",
  oldStartDate: "2026-06-01T10:00:00Z",
  oldEndDate: "2026-06-01T12:00:00Z",
  newStartDate: "2026-06-01T12:00:00Z",
  newEndDate: "2026-06-01T14:00:00Z",
  movedByMinutes: 120,
  reason: "dependencies completed at 2026-06-01T12:00:00Z"
}
```

---

## Validation

The project includes a separate `ConstraintChecker`.

It validates that the generated schedule respects:

- dependency constraints
- work center conflict constraints
- availability constraints
- fixed maintenance work orders

If the generated schedule is invalid, the reflow service throws an error explaining the issue.

---

## Tests

The automated test suite uses Vitest.

Run:

```bash
npm test
```

Covered cases:

```text
✓ delay cascade
✓ shift boundary
✓ maintenance conflict
✓ circular dependency detection
✓ work center conflict resolution
✓ multiple parent dependencies
✓ fixed maintenance work orders
```

---

## AI Usage

AI assistance was used for:

- requirement analysis
- algorithm design discussion
- edge case exploration
- sample data planning
- test coverage planning
- documentation planning

Prompt logs are saved in the `/prompts` directory.

This was done intentionally because the task allows AI tools and requests prompt documentation when AI is used for key decisions.

---

## Bonus Features Implemented

- Automated test suite with Vitest
- DAG-style dependency graph
- Topological sorting
- Circular dependency detection
- Multiple parent dependency support
- Setup time support through `setupTimeMinutes`
- Large generated demo dataset
- AI prompt documentation
- Constraint validation layer
- `@upgrade` comments for future improvements

---

## Trade-offs

### Greedy Scheduling

The current algorithm uses a greedy scheduling approach.

It processes work orders in dependency-safe order and places each work order at the earliest valid available time.

This keeps the algorithm readable, predictable, and easy to validate.

However, it does not attempt global optimization.

For example, it does not try to reorder independent work orders to minimize total delay.

---

### Snapshot-Based Output

The algorithm treats the input schedule as a document snapshot and produces a new updated schedule snapshot.

The original work order documents are not mutated directly.

Instead, updated work order documents are returned together with a change log.

This approach matches typical ERP-style workflows where document state changes are tracked over time.

---

### Start/End Model

The current model stores only `startDate` and `endDate`.

When a work order pauses during non-working hours or maintenance windows, the pause is represented implicitly by the extended end date.

The model does not currently store detailed execution segments.

Example of a future segment model:

```text
WO-201:
- 2026-06-01T11:00:00Z -> 2026-06-01T12:00:00Z
- 2026-06-01T14:00:00Z -> 2026-06-01T17:00:00Z
```

---

## Known Limitations

- The algorithm prioritizes schedule validity over optimization.
- It does not minimize total delay globally.
- It does not currently calculate work center utilization.
- It does not calculate idle time.
- It does not support alternative work centers for the same work order.
- It does not store detailed execution segments for paused work.
- Shift definitions currently use whole hours.
- All dates are treated as UTC.

---

## Future Improvements

Potential improvements:

- Add optimization metrics:
  - total delay introduced
  - affected work orders count
  - work center utilization
  - idle time analysis
- Store execution segments for each work order.
- Add support for alternative work centers.
- Add priority-based scheduling.
- Add due date awareness.
- Add larger stress tests with 1000+ work orders.
- Add JSON import/export for schedule data.
- Add visualization for schedule before/after reflow.

---

## Example Usage

```ts
import { ReflowService } from "./reflow/reflow.service";

const reflowService = new ReflowService();

const result = reflowService.reflow({
  workOrders: [],
  workCenters: [],
  manufacturingOrders: [],
});

console.log(result.updatedWorkOrders);
console.log(result.changes);
console.log(result.explanations);
```
