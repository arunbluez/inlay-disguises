# Security policy

## Reporting a vulnerability

**Don't open a public issue, discussion or pull request for a security problem.** Report it privately through GitHub instead:

1. Open the repository's [Security tab](https://github.com/arunbluez/inlay-disguises/security).
2. Choose **Report a vulnerability** and fill in the advisory form.

Only the maintainers can see the report. Include what you found, where (package, file, version or commit), how to reproduce it, and what you think the impact is. A proof of concept helps; please don't test against other people's devices or data.

What to expect:

- an acknowledgement within 7 days;
- an assessment and a plan, or questions, within 30 days;
- a fix released as a new package version (and, where it applies, a new app release), then a published advisory that credits you unless you ask not to be named.

Please give us a reasonable time to ship the fix before you disclose it.

## Scope

In scope: the packages in this repository (`@inlay/disguise-sdk`, `@inlay/ui`, `@inlay/testkit`, `@inlay/disguise-*`), the playground, and the repository's CI and release workflows. Examples: a disguise that behaves differently for a right and a wrong code, a way for a disguise to escape the import boundary or the `allowedHosts` list, or anything that leaks a typed code (to storage, logs or the network).

The app that runs these disguises is a separate codebase. If you find a problem in the app itself, report it the same way; it reaches the same maintainers.

## Supported versions

Fixes land on the latest `1.x` release of each package. Older versions are not patched.
