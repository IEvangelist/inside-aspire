# Shipped Aspire skills

This repository contains the seven complete default application skills installed by the public Aspire CLI, not a custom `AGENTS.md` summary. All 40 `SKILL.md` and companion reference files are unchanged.

| Provenance | Value |
| --- | --- |
| Public CLI release | [13.6.1](https://github.com/microsoft/aspire/releases/tag/v13.6.1) |
| CLI release source | [`3751e615ad660621f2a7aa4c390ef48e08a0eed8`](https://github.com/microsoft/aspire/tree/3751e615ad660621f2a7aa4c390ef48e08a0eed8) |
| Official skills source | [`a83ca78b9d35b8238f9c4fdba72cb779defe2a90`](https://github.com/microsoft/aspire-skills/tree/a83ca78b9d35b8238f9c4fdba72cb779defe2a90) |
| Actual CLI generation | [Successful fresh-runner run 38022410496](https://github.com/IEvangelist/inside-aspire/actions/runs/38022410496) |
| Artifact | `official-aspire-skills-13.6.1` |
| Artifact digest | `sha256:601e0cda01f075c809ccb9c5cf8de0175f913b84b5120f656d3a7825b053ba58` |
| Per-file SHA256 | [skills-manifest.sha256](skills-manifest.sha256) |
| License | [Original MIT license](../licenses/aspire-skills-MIT.txt) |

The generated artifact was checked against its per-file hashes before import. An independent comparison of every file with the pinned official source also matched all seven trees and all 40 files by Git blob identity.

## Generation and side effects

The [manual preparation workflow](../.github/workflows/prepare-skills.yml) runs this genuine CLI operation:

```powershell
aspire agent init --workspace-root . --skill-locations github --mcp=false --non-interactive
```

The released command installs usage hooks in detected agent profiles even when MCP is disabled. It has no skip-hook flag. Changing `HOME`, `USERPROFILE`, or `ASPIRE_HOME` does not prove isolation for all clients on Windows; `COPILOT_HOME` only redirects Copilot.

Therefore generation ran on a fresh, ephemeral GitHub Actions runner with its own real OS profile. Only the project-local `.github/skills` trees and their manifest were downloaded. The presenter's global profile, hooks, MCP configuration, and global CLI were not modified. Do not run agent init locally just to rehearse this prepared repository.

## Discovery and actual use

Copilot discovers `.github/skills` as project skills. A scoped rehearsal executed `copilot skill list` with an isolated `COPILOT_HOME`, then ran a read-only prompt explicitly requesting the named `aspire-orchestration` skill. The output showed:

```text
skill(aspire-orchestration)
.github/skills/aspire-orchestration/SKILL.md
```

The loaded skill selected the exact-target, isolated, noninteractive Aspire start/wait/stop rules. Shell, writes, web tools, and built-in MCP were disabled for that discovery-only rehearsal. Its raw output remains under gitignored `.artifacts/skill-rehearsal`, not in the public source.

For the live app, invoke `aspire-orchestration` for lifecycle and `aspire-monitoring` for evidence. The CLI still performs the real operation. A skill is guidance, not a docs corpus, vector index, MCP server, or model update.

## The default bundle

| Skill | Job |
| --- | --- |
| `aspire` | Route Aspire work to the appropriate workflow |
| `aspire-init` | Bootstrap when no AppHost exists |
| `aspireify` | Wire resources and service relationships |
| `aspire-project-v2-migration` | Assess and approve a specific Project v2 migration |
| `aspire-orchestration` | Start, wait, inspect resources, and stop safely |
| `aspire-monitoring` | Inspect logs, traces, metrics, and runtime state |
| `aspire-deployment` | Publish/deploy Aspire applications to a target |

Optional MCP setup, browser-log experiments, extra inspection skills, and production dispatch are not part of this baseline. The docs repo's `doc-writer` skill used by `pr-docs-check` is a distinct skill with distinct provenance.

Verify the committed tree:

```powershell
pwsh ./scripts/Verify-Skills.ps1
```
