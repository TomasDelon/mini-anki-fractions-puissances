# Math Trainer architecture

The existing 3ème equations PWA is the first content pack of a reusable, mobile-first math-training runtime.

## Design rules

1. The runtime must not assume every step is connected by equivalence.
2. A derivation line stores both its mathematical content and the relation to the previous line.
3. `=`, `⇔`, `⇒` and `⇐` are different semantic relations, not interchangeable decorations.
4. A pack declares which relations are allowed and whether the relation is automatic or chosen by the learner.
5. A workspace can use a relation-chain layout or an aligned-calculation layout.
6. The mobile interaction is primary; desktop must remain fully keyboard-usable and may use a compact math toolbar later.
7. Pedagogical constraints belong to the content pack and are tested automatically.
8. Generated exercises must be safe by construction; tests are a second barrier.
9. Existing offline sessions must migrate across runtime upgrades.

## Implemented foundation

### `src/trainer/core.js`

Generic derivation model:

- relations: `equals`, `iff`, `implies`, `reverse-implies`;
- layouts: `relations`, `aligned`;
- relation modes: `automatic`, `student`;
- row hydration and serialization;
- legacy-session migration;
- relation cycling for touch/click interfaces;
- validation dispatch by relation semantics.

A derivation row is now conceptually:

```js
{
  id,
  value: '3x=9',
  relationBefore: 'iff'
}
```

This permits future workspaces such as:

```text
A = 2(x+3)
  = 2x+6
  = 10
```

or:

```text
P ⇒ Q ⇔ R
```

without changing the underlying editor model.

### `src/trainer/keyboardProfiles.js`

The key library and keyboard order are declarative. A content pack refers to a keyboard profile instead of owning a hard-coded keyboard component. The library already contains relation keys for `=`, `⇔` and `⇒` for future packs.

### `src/packs/equations3eme.js`

The current application is represented by a pack manifest with:

- level and locale;
- derivation workspace configuration;
- keyboard profile;
- allowed techniques;
- forbidden techniques;
- explicit exclusion of domain analysis and the discriminant.

The current pack deliberately uses automatic `⇔` only, so the learner-facing behavior remains unchanged.

## Next implementation slices

### 1. Derivation editor extraction

Move `MathRow`, `RelationMark`, line management and focus management out of `main.jsx` into a reusable `DerivationEditor` component.

### 2. Relation-aware validators

Add separate validator contracts for:

- expression equality (`=`);
- proposition equivalence (`⇔`);
- one-way implication (`⇒`);
- mixed relation chains.

The UI should be able to explain when a step is true but only one-way, rather than simply calling it wrong.

### 3. Aligned-calculation workspace

Implement a mobile-first `aligned` derivation view for calculations such as:

```text
f(2)
 = 2² - 3×2
 = 4 - 6
 = -2
```

The relation gutter remains stable on narrow screens and becomes more spacious on desktop.

### 4. Responsive keyboard runtime

Use the same key profile with three presentation modes:

- phone: full sticky keyboard;
- tablet: wider grouped keyboard;
- desktop: physical keyboard first + compact math toolbar, with an option to show the full keyboard.

### 5. History

Add undo/redo across mathematical edits, row creation/deletion and relation changes.

### 6. Second content pack

Build a deliberately different pack (fractions or powers) to test the abstractions. It should use a single-answer or aligned-equality workspace rather than copying the equations interaction.

### 7. Skill/progression runtime

Represent skills independently from templates so performance can eventually be tracked by skill rather than only by category.

## Deployment contract

No production build should be published unless unit tests, pedagogical generator tests, browser interaction tests and the production build all pass.
