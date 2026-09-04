# Ahead OS — spec pack

The platform spec. `CLAUDE.md` is the repo constitution — read it first, every
session. Nothing here is code yet.

```
CLAUDE.md              the seven non-negotiable rules, stack, layout, ports
docs/
  00-product-spec.md   what the product is, and what it is deliberately not
  01-architecture.md
  02-data-model.md     two determination tables, and the coverage-year freeze
  03-api-contracts.md
  04-rules-engine.md
  05-compliance-constraints.md
  06-build-plan.md     WP-0 … WP-n
  07-patient-journey.md
  08-policy-packs.md   the four funders, one engine
  09-what-else.md      the register of what is still missing
  10-base-system.md    what "built" means, and the checkable definition of done
research/
```

## Scope for the build

> Build only WP-0 through WP-6 from `docs/06-build-plan.md`, in order, one work
> package per session. Do not start WP-7 or later. Do not integrate any external
> service. Every package ends with contracts updated, a migration applied to a
> Neon branch, and tests passing. Stop and ask if a package seems to require
> something outside its scope.

`docs/10-base-system.md` carries the per-package checklist and the three ways to
verify the base without reading code.

**Nothing in this directory has been implemented yet.** No work package has been
started.

## Why this lives here

This pack and `../ahead-site` belong in their own repositories — they share only
the copy rules, and entangling them means every marketing change touches the
platform. They are staged here because this branch is the only place the handoff
had to land. Splitting either one out is `git subtree split -P <dir>`.
