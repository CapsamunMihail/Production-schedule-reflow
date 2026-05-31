# AI Prompt Log — Reflow Service

## Context

The technical test requires a production schedule reflow algorithm. The algorithm must update work order dates after disruptions while respecting dependencies, work center conflicts, shift boundaries, and maintenance windows.

## Prompt

I asked ChatGPT to help design the main `ReflowService` for the scheduling algorithm.

## Key Decisions

- Use a greedy scheduling approach.
- Process work orders in dependency-safe order using the existing `DependencyGraph`.
- Preserve original start order for work orders that do not depend on each other.
- Calculate the earliest possible start date as the maximum of:
  - original work order start date
  - latest parent work order end date
  - latest work center available date
- Use `calculateEndDateWithAvailability` to compute the real end date based on working minutes.
- Treat maintenance work orders as fixed blocks and do not reschedule them.
- Convert maintenance work orders into additional blocked windows for normal work orders.

## Trade-offs

This implementation prioritizes validity, readability, and predictable behavior over global optimization.

## Future Improvements

- Add global optimization to reduce total delay.
- Add utilization metrics.
- Add more advanced conflict resolution for independent work orders.
- Add support for alternative work centers.