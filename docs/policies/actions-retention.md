# GitHub Actions Retention

## Scope

This policy applies to workflow-run history in `drakeshard/web-foundation`.

## Retention Rules

- Runs on the default branch are retained and are not deleted by repository automation.
- While a pull request is open, its workflow-run history is retained for debugging.
- When a same-repository pull request closes, automation retains the newest completed `CI` run and newest completed `Dependency Review` run for that branch.
- Older completed runs for the closed branch are deleted, including obsolete runs from retired temporary workflows.
- A scheduled sweep applies the same cleanup to stale non-default branches that have no open pull request.
- Fork pull-request branches are not modified by the close-event cleanup.
- The cleanup workflow never deletes its own runs.

## Manual Operation

`Actions Retention` supports manual dispatch.

Manual runs default to dry-run mode. Use dry-run to review candidates before enabling deletion.

A manual run may specify a non-default branch for immediate cleanup. This is the preferred way to clean an already-closed branch without waiting for the scheduled stale-branch threshold.

The stale-branch age threshold defaults to seven days.

## Rationale

Pull-request iteration can produce many superseded success, failure, and cancelled workflow runs. Those runs are useful while work is active but provide little long-term value after the pull request closes.

The retained final CI and dependency-review runs preserve the useful branch-level evidence. Default-branch history remains untouched.

## Permissions

The workflow uses:

- `actions: write` to delete completed workflow runs;
- `contents: read`;
- `pull-requests: read`.

No repository-content write permission is granted.
