# AI Prompt Log — Technical Hardening

## Context

Before writing the README and preparing the demo, I reviewed the technical test requirements again and identified a few small gaps.

The hard requirements include:
- all work must happen inside shift hours
- all parent dependencies must complete before child work orders start
- maintenance work orders cannot be rescheduled

## Prompt

I asked ChatGPT to review the current implementation against the technical test and suggest small improvements before final documentation.

## Improvements Implemented

- Updated `ReflowService` so scheduled `startDate` is also moved to the next available working time.
- Added a test for multiple parent dependencies.
- Added a test for fixed maintenance work orders.
- Verified that normal work orders are scheduled around fixed maintenance work orders.

## Reasoning

These improvements make the implementation better aligned with the evaluation criteria, especially hard constraint satisfaction.