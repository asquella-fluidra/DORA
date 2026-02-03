# Project Orchestrator — B2B ETL Dashboard

## 0) Source of truth (Governance)
This repo loads reusable rules via `opencode.json` → `instructions`.
Before doing any work, apply:
- docs/governance/rules.md
- docs/governance/quality-gates.md
- docs/governance/cdk-conventions.md
- docs/governance/clean-architecture-ddd.md

If there is any conflict, governance docs win.

## 1) Orchestrator role (how work is executed)
This file defines the orchestration contract for all work in the repo:
- Break work into small steps.
- Route each step to the most relevant Skill.
- Require evidence (commands + outputs) before proceeding.
- Enforce stop conditions (no "next step" when gates fail).

## 2) What "Skills" mean in this repo (official format)
A Skill is a reusable workflow packaged as:
- A folder that contains a `SKILL.md` file.
- `SKILL.md` must include metadata with at least `name` and `description`.
- Skill names must be lowercase, 1–64 chars, hyphen-separated, and match the directory name (regex: ^[a-z0-9]+(-[a-z0-9]+)*$).

Project-local skills live under:
- .opencode/skills/<skill-name>/SKILL.md

## 3) Non-negotiables
- Infrastructure (AWS CDK v2) and Lambdas are TypeScript.
- Python is only allowed under `glue/` for AWS Glue PySpark jobs.
- Secrets must never be committed. Use AWS Secrets Manager or SSM Parameter Store.
- IAM must follow least privilege. Avoid wildcards unless documented.

## 4) Working style (step-by-step)
- Make small, verifiable changes per step.
- Never proceed if a Quality Gate fails.
- If a step would touch more than 15 files, stop and split it.

## 5) Evidence required after each step
Always provide:
1) Files changed (list)
2) Commands executed + output
3) Expected vs actual results
4) Fixes applied (if any) + re-run gate outputs

## 6) Repository boundaries (Clean Architecture + DDD)
- infra/  → CDK (TypeScript only)
- src/    → domain + application code (domain has no AWS dependencies)
- glue/   → Glue PySpark jobs (Python only)
- docs/   → executive + architecture docs
- .opencode/ → agents + skills

## 7) Definition of Done (DoD)
A step is "done" only when the applicable gates pass (see docs/governance/quality-gates.md).
