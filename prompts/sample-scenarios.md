# AI Prompt Log — Sample Scenarios

## Context

The technical test requires sample data that demonstrates the production schedule reflow algorithm.

Required scenario categories:
- Delay cascade
- Shift boundary or maintenance conflict

The submission section asks for 3+ scenarios, so this project includes three scenarios.

## Prompt

I asked ChatGPT to help design clear sample scenarios that demonstrate the main hard constraints of the scheduler.

## Key Decisions

- Add one delay cascade scenario with a dependency chain: WO-001 -> WO-002 -> WO-003.
- Add one shift boundary scenario where a 120-minute order starts one hour before the shift ends.
- Add one maintenance conflict scenario where an order overlaps a blocked maintenance window.
- Keep the sample data small and readable so it is easy to explain in the README and Loom demo.

## Reasoning

The scenarios are intentionally simple because the goal is to clearly demonstrate correctness of the core constraints:
- dependencies
- shift boundaries
- maintenance windows
- work center availability