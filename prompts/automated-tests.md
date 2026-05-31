# AI Prompt Log — Automated Tests

## Context

The technical test lists automated tests as an optional bonus and notes that they are highly valued.

The scheduler must demonstrate correctness across the required scenarios and edge cases.

## Prompt

I asked ChatGPT to help design a minimal but meaningful Vitest test suite for the production schedule reflow system.

## Test Coverage Decisions

The test suite covers:

- Delay cascade: one delayed work order moves dependent work orders.
- Shift boundary: work pauses after shift end and resumes next working day.
- Maintenance conflict: work pauses during a maintenance window.
- Circular dependency: invalid dependency graph throws an error.
- Work center conflict: overlapping independent work orders are rescheduled.

## Reasoning

These tests are focused on the main evaluation criteria:
- dependency satisfaction
- work center conflict resolution
- shift handling
- maintenance handling
- impossible schedule detection

The goal is not exhaustive coverage, but clear proof that the core algorithm works.