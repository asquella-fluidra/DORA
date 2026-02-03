---
name: "etl-skill-registry"
description: "Defines how to maintain the canonical list of project skills, their scope, and their verification gates."
---

# Purpose
Maintain a single, consistent view of all Skills in this repo so the Orchestrator can route work without improvisation.

# Scope
## IN SCOPE
- Define how to list all skills under .opencode/skills/
- Define the minimal metadata each skill must contain (name, description, scope, verification)
- Define how to validate a skill folder is compliant (naming + SKILL.md + frontmatter)
## OUT OF SCOPE
- Executing skills
- Editing infrastructure or source code

# Inputs
- .opencode/skills/* folders
- docs/governance/* (rules and quality gates)

# Outputs
- A deterministic checklist the Orchestrator can apply before using any skill:
  - naming compliance
  - required sections present
  - verification commands defined

# Steps
1) Enumerate all skill folders under .opencode/skills/.
2) For each skill:
   - Confirm folder name matches frontmatter `name`.
   - Confirm file is named SKILL.md (uppercase).
   - Confirm required sections exist (Purpose, Scope, Inputs, Outputs, Steps, Verification, Failure handling, Do/Don't).
3) If a skill is missing requirements:
   - Stop and request a fix before using it.
4) Confirm the skill's Verification aligns with docs/governance/quality-gates.md.

# Verification
- Manual check (no repo changes):
  - Count SKILL.md files and confirm only intended skills exist
  - Confirm each skill includes Verification commands and Expected results

# Failure handling
- If any skill violates naming/format: do not use it. Request correction first.

# Do / Don't
- Do keep skills small and SOLID (single responsibility).
- Don't create "god skills" that do everything end-to-end.
