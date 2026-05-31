# AI Prompt Log — Dependency Graph

## Context

The technical test requires support for work order dependencies. A work order can depend on one or multiple parent work orders, and all parents must finish before the child can start.

The assignment also lists DAG implementation, topological sorting, and cycle detection as optional bonus features.

## Prompt

I asked ChatGPT how to structure the dependency management part of the production schedule reflow system in TypeScript.

## Key Decisions

- Represent work order dependencies as a directed graph.
- Use topological sorting to process parent work orders before their children.
- Use DFS with `visited` and `visiting` sets.
- Throw an error when a circular dependency is detected.
- Throw an error when a work order references a missing dependency.

## Reasoning

This approach keeps the scheduling algorithm simpler because the main reflow service can process work orders in dependency-safe order.

It also helps detect impossible schedules early, before calculating dates.