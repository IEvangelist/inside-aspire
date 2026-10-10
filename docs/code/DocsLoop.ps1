# Run the actual public CLI rehearsal; do not substitute a transcript.
pwsh -NoProfile -File .\scripts\Show-DocsLoop.ps1

# Read the small, pinned C# parser excerpt used onstage.
Get-Content .\docs\code\LlmsTxtParser.cs
