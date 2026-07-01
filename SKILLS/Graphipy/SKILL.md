---
name: graphipy-codebase-graph
description: Generates a codebase dependency graph, applies Louvain community clustering, and creates a local RAG-DB markdown index.
---

Detección de Comunidades (Algoritmo de Louvain):

Propósito: Agrupar automáticamente archivos de código que están estrechamente relacionados (alto acoplamiento interno).
Matemática: Se basa en la optimización de la modularidad ($Q$), la cual mide la densidad de aristas/enlaces dentro de las comunidades comparada con la densidad esperada en una red aleatoria: $$Q = \frac{1}{2m} \sum_{i,j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$ (Donde $A_{ij}$ representa la matriz de adyacencia de dependencias de importación de los archivos, $k_i$ es el grado del nodo $i$, $m$ es el número total de dependencias/enlaces en la app, y $\delta(c_i, c_j)$ es la delta de Kronecker que vale 1 si pertenecen a la misma comunidad y 0 si no).
Implementación: Se ejecuta a través de la función run_louvain(G) utilizando la biblioteca networkx (louvain_communities).
Escalamiento Logarítmico (Tamaño Visual de los Nodos):

Propósito: Ajustar visualmente el tamaño de los archivos en el visor interactivo de grafos 3D sin que los archivos enormes (como bases de datos o bundles) dominen toda la pantalla.
Matemática (Línea 189): $$\text{val} = \log_2(\text{size_bytes} + 1) + 2$$ Se utiliza una escala logarítmica en base 2 sobre el tamaño físico del archivo en bytes (size_bytes), limitándolo a un valor máximo de 25 (min(val, 25)), para suavizar y normalizar los tamaños visuales de los nodos.

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

## Logros y Arquitectura Actual
Revisa el archivo `ACHIEVEMENTS.md` dentro de este directorio para entender la arquitectura actual de **Native Voice Acceleration**, JSI, Oboe y los bypasses de memoria que hemos logrado.
