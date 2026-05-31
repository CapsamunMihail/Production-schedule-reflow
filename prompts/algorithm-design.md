# AI Prompt Log — Algorithm Design

## Context

This project is a technical test for a production schedule reflow system. The algorithm must reschedule work orders while respecting dependencies, work center conflicts, shift boundaries, and maintenance windows.

## Prompt 1

I asked ChatGPT to help analyze the technical test requirements and break them down into implementation stages.

## Key Decisions

- Use TypeScript for the implementation.
- Use Luxon for date and time calculations.
- Use a greedy scheduling approach focused on producing a valid schedule.
- Use a dependency graph with topological sorting to process work orders in dependency-safe order.
- Add cycle detection as a bonus feature.
- Add automated tests with Vitest if time allows.

## Notes

The implementation prioritizes correctness and clear communication over global optimization.