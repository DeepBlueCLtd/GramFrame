# Archive

Development-history artefacts kept for reference. Nothing here is part of the
shipped component, and nothing in `src/`, `tests/` or the build references it.

Moved out of the repository root by spec 165 (GF-36), where they sat alongside
project files and read as current:

| Path | What it is |
|------|-----------|
| `prompts/` | Agent prompt library from the APM-style workflow used during the initial build |
| `zoom-demonstrator/` | Standalone zoom prototype; its module names shadow real `src/` ones, which is why it does not live near the source |
| `Memory/`, `Memory_Bank.md` | Working journal from the same workflow |
| `Implementation_Plan.md` | The original build plan, long since completed |

For the current picture of the system see [CLAUDE.md](../../CLAUDE.md),
[docs/Tech-Architecture.md](../Tech-Architecture.md) and the specs under
`specs/`.
