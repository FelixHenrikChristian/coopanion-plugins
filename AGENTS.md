# Shared plugin repository

Each directory under packages/ is an independently installable World API 6 package. Keep package names and versions independent. The repository root is private and must never be published to npm.

Keep deployment data, credentials, personal figure media, conversation exports, absolute machine-specific paths, caches and runtime binaries out of Git and published archives. Use fictional examples and isolated temporary fixtures. Do not change a person's running Coopanion to test repository changes.

Read package-specific AGENTS.md files before editing those packages. Preserve each package's license. Shared documentation must explain that one repository does not make the plugins depend on each other.

Before release run npm run describe, npm run check, npm test and npm run pack:check. Inspect the exact archives and staged diff. Stage explicit paths. Publishing and market synchronization require the person's instructions; a repository move must not silently publish npm versions, archive old repositories, or change existing installations.

The owner has granted standing authorization to publish verified updates to the affected plugins on GitHub Releases and npm, and request official market synchronization. Once the change is confirmed effective and the required checks pass, complete these release steps without asking for separate confirmation. Keep release versions, assets and tags specific to each affected plugin.
