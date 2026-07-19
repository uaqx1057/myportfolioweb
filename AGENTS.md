
<!-- graphify-tool:routing:start -->
## Tool routing (token efficiency)
- Codebase questions (architecture, "what calls X", impact analysis): run `graphify query "<question>"` FIRST. Do NOT grep or read files across the repo - the knowledge graph at graphify-out/graph.json already has the answer for ~2k tokens.
- Library/framework documentation (Flutter, Laravel, Django, Node, etc.): use the Context7 MCP server (resolve-library-id + query-docs) instead of guessing APIs from memory.
- File access: after a graphify query identifies the relevant files, read ONLY those specific files. Avoid directory-wide listing/exploration.
- Answer reuse: before querying, check graphify-out/memory/ for a saved answer to the same question. After answering a non-trivial question well, save it with `graphify save-result --question "<question>"`.
- Quiet output: run tests/builds with filtered or quiet flags (e.g. `--compact`, `2>&1 | tail -20`). Never dump full verbose logs into the conversation - quote only the failing lines.
- Checkpoints: after each working state, make a git commit. If a change breaks things, revert to the last commit instead of debugging your own regressions from scratch.
- Self-updating docs: when you discover a non-obvious fact about this codebase (convention, gotcha, build quirk), append it to this file so future sessions never re-discover it.
<!-- graphify-tool:routing:end -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
