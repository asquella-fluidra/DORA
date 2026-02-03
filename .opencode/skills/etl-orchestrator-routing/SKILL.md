---
name: "etl-orchestrator-routing"
description: "Defines deterministic routing rules from task intent to the correct Skill and Specialist agent, with gates and stop conditions."
---

# Purpose
Provide deterministic routing so tasks are executed step-by-step with the correct specialist and the right Quality Gates.

# Scope
## IN SCOPE
- Define routing rules (keywords -> skill -> specialist agent)
- Define mandatory stop conditions and evidence requirements
- Define how to split a task into micro-steps (max 15 files per step)
## OUT OF SCOPE
- Implementing code changes
- Installing dependencies
- Running deployments

# Inputs
- Task description from user
- Skill catalog under .opencode/skills/
- Specialist agents under .opencode/agents/
- docs/governance/*

# Outputs
- A routing table the Orchestrator follows every time:
  - category, keywords, skill, specialist, gates

# Steps
1) Classify the task into one of:
   - governance/docs
   - repo toolchain
   - cdk/infra
   - domain/contracts
   - glue/pyspark
   - observability
2) Select the Skill:
   - Prefer the most specific skill that matches the intent.
3) Select the Specialist agent:
   - CDK changes -> @cdk-architect
   - Glue changes -> @glue-engineer
   - Domain/contracts -> @domain-analyst
   - Governance-only -> Orchestrator (no code changes)
4) Define the micro-step boundary:
   - If >15 files estimated, split into smaller steps.
5) Execute via Specialist (not Orchestrator) and enforce gates.
6) Require evidence before proceeding.

# Verification
- Confirm the chosen Skill defines:
  - Scope IN/OUT
  - Verification commands
  - Failure handling
- Confirm gates are applicable and listed (build/test/lint/cdk synth, etc.)

# Failure handling
- If verification fails or outputs differ: stop, fix, re-run gates. Do not proceed.

# Do / Don't
- Do keep routing deterministic and explicit.
- Don't allow "improvised" execution outside skills and governance.
