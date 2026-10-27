# Agent Note: The pet registry ignores install staging leftovers

Status: implemented

## Problem

Issue #1952, the dsh-pet half. The market installer in dsh-web
(`packages/dsh-market/src/core/installer.ts`, `installAsset`) never writes into
`$DSH_HOME/pets/<id>` directly: it downloads into a sibling staging directory
named `<id>.install-<base36 ms>-<base36 random>`, then renames it onto the id on
success, and removes it on the failure path. A host killed between those steps
leaves the staging directory behind.

`scanPetDir` walked every directory in a pets source that did not start with a
dot, so a leftover was a pet like any other. Two facts then combined into silent
data loss: `readdirSync` names are sorted, so `jyn-loli` sorts before
`jyn-loli.install-mvo23x51-thmrh2`, and `loadPetRegistry` lets a later entry win
the id collision. The half-written leftover therefore replaced the finished pet
of the same id, and the board rendered whatever the interrupted download had
managed to write — a pet whose atlas or frame tracks were incomplete, with no
message explaining why the working install had stopped being used.

## Decision

- `scanPetDir` recognizes the staging shape and drops the directory **before it
  looks for `pet.json`**. `PET_INSTALL_STAGING_NAME`
  (`/\.install-[0-9a-z]{1,11}-[0-9a-z]{1,11}$/`) encodes the producer's real
  range rather than a prefix test: base36 of `Date.now()` is 8 digits today and
  stays under 11 for several millennia, and `Math.random().toString(36).slice(2, 8)`
  is always exactly 6 characters. A name that merely mentions `.install-` outside
  that shape stays an ordinary pet directory.
- The skip is **reported, not repaired**: one warning string plus one
  `PetRegistryDiagnostic` with `level: 'warning'` and `source` set to the
  residual directory, then `continue`. Both name the leftover directory, so a
  user can delete it themselves; the scan stays read-only and never deletes,
  renames, or moves anything aside.
- Reporting does not depend on the leftover holding a manifest, because the
  shape is checked before `pet.json` is read. A failed install that died on its
  first file is exactly the case a user needs told about.
- Dot-prefixed directories keep their existing treatment: they are filtered out
  with `!name.startsWith('.')` and stay silent, so `.jyn-loli.install-...` is not
  reported twice. Override semantics across `assets/`, the codex pets directory
  and `$DSH_HOME/pets` are untouched; nothing about which source wins changed.

## Alternatives considered

- **Delete the leftover during the scan.** A registry read is not a write
  surface, and a scan that deletes is a scan that can destroy a directory
  because of a name. The layout is recoverable by hand and the warning says
  which directory to remove.
- **Skip a staging directory only when a sibling with the same id exists.** Makes
  the result depend on scan state rather than on the name: a leftover whose
  finished pet had also been removed would come back as a listed pet, and the
  order in which sources are scanned would decide the answer.
- **Match any name containing `.install-`.** Wider than the producer, so it
  would swallow genuine pet directories whose name happens to contain the
  token, and it cannot be justified by anything the installer writes.
- **Prefer the entry with more tracks / more frames.** The issue rules out
  content heuristics, and there is no reliable ordering to rank: a finished
  sprite2d pet and a partial frames2d leftover are not comparable, and the
  heuristic would silently change results for installed pets that have nothing
  to do with installs.
- **Move the rank so the shorter name always wins.** Would fix this collision by
  accident while changing which source wins for every other duplicate, and would
  still list the leftover as its own pet.
- **Fix it only in dsh-market.** The installer owns the cleanup it already
  attempts, but a crash leaves no code to run; the reader is the side that must
  not be poisoned by what it finds.
- **Also filter `scanDecorationDir`.** A decoration would fall to the identical
  later-wins rule — `scanDecorationDir` sorts names and `loadPetRegistry` lets a
  later same-id user entry override the built-in one — so the risk was worth
  checking. No install can create a staging directory there, which is why this
  change stays on the pet scan: the staging directory is always
  `dest + '.install-...'` (`packages/dsh-market/src/core/installer.ts:395`), and
  `dest` is `join(dshHome, KIND_DIR[kind], id)` (`:172-174`) with `KIND_DIR`
  limited to `skins` / `pets` / `agent-presets` (`:96-100`). `MarketKind` has no
  decoration kind (`:93`), and `KIND_ID_RE` forbids `/` in an id (`:112`,
  enforced at `:150`), so a pet install lands on `pets/<id>` with its staging
  beside it, never inside `pets/decorations`. Manifest file paths cannot smuggle
  one in either: `isSafeRel` rejects `..`, `//` and leading or trailing `/`
  (`:134-141`) and every `rel` is joined inside the staging directory
  (`:402-405`), so `decorations/x` would land under `pets/<id>/decorations/x`.
  The catalog cannot even offer the one id that reaches the decoration root
  (`decorations`), because a pet item requires `pet.json` in its directory
  (`scripts/market-build:294`, and `assets/decorations/` has none). Finally,
  nothing else writes that directory: no script in this repository touches
  `decorations`, and `README.zh.md:218` documents
  `$DSH_HOME/pets/decorations/<id>/` as user-placed content over the built-in
  set. Should a future asset kind install decorations, the exact-shape filter
  belongs in that scan layer, next to this one.

## Consequences

- A leftover can no longer override the finished pet with the same id: the
  complete pet stays listed, the id resolves to its directory, and the board
  renders it. The fix takes effect the next time the registry is built, i.e.
  after the DSH host restarts.
- A pet directory whose name is exactly `<anything>.install-<base36>-<base36>` is
  now unreachable. No manifest id can produce such a name (ids are lowercase
  kebab), and it is the price of an exact shape match.
- Each leftover costs one warning per scan. That is the diagnosability the issue
  asks for, and the count is bounded by how many installs were interrupted.
- Tests: `src/registry.test.ts` covers the finished pet surviving beside a
  same-id leftover (asserting one entry, the finished `displayName` and
  directory, one warning plus one diagnostic whose `source` is the leftover, and
  that the leftover is still on disk), a leftover with no `pet.json` still being
  reported, a dot-prefixed staging directory staying silent, and a name outside
  the exact shape staying an ordinary pet. With the filter disabled the first two
  fail — the `displayName` becomes the half-installed one — so the regression is
  pinned rather than incidentally passing.
