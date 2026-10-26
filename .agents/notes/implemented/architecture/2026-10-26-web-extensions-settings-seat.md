# Agent Note: Pet Web Extensions settings seat

Status: implemented

## Problem

The pet settings page needs to join the shared Web Extensions parent without disappearing from standalone installs. Its old single-column form also spends little of the available width and gives no visual help when choosing among pets.

## Decision

The pet page registers into the keyed/root `web-ui.extension` seat with key `pet` while `webUiExtensions` exists, and into its original first-level `settings.section` id `pet`, order 130 otherwise. One reconciliation loop follows `slots/changed`, disposes the old entry before registering the replacement and guards synchronous re-entry. The form controller belongs to apply, not to either seat, so moving seats preserves staged edits and subscriptions. The keyed registration carries no list-only id, order or label.

The settings card uses a responsive two-column layout: visual pet choices with local atlas or frame previews on one side, grouped display and behavior fields on the other. Narrow containers become one column. The selection remains a staged `petId` write, and the inherit action, validation, save/discard behavior and fallback pet-state API remain unchanged. A semantic `data-dsh-plugin="pet"` settings root lets skins identify the page without first-level navigation positions.

## Alternatives considered

- A permanent keyed registration with no fallback. Rejected because standalone pet installs would lose settings.
- Rebuilding the controller during every seat migration. Rejected because it would discard drafts and repeat registry requests.
- Keeping a text-only selector. Rejected for the requested visual design; static thumbnails reuse already-served registry assets and add no second asset channel.

## Consequences

- Full family installs show Pet as a Web Extensions TAB; standalone installs retain their original entry.
- `src/client/settings-registration.test.ts` pins dynamic migration, and the existing settings suites pin form and fallback behavior. The visual-choice mount assertion lives in `tests/pet-section.spec.tsx`.
- Desktop and narrow-viewport verification belongs to the change's delivery evidence.
