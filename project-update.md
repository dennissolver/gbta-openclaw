Project Update: OpenClaw Wrapper UI Branding and Licensing References
Status: Draft / Active development
Last updated: 2026-03-18
Author: Corporate AI Solutions (GBTA wrapper team)

1) High-level goals
- Add a dedicated References & Acknowledgments panel to the UI.
- Auto-generate and display a licenses list for dependencies, sourced from package manifests.
- Rename branding to reflect “Corporate AI Solutions” while clarifying this is a wrapper around OpenClaw (not the original project).
- Ensure attribution: OpenClaw MIT license, dependencies’ licenses, and developer-provided notices.
- Provide a patch/diff set or code snippets that can be merged into the existing gbta-openclaw wrapper.

2) Scope and boundaries
- In-scope:
- UI changes to show references/acknowledgments.
- Automatic licenses generator pulled from package.json and dependencies with license fields.
- Branding updates to reflect “EasyOpenClaw – An OpenClaw wrapper provided by Corporate AI Solutions” or an agreed product name.
- A changelog entry describing changes.
- Documentation updates (LICENSE notices page, About/ acknowledgments).
- Out-of-scope:
- Rewriting upstream OpenClaw logic beyond the wrapper, unless required for attribution.
- External licensing negotiations or legal counsel content beyond attribution text.

3) Deliverables (per task)

A. UI: References & Acknowledgments panel
- Create a new reusable React component: ReferencesPanel.tsx (or equivalent).
- Data sources:
- OpenClaw MIT license reference with a link to: https://github.com/openclaw/openclaw/blob/main/LICENSE
- Dependencies licenses (auto-generated from package.json + node_modules licenses if accessible in build).
- Your wrapper attribution: “EasyOpenClaw – OpenClaw wrapper provided by Corporate AI Solutions.”
- UI/UX:
- Collapsible panel labeled “References & Acknowledgments.”
- Sections:
- OpenClaw: MIT license, link to license
- Dependencies: list with name, version, and license
- Wrapper: branding text and disclaimer
- Accessibility: keyboard accessible, proper headings.

B. Auto-generated licenses list
- Implement a LicensesGenerator component/service
- Input: package.json and the installed dependencies’ licenses (read from node_modules or a curated SPDX list if available).
- Output: a rendered list in the panel and a machine-readable file (LICENSES-GENERATED.md) for auditing.
- Output content example:
- OpenClaw: MIT License (link)
- Dependency A: MIT/Apache-2.0/etc. (link)
- Dependency B: Apache-2.0 (link)
- Consider a fallback if licenses are not discoverable: indicate “License: unknown” with a note to verify manually.

C. Branding changes
- Replace internal branding references from “GBTA” to “Corporate AI Solutions” in UI labels where appropriate, while keeping upstream attribution intact.
- Product naming:
- Wrapper name: “EasyOpenClaw” (as requested) with a tagline: “An OpenClaw wrapper provided by Corporate AI Solutions.”
- Update package.json name field if you want the local project identity to reflect the wrapper (e.g., "name": "easyopenclaw-wrapper"), with a note in README about it being a wrapper around OpenClaw.
- Branding copy to include in About/Help:
- “EasyOpenClaw: OpenClaw wrapper by Corporate AI Solutions (not the original project).”
- Link to Corporate AI Solutions site: https://www.corporateaisolutions.com

D. Documentation and patches
- Project_update.md should include patch notes and a recommended patch/diff path.
- Create a Patch/Notes folder:
- patches/ui-ReferencesPanel.diff
- patches/licenses-generator.diff
- patches/branding-wrapper.diff
- Include instructions for applying patches (git apply) and a minimal test plan.

E. Changelog entry
- Add an entry to CHANGELOG.md describing:
- Added References & Acknowledgments panel
- Auto-generated licenses list from dependencies
- Branding to reflect Corporate AI Solutions wrapper
- Any UI/UX tweaks and accessibility improvements

4) Acceptance criteria
- The UI now contains a References & Acknowledgments panel with at least:
- OpenClaw MIT license attribution and link
- A dynamic list of dependencies and licenses
- Wrapper attribution for Corporate AI Solutions
- A generated licenses file exists (LICENSES-GENERATED.md) with entries for major dependencies and their licenses.
- Branding updated to reflect wrapper naming, with a clear disclaimer that it’s a wrapper around OpenClaw.
- A patch set is provided and can be applied to the repo without breaking build.
- Documentation (project-update, README, About section) reflects the changes.

5) Risks and mitigations
- Risk: Some licenses may be hard to auto-detect for all dependencies.
- Mitigation: If a license is not detected, mark as “License: unknown” and provide a manual review note.
- Risk: Branding misinterpretation (audience thinking this is the original project).
- Mitigation: Explicit disclaimer in References panel, About page, and CHANGELOG.

6) Timeline and actions
- Day 1:
- Scaffold UI components (ReferencesPanel) and LicensesGenerator.
- Implement auto-generation from package.json and basic dependency analysis.
- Add wrapper branding and disclaimers.
- Day 2:
- Wire up the panel in the main wrapper UI.
- Generate LICENSES-GENERATED.md and update CHANGELOG.md.
- Write patch diffs.
- Day 3:
- Review for accessibility, test rendering, and ensure build passes.
- Finalize documentation updates and ready-to-merge patches.

7) Review and approvals
- Please confirm:
- The exact wrapper/product name to display (e.g., “EasyOpenClaw by Corporate AI Solutions” or a preferred variant).
- Whether you want to display a full license file inline or as a link.
- If you want me to include a dedicated README section describing the licensing approach and branding rationale.