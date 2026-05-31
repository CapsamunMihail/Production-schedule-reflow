# AI Prompt Log — Large Demo Data

## Context

After reviewing the Naologic explainer video, I noticed that they emphasized the importance of having as much demo data as possible.

They described the task as a classic scheduling problem related to:
- capacity planning
- resource management
- time constraints
- dependency constraints
- location/work center constraints

## Prompt

I asked ChatGPT to help design a larger deterministic demo dataset for the production schedule reflow system.

## Key Decisions

- Add a generated large scenario instead of manually writing hundreds of work orders.
- Use 5 work centers.
- Use 20 manufacturing orders.
- Generate 100 work orders by default.
- Include dependency chains within manufacturing orders.
- Create repeated work center conflicts by assigning nearby start times.
- Add maintenance windows to selected work centers.
- Add optional setup time to some work orders.
- Print a summary instead of dumping all generated work orders to the console.

## Reasoning

The large scenario demonstrates that the algorithm works beyond small hand-written examples while keeping the demo output readable.

The generator is deterministic, so test/demo output remains stable.