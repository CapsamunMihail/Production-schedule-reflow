# AI Prompt Log — Constraint Checker

## Context

The technical test evaluation gives significant weight to hard constraint satisfaction:
- no work center overlaps
- dependencies satisfied
- work only during shifts
- maintenance windows respected
- maintenance work orders cannot be rescheduled

## Prompt

I asked ChatGPT to help design a separate validation layer for the generated production schedule.

## Key Decisions

- Implement a dedicated `ConstraintChecker` instead of mixing validation into `ReflowService`.
- Validate dependencies by checking that each child starts after all parent work orders end.
- Validate work center conflicts by sorting work orders per work center and checking for overlaps.
- Validate availability by recalculating expected end dates using shift and maintenance rules.
- Validate that maintenance work orders keep their original start and end dates.
- Add warnings for start times that are not inside an available shift.
- Keep full segment-level validation as an `@upgrade` item because the current data model stores only start/end dates, not execution segments.

## Trade-off

The current validation checks that the final schedule is consistent with the availability calculation. It does not store or validate individual execution segments yet.

## Future Improvement

Generate and store execution segments for each work order, for example:

- 2026-06-01T11:00:00Z -> 2026-06-01T12:00:00Z
- 2026-06-01T14:00:00Z -> 2026-06-01T17:00:00Z

This would allow more detailed validation and better demo output.