# Branch Workflow

Astro-star uses two long-lived branches in this repository:

- `main` is the primary branch and template branch.
- `Ethan` is the user branch for the live personal site.

This document is mandatory for project development. When branch rules conflict with convenience, follow the branch rules.

## Branch Responsibilities

| Branch  | Purpose                                   | Allowed Changes                                                                             |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `main`  | Public template and shared implementation | Components, layouts, pages, styles, scripts, docs, tooling, generic template config/content |
| `Ethan` | User-specific site branch                 | User-owned files under `src/config/` and `src/content/`                                     |

Do not put Ethan-specific real personal data into `main`. Use generic template values there.

Do not implement shared template behavior directly on `Ethan`. Make shared changes on `main`, then merge or sync them into `Ethan`.

## Required Remote Sync

Before editing any branch, first update it from the remote branch.

For `main`:

```bash
git switch main
git pull --ff-only origin main
```

For `Ethan`:

```bash
git switch Ethan
git pull --ff-only origin Ethan
```

If the working tree has local changes, inspect them before pulling. Commit, stash, or otherwise preserve the local changes first. Do not discard user changes to make a pull succeed.

## Working On Template Changes

Template changes include:

- Components in `src/components/`
- Layouts in `src/layouts/`
- Pages and routing in `src/pages/`
- Styles in `src/style/`
- Scripts and tooling
- Documentation
- Dependencies and package metadata

Workflow:

1. Update `main` from remote.
2. Make the template change on `main`.
3. Verify with the smallest relevant checks, normally `pnpm check` and `pnpm build` for frontend behavior.
4. Commit on `main`.
5. Merge or sync `main` into `Ethan`.
6. After the merge, only adjust Ethan-specific `src/config/` or `src/content/` files on `Ethan`.

## Working On Ethan Content Or Config

Ethan-specific changes include:

- `src/config/site.ts`
- `src/config/links.ts`
- `src/config/social.ts`
- Files under `src/content/`

Workflow:

1. Update `Ethan` from remote.
2. Confirm the working tree only needs changes under `src/config/` or `src/content/`.
3. Make the user-specific edit.
4. Verify with `pnpm check`; run `pnpm build` when the change affects rendering.
5. Commit on `Ethan`.

If a requested Ethan change requires editing components, styles, scripts, docs, routes, or package metadata, stop and move that shared work to `main` first.

## Merge Direction

The normal direction is:

```text
main -> Ethan
```

Do not merge Ethan-specific config or content back into `main`.

When resolving conflicts during `main -> Ethan` merges, preserve Ethan's user-specific `src/config/` and `src/content/` unless the user explicitly asks to replace them.

## Checklist

- [ ] Did you pull the target branch from remote before editing?
- [ ] Are shared implementation changes on `main`?
- [ ] Are Ethan-only changes limited to `src/config/` and `src/content/`?
- [ ] Did `main` avoid Ethan-specific real personal data?
- [ ] Did checks pass before commit or merge?
