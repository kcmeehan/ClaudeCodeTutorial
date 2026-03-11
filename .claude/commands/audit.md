Your goal is to update any vulnerable dependencies.

Do the following:

1. Run `npm audit` and review the output. Note any vulnerabilities found, their severity, and the affected packages.

2. Run `npm audit fix` to automatically apply safe updates.

3. Run `npm test` to verify the fixes didn't break anything.

4. If tests pass, report a summary of what was fixed. If tests fail, investigate which fix caused the regression, and if needed, revert that specific package update while keeping other fixes.

5. If `npm audit fix` was unable to fix all vulnerabilities (e.g., issues requiring `--force` that could introduce breaking changes), report which vulnerabilities remain and explain why they were not automatically fixed — do not run `npm audit fix --force` without explicit user approval.
