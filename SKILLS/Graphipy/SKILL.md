---
name: graphipy-codebase-graph
description: Generates a codebase dependency graph, applies Louvain community clustering, and creates a local RAG-DB markdown index.
---

# Graphipy: AI-Diary Codebase Dependency Graph & RAG-DB

Graphipy is a local AI skill tailored for the AI-Diary project. It parses multi-language source code (TypeScript, Java, C++), builds a directed dependency graph, identifies systemic communities using the Louvain algorithm (NetworkX), and outputs a structural mapping of the codebase.

## Purpose
- **Context Optimization:** Provides AI agents a clear architectural map without requiring them to read hundreds of files.
- **Code Integrity:** Detects orphaned nodes and disconnected functions immediately.
- **Cross-language Bridge Mapping:** Understands how React Native TypeScript code hooks into Native Modules (JNI / C++).
- **Historical Context Linkage:** References main instruction files (like `DOCS/Chris' Instructions.md`) to combine live graph context with historical intentions.

## How to Run

1. Navigate to the project root directory.
2. Ensure you are using the virtual environment or have `networkx` installed in Python.
3. Run the main orchestrator script:

```bash
uv run python SKILLS/Graphipy/scripts/graphipy.py --root c:\AI-Diary
```

## Outputs

The tool generates an artifact in the `resources` directory:
- `SKILLS/Graphipy/resources/codebase_rag_db.md`: A structured markdown file containing all detected communities, internal dependencies, cross-language bridges, historical context references, and integrity alerts.

Whenever you (the AI) need to orient yourself in the codebase architecture, read the `codebase_rag_db.md` file!
