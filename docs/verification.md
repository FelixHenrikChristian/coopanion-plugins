# Initial verification · package 0.1.0

The initial local checks ran on Windows with Node.js 26.3.1. No runtime dependency installation was required. The production extension has not yet been installed into a person's running Core during these checks.

- Twelve isolated tests use actual loopback HTTP servers and temporary directories. They exercise outfit-specific choices, incomplete resource matrices, profile boundaries, default construction, apply/stop restoration, external choices, preference preservation, interrupted-write recovery, serialized requests, origin restrictions, reinstall and unavailable-service reporting.
- The official `cortico@0.2.12` manifest parser, `dryMountWorld` and `checkDescribe` accepted the extension with no warnings or failures. These checks construct a World in a fake deployment without calling `start()`; they verify the official declaration contract, not full host runtime integration.
- The actual panel client was opened in a browser against an isolated local service with a fictional character. Manual interactions verified different control groups, applying choices, restoring the previous appearance and reading the authoring guide.
- Package inspection uses an explicit file allowlist, scans for common private-path/credential patterns and checks archive size. Manual content and screenshot review remain required. The screenshot contains only the fictional demonstration.

CI is configured for Node.js 22 and 24 on Windows and Linux. Those CI runs have not happened until the repository is pushed and the workflow executes. Real host activation and clean disable/uninstall remain release gates before declaring this initial version production-ready.
