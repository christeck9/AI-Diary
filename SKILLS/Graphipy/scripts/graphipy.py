import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

import networkx as nx
from networkx.algorithms.community import louvain_communities

from parsers import CodebaseParser
from validators import validate_delta, is_entry_point

def is_internal_node(node_id, parser_nodes):
    if node_id in parser_nodes:
        return True
    for n in parser_nodes:
        if n.startswith(node_id) or node_id.startswith(n):
            return True
    return False

def build_graph(parser):
    G = nx.DiGraph()
    for node_id, metadata in parser.nodes.items():
        G.add_node(node_id, **metadata)
        
    for source, target, edge_type in parser.edges:
        actual_target = None
        if target in parser.nodes:
            actual_target = target
        else:
            for ext in [".ts", ".tsx", ".js", "/index.tsx", "/index.ts"]:
                if target + ext in parser.nodes:
                    actual_target = target + ext
                    break
        
        if actual_target:
            G.add_edge(source, actual_target, type=edge_type)
        elif edge_type == "jni_bridge":
            G.add_node(target, type="native_bridge", size_bytes=0)
            G.add_edge(source, target, type=edge_type)
            
    return G

def run_louvain(G):
    G_undir = G.to_undirected()
    if len(G_undir.nodes) == 0:
        return []
    return louvain_communities(G_undir, resolution=1.0, seed=42)

def generate_markdown(G, communities, output_path):
    orphans = [n for n in G.nodes if G.degree(n) == 0 and not is_entry_point(n)]
    
    lines = []
    lines.append("# 🧠 AI-Diary — Codebase RAG-DB")
    lines.append(f"> Generated: {datetime.now().isoformat()} | Total Files: {len(G.nodes)} | Communities: {len(communities)}\n")
    
    # ADDING HISTORICAL/DOCUMENTATION REFERENCE AS REQUESTED BY USER
    lines.append("## 📜 Historical Context & Instructions")
    lines.append("> For historical design decisions, latest major changes, or developer context, ALWAYS refer to:")
    lines.append("> `DOCS/Chris' Instructions.md` or git history. This markdown contains the most recent application states and intentions.\n")
    
    for i, comm in enumerate(communities):
        lines.append(f"## Community {i}")
        nodes_info = []
        for n in comm:
            node_data = G.nodes[n]
            node_type = node_data.get("type", "file")
            size = node_data.get("size_bytes", 0) // 1024
            nodes_info.append(f"- `{n}` ({node_type}, {size}KB)")
            
        lines.append("### Files")
        lines.extend(sorted(nodes_info))
        
        lines.append("\n### Internal Dependencies")
        comm_edges = []
        for u, v in G.edges:
            if u in comm and v in comm:
                comm_edges.append(f"- `{u}` → `{v}`")
        if comm_edges:
            lines.extend(sorted(comm_edges))
        else:
            lines.append("- None")
            
        lines.append("\n---\n")

    if orphans:
        lines.append("## ⚠️ Integrity Alerts (Orphaned / Unconnected Nodes)")
        for o in sorted(orphans):
            lines.append(f"- 🔴 `{o}` — 0 connections")
            
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
        
def main():
    parser = argparse.ArgumentParser(description="Graphipy Codebase Analyzer")
    parser.add_argument("--root", type=str, default=".", help="Root directory of the codebase")
    args = parser.parse_args()
    
    root_path = Path(args.root).resolve()
    print(f"[*] Starting Graphipy Analysis on {root_path}")
    
    cb_parser = CodebaseParser(root_path)
    cb_parser.walk_codebase()
    print(f"[*] Parsed {len(cb_parser.nodes)} files.")
    
    G = build_graph(cb_parser)
    print(f"[*] Built Graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges.")
    
    communities = run_louvain(G)
    print(f"[*] Detected {len(communities)} Louvain communities.")
    
    # CHANGED TO 'SKILLS' DIRECTORY
    resources_dir = root_path / "SKILLS" / "Graphipy" / "resources"
    resources_dir.mkdir(parents=True, exist_ok=True)
    
    md_path = resources_dir / "codebase_rag_db.md"
    generate_markdown(G, communities, md_path)
    print(f"[+] Successfully generated RAG-DB at {md_path}")
    
    print("\n--- Git Delta Validation ---")
    validate_delta(root_path, G)
    print("----------------------------\n")

if __name__ == "__main__":
    main()
