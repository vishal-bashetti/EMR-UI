# Browser review fixes

Implemented locally for the four findings from the 26 October 2026 browser review. These changes have not been deployed or verified on the live site.

| Finding | Change |
|---|---|
| EMR-001 | Dashboard New Consultation now opens `/visits/new?action=start`, with patient search and patient-specific consultation links. The daily consultation list also offers New Consultation, including on empty days. Existing appointment-selection behavior is preserved. |
| EMR-002 | Quick Add filters actions using the existing permission helper and checks permission before handling Ctrl/Cmd+N. No permitted actions means no Quick Add button. Patients disables its query and denies the route before rendering data/forms when view permission is absent; creation additionally requires manage permission, including direct `?action=new` links and submission. The walk-in action now targets the appointments walk-in workflow. |
| EMR-003 | Registration controls are nested within their native labels, preserving required-field validation and label-based focus/lookup. The close button has an accessible name. |
| EMR-004 | Chart header, snapshot fallback, consultation banner and completion review use a shared allergy-status component. Empty records mean unreviewed, not confirmed no-known allergies. Loading and retrieval failures have distinct messages; active allergies retain details and warning styling. Inactive entries are not presented as active. |

The backend has no explicit negative-allergy-review field. This patch does not invent one or alter patient records; implementing a clinician-confirmed none-known review would require a separate model/API workflow.

## Validation

- `npm run test:ui`: 14 passing UI regression tests using Vitest, jsdom and Testing Library. These exercise dashboard/list → patient selection → encounter route, debounced search and empty results, permission denial/loading, pharmacist shortcuts, permitted clinical actions, read-only patient access, all registration labels/required validation/close, and allergy empty/loading/error/active/inactive states.
- `node --test tests/lisOrderSubmission.test.mjs`: 2 existing tests pass.
- `npm run typecheck`: passes.
- `npm run build`: passes (bundle-size advisory remains).
- Scoped ESLint on the new components, Quick Add and the regression tests: passes.

Regression tests mock API responses and the final encounter screen. They validate local UI behavior; live login, deployed navigation and real appointment/dispense/signing workflows require a post-deployment smoke test. No medication was dispensed, consultation signed, or real patient data edited for these fixes.

Pre-existing changes in `src/api/axios.ts` and the parent backend repository were left untouched.
