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
    
    # ADDING RECOMMENDED ARCHITECTURAL IMPROVEMENTS
    lines.append("## 🚀 Recommended Architectural Improvements")
    lines.append("> **1. Split High-Frequency States in LlmContext:** Separate streaming/download progress (high-frequency) from active model/configuration states (stable) to prevent global app re-renders during active downloads/generation.")
    lines.append("> **2. SQLite Batch Transaction:** Wrap multiple inserts/updates in `KnowledgeGraphService.ts` within a transaction to boost writing performance and prevent file-locking delay on mobile devices.\n")

    
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

def name_community(comm_nodes, G, comm_idx):
    from collections import Counter
    import os
    
    tags = []
    for node in comm_nodes:
        n_lower = node.lower()
        if "component" in n_lower or "ui" in n_lower or ".tsx" in n_lower: tags.append("UI")
        if "hook" in n_lower: tags.append("Hooks")
        if "service" in n_lower or "lib" in n_lower: tags.append("Services")
        if "db" in n_lower or "schema" in n_lower or "sql" in n_lower: tags.append("Database")
        if "android" in n_lower or "cpp" in n_lower or "jni" in n_lower: tags.append("Native Bridge")
        if "tab" in n_lower or "layout" in n_lower or "navigation" in n_lower: tags.append("Navigation")
        if "config" in n_lower or "app.json" in n_lower: tags.append("Config")
        
    dominant_tag = Counter(tags).most_common(1)[0][0] if tags else "Core"
        
    dirs = [os.path.dirname(n).replace('\\', '/') for n in comm_nodes if os.path.dirname(n)]
    if dirs:
        common_dir = Counter(dirs).most_common(1)[0][0]
        dir_name = common_dir.split('/')[-1].capitalize()
        if dir_name:
            return f"[{dominant_tag}] {dir_name}"
            
    return f"[{dominant_tag}] Cluster {comm_idx}"

def generate_html_visualizer(G, communities, output_path):
    import json
    import math

    nodes = []
    communities_data = []
    node_to_comm = {}
    
    for comm_idx, comm in enumerate(communities):
        comm_name = name_community(comm, G, comm_idx)
        communities_data.append({"id": comm_idx, "name": comm_name})
        for node in comm:
            node_to_comm[node] = comm_idx

    def find_closest_community(node_id, comms):
        import os
        node_dir = os.path.dirname(node_id)
        if not node_dir:
            return -1
        
        best_comm = -1
        best_count = 0
        node_dir_norm = node_dir.replace('\\', '/').lower()
        
        # 1. Try exact directory match
        for comm_idx, comm in enumerate(comms):
            count = 0
            for other_node in comm:
                if other_node == node_id:
                    continue
                other_dir = os.path.dirname(other_node).replace('\\', '/').lower()
                if other_dir == node_dir_norm:
                    count += 1
            if count > best_count:
                best_count = count
                best_comm = comm_idx
                
        # 2. Try parent/sub directory match
        if best_comm == -1:
            for comm_idx, comm in enumerate(comms):
                count = 0
                for other_node in comm:
                    if other_node == node_id:
                        continue
                    other_dir = os.path.dirname(other_node).replace('\\', '/').lower()
                    if other_dir.startswith(node_dir_norm) or node_dir_norm.startswith(other_dir):
                        count += 1
                if count > best_count:
                    best_count = count
                    best_comm = comm_idx
                    
        return best_comm

    for node_id in G.nodes:
        node_data = G.nodes[node_id]
        size_bytes = node_data.get("size_bytes", 0)
        val = math.log2(size_bytes + 1) + 2 if size_bytes > 0 else 3
        
        is_orphan = G.degree(node_id) == 0
        closest_comm = find_closest_community(node_id, communities) if is_orphan else -1
        
        nodes.append({
            "id": node_id,
            "label": os.path.basename(node_id),
            "type": node_data.get("type", "file"),
            "size_bytes": size_bytes,
            "val": min(val, 25),
            "community": node_to_comm.get(node_id, -1),
            "isOrphan": is_orphan,
            "closestCommunity": closest_comm,
            "degree": G.degree(node_id)
        })

    links = []
    for u, v in G.edges:
        edge_data = G.edges[u, v]
        links.append({
            "source": u,
            "target": v,
            "type": edge_data.get("type", "import")
        })

    data = {
        "nodes": nodes,
        "links": links,
        "communities": communities_data
    }

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI-Diary Codebase Graph Explorer</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://unpkg.com/force-graph"></script>
    <style>
        body {{
            font-family: 'Outfit', sans-serif;
            background-color: #020206;
            color: #f3f4f6;
            margin: 0;
            overflow: hidden;
        }}
        .glass-panel {{
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }}
        ::-webkit-scrollbar {{
            width: 6px;
        }}
        ::-webkit-scrollbar-track {{
            background: rgba(0,0,0,0.1);
        }}
        ::-webkit-scrollbar-thumb {{
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
        }}
        ::-webkit-scrollbar-thumb:hover {{
            background: rgba(255, 255, 255, 0.3);
        }}
    </style>
</head>
<body>
    <div id="graph" class="w-screen h-screen"></div>

    <div class="absolute top-6 left-6 bottom-6 w-96 z-10 flex flex-col gap-6 pointer-events-none">
        
        <div class="p-5 rounded-2xl glass-panel pointer-events-auto shadow-2xl flex-shrink-0">
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                🧠 AI-Diary
            </h1>
            <p class="text-xs text-gray-400 mt-1 font-semibold tracking-wider">CODEBASE GRAPH EXPLORER</p>
            <div class="mt-4">
                <label class="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Perspective View</label>
                <select id="perspectiveSelector" onchange="changePerspective(this.value)" class="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none cursor-pointer focus:border-indigo-500/50">
                    <option value="ai" class="bg-[#020206] text-gray-200">🤖 AI View (Louvain Modules)</option>
                    <option value="semantic" class="bg-[#020206] text-gray-200">🏗️ Architectural Layers</option>
                    <option value="folder" class="bg-[#020206] text-gray-200">📂 Folder Hierarchy (DDD)</option>
                    <option value="cohesion" class="bg-[#020206] text-gray-200">🔗 Integrated Systems (Degree)</option>
                    <option value="orphans" class="bg-[#020206] text-gray-200">💤 Dormant / Reusable Code</option>
                </select>
            </div>
            <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span class="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    📁 {len(nodes)} Nodos
                </span>
                <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    🔗 {len(links)} Aristas
                </span>
            </div>
        </div>

        <div id="detailPanel" class="flex-1 rounded-3xl glass-panel p-6 shadow-2xl overflow-y-auto pointer-events-auto flex flex-col">
            <h2 class="text-lg font-bold text-gray-100 border-b border-white/5 pb-3 flex-shrink-0">📁 Node Inspector</h2>
            <div id="detailContent" class="flex-1 flex flex-col gap-4 text-left text-gray-300">
                <div class="text-center py-4 flex-shrink-0">
                    <span class="text-3xl">💡</span>
                    <p class="text-xs text-gray-400 mt-1">Select a node to inspect dependencies</p>
                </div>
                <div class="border-t border-white/5 pt-4 flex-1 flex flex-col gap-3">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400">🚀 Architectural Optimizations</h3>
                    <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-xs">
                        <strong class="text-gray-100 block mb-1">1. Split High-Frequency States</strong>
                        <p class="text-gray-400 leading-relaxed">Divide <code>LlmContext</code> state to separate high-frequency streaming (tokens, progress) from stable configurations to prevent app-wide re-renders.</p>
                    </div>
                    <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-xs">
                        <strong class="text-gray-100 block mb-1">2. SQLite Batch Transactions</strong>
                        <p class="text-gray-400 leading-relaxed">Wrap multiple insert/update commands inside <code>KnowledgeGraphService.ts</code> in explicit transactions to accelerate mobile disk writes.</p>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <div class="absolute top-6 left-1/2 transform -translate-x-1/2 z-10 w-96 glass-panel rounded-full px-5 py-2 shadow-2xl flex items-center gap-3">
        <span class="text-gray-400">🔍</span>
        <input 
            type="text" 
            id="searchInput" 
            placeholder="Search files or components..." 
            class="bg-transparent text-sm w-full outline-none text-white placeholder-gray-500"
            oninput="handleSearch(this.value)"
        />
        <div id="searchSuggestions" class="absolute left-0 right-0 top-full mt-2 glass-panel rounded-2xl max-h-60 overflow-y-auto hidden z-20"></div>
    </div>

    <div class="absolute top-6 right-6 bottom-6 w-96 z-10 flex flex-col gap-6 pointer-events-none">
        
        <div class="flex-1 rounded-3xl glass-panel p-6 shadow-2xl overflow-y-auto pointer-events-auto flex flex-col">
            <h2 class="text-sm font-bold text-gray-100 border-b border-white/5 pb-3 mb-3 flex justify-between items-center flex-shrink-0">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="masterCheckbox" checked onchange="toggleAllCommunities(this.checked)" class="rounded border-white/10 bg-transparent text-indigo-600 focus:ring-0 w-3.5 h-3.5" />
                    <span>🎨 Communities (Louvain)</span>
                </label>
            </h2>
            <div id="communitiesList" class="flex-1 overflow-y-auto flex flex-col gap-2.5 text-xs text-gray-300"></div>
        </div>

    </div>

    <script>
        const graphData = {json.dumps(data)};
        
        graphData.nodes.sort((a, b) => {{
            if (a.isOrphan !== b.isOrphan) {{
                return a.isOrphan ? 1 : -1;
            }}
            return b.degree - a.degree;
        }});
        
        const getCommunityColor = (id) => {{
            if (id === -1) return {{h: 210, s: 10, l: 60}};
            const hue = (id * 360) / Math.max(1, graphData.communities.length);
            return {{h: hue, s: 85, l: 60}};
        }};
        const getCommunityColorString = (id) => {{
            const c = getCommunityColor(id);
            return `hsl(${{c.h}}, ${{c.s}}%, ${{c.l}}%)`;
        }};

        const perspectivesConfig = {{
            ai: {{
                getCategories: () => {{
                    const list = graphData.communities.map(c => ({{
                        id: c.id,
                        name: c.name,
                        colorData: getCommunityColor(c.id),
                        color: getCommunityColorString(c.id)
                    }}));
                    list.push({{
                        id: -1,
                        name: 'Otros (Sin comunidad / Huérfanos)',
                        colorData: getCommunityColor(-1),
                        color: getCommunityColorString(-1)
                    }});
                    return list;
                }},
                getNodeCategoryId: (node) => {{
                    return (node.isOrphan && node.closestCommunity !== -1) ? node.closestCommunity : node.community;
                }}
            }},
            semantic: {{
                getCategories: () => [
                    {{ id: 0, name: '1. Núcleo de Inferencia (C++)', colorData: {{ h: 0, s: 85, l: 60 }}, color: 'hsl(0, 85%, 60%)' }},
                    {{ id: 1, name: '2. Envoltura Nativa (Android)', colorData: {{ h: 217, s: 85, l: 60 }}, color: 'hsl(217, 85%, 60%)' }},
                    {{ id: 2, name: '3. Infraestructura de Datos (SQLite)', colorData: {{ h: 158, s: 85, l: 60 }}, color: 'hsl(158, 85%, 60%)' }},
                    {{ id: 3, name: '4. Búsqueda Externa (APIs)', colorData: {{ h: 38, s: 85, l: 60 }}, color: 'hsl(38, 85%, 60%)' }},
                    {{ id: 4, name: '5. Núcleos Integrativos Multicapa', colorData: {{ h: 271, s: 85, l: 60 }}, color: 'hsl(271, 85%, 60%)' }},
                    {{ id: 5, name: '6. Capa de Orquestación (TS/React Native)', colorData: {{ h: 215, s: 15, l: 60 }}, color: 'hsl(215, 15%, 60%)' }}
                ],
                getNodeCategoryId: (node) => {{
                    const id = node.id.toLowerCase();
                    if (id.endsWith('.cpp') || id.endsWith('.h') || id.endsWith('.hpp') || id.includes('/cpp/') || id.includes('/jni/')) return 0;
                    if ((id.endsWith('.kt') || id.endsWith('.java')) && id.includes('android/')) return 1;
                    if (id.includes('db/') || id.includes('schema') || id.includes('memoryprovider')) return 2;
                    if (id.includes('search') || id.includes('wikipedia') || id.includes('openlibrary')) return 3;
                    if (id.includes('useagentengine') || id.includes('app/(tabs)/index.tsx') || id.includes('llmcontext')) return 4;
                    return 5;
                }}
            }},
            folder: {{
                getCategories: () => [
                    {{ id: 0, name: 'android/', colorData: {{ h: 158, s: 85, l: 60 }}, color: 'hsl(158, 85%, 60%)' }},
                    {{ id: 1, name: 'components/', colorData: {{ h: 217, s: 85, l: 60 }}, color: 'hsl(217, 85%, 60%)' }},
                    {{ id: 2, name: 'hooks/', colorData: {{ h: 38, s: 85, l: 60 }}, color: 'hsl(38, 85%, 60%)' }},
                    {{ id: 3, name: 'lib/', colorData: {{ h: 330, s: 85, l: 60 }}, color: 'hsl(330, 85%, 60%)' }},
                    {{ id: 4, name: 'app/', colorData: {{ h: 271, s: 85, l: 60 }}, color: 'hsl(271, 85%, 60%)' }},
                    {{ id: 5, name: 'contexts/', colorData: {{ h: 188, s: 85, l: 60 }}, color: 'hsl(188, 85%, 60%)' }},
                    {{ id: 6, name: 'db/', colorData: {{ h: 84, s: 85, l: 60 }}, color: 'hsl(84, 85%, 60%)' }},
                    {{ id: 7, name: 'Otros (Raíz / Config)', colorData: {{ h: 215, s: 15, l: 60 }}, color: 'hsl(215, 15%, 60%)' }}
                ],
                getNodeCategoryId: (node) => {{
                    const id = node.id.toLowerCase();
                    if (id.startsWith('android/')) return 0;
                    if (id.startsWith('components/')) return 1;
                    if (id.startsWith('hooks/')) return 2;
                    if (id.startsWith('lib/')) return 3;
                    if (id.startsWith('app/')) return 4;
                    if (id.startsWith('contexts/')) return 5;
                    if (id.startsWith('db/')) return 6;
                    return 7;
                }}
            }},
            cohesion: {{
                getCategories: () => [
                    {{ id: 2, name: 'Núcleos Centrales (Alto Acoplamiento)', colorData: {{ h: 0, s: 85, l: 60 }}, color: 'hsl(0, 85%, 60%)' }},
                    {{ id: 1, name: 'Sistemas Integrados (Cohesión Media)', colorData: {{ h: 43, s: 85, l: 60 }}, color: 'hsl(43, 85%, 60%)' }},
                    {{ id: 0, name: 'Partículas Periféricas (Uso Global)', colorData: {{ h: 217, s: 85, l: 60 }}, color: 'hsl(217, 85%, 60%)' }}
                ],
                getNodeCategoryId: (node) => {{
                    const deg = node.degree;
                    if (deg > 10) return 2;
                    if (deg >= 3) return 1;
                    return 0;
                }}
            }},
            orphans: {{
                getCategories: () => [
                    {{ id: 0, name: 'Partículas Durmientes / Reusables', colorData: {{ h: 343, s: 85, l: 60 }}, color: 'hsl(343, 85%, 60%)' }},
                    {{ id: 1, name: 'Componentes Activos', colorData: {{ h: 215, s: 15, l: 30 }}, color: 'hsl(215, 15%, 30%)' }},
                    {{ id: 2, name: '💤 Componentes Basura / Obsoletos', colorData: {{ h: 0, s: 85, l: 50 }}, color: 'hsl(0, 85%, 50%)' }}
                ],
                getNodeCategoryId: (node) => {{
                    return node.degree === 0 ? 0 : 1;
                }}
            }}
        }};

        let currentPerspective = 'ai';
        let activeFilters = new Set();

        function applyPerspectiveColors() {{
            const config = perspectivesConfig[currentPerspective];
            const categories = config.getCategories();
            const categoriesMap = new Map(categories.map(c => [c.id, c]));

            graphData.nodes.forEach(node => {{
                const catId = config.getNodeCategoryId(node);
                const cat = categoriesMap.get(catId) || {{ colorData: {{ h: 210, s: 10, l: 60 }}, color: 'hsl(210, 10%, 60%)' }};
                node.colorData = cat.colorData;
                node.color = cat.color;
            }});
        }}

        applyPerspectiveColors();

        let selectedNode = null;
        let highlightedNodes = new Set();
        let highlightedLinks = new Set();

        const elem = document.getElementById('graph');
        const Graph = ForceGraph()(elem)
            .graphData(graphData)
            .nodeId('id')
            .nodeVal('val')
            .backgroundColor('#020206')
            .onRenderFramePre((ctx, globalScale) => {{
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                
                const centers = {{}};
                const counts = {{}};
                const config = perspectivesConfig[currentPerspective];
                
                graphData.nodes.forEach(node => {{
                    const catId = config.getNodeCategoryId(node);
                    if (!centers[catId]) {{
                        centers[catId] = {{ x: 0, y: 0 }};
                        counts[catId] = 0;
                    }}
                    centers[catId].x += node.x || 0;
                    centers[catId].y += node.y || 0;
                    counts[catId]++;
                }});
                
                Object.keys(centers).forEach(cId => {{
                    const count = counts[cId];
                    if (count > 2) {{
                        const cx = centers[cId].x / count;
                        const cy = centers[cId].y / count;
                        const cloudRadius = Math.max(160, count * 22);
                        
                        const categories = config.getCategories();
                        const cat = categories.find(c => String(c.id) === String(cId));
                        const colorData = cat ? cat.colorData : {{ h: 210, s: 10, l: 60 }};
                        
                        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudRadius);
                        grad.addColorStop(0, `hsla(${{colorData.h}}, 20%, 90%, 0.22)`);
                        grad.addColorStop(0.4, `hsla(${{colorData.h}}, 15%, 85%, 0.08)`);
                        grad.addColorStop(1, `hsla(${{colorData.h}}, 10%, 85%, 0)`);
                        
                        ctx.beginPath();
                        ctx.arc(cx, cy, cloudRadius, 0, 2 * Math.PI, false);
                        ctx.fillStyle = grad;
                        ctx.fill();
                    }}
                }});
                ctx.restore();
            }})
            .nodeLabel(node => `<strong>${{node.id}}</strong><br/><span class="text-gray-400">${{node.type}} | ${{(node.size_bytes/1024).toFixed(1)}} KB</span>`)
            .nodeCanvasObject((node, ctx, globalScale) => {{
                if (node.x === undefined || node.y === undefined) return;
                
                const isHighlighted = highlightedNodes.size === 0 || highlightedNodes.has(node.id);
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                const baseRadius = Math.max(2.0, (node.val || 3) * 0.65);
                const auraRadius = baseRadius * 4.5;
                
                if (isHighlighted) {{
                    const glowGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, auraRadius);
                    glowGrad.addColorStop(0, `hsla(${{node.colorData.h}}, ${{node.colorData.s}}%, ${{node.colorData.l}}%, 0.25)`);
                    glowGrad.addColorStop(0.4, `hsla(${{node.colorData.h}}, ${{node.colorData.s}}%, ${{node.colorData.l}}%, 0.08)`);
                    glowGrad.addColorStop(1, `hsla(${{node.colorData.h}}, ${{node.colorData.s}}%, ${{node.colorData.l}}%, 0)`);
                    
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, auraRadius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = glowGrad;
                    ctx.fill();
                }}
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, baseRadius, 0, 2 * Math.PI, false);
                
                if (isHighlighted) {{
                    const sphereGrad = ctx.createRadialGradient(node.x - baseRadius * 0.25, node.y - baseRadius * 0.25, 0, node.x, node.y, baseRadius);
                    sphereGrad.addColorStop(0, '#ffffff');
                    sphereGrad.addColorStop(0.2, `hsl(${{node.colorData.h}}, ${{node.colorData.s}}%, 85%)`);
                    sphereGrad.addColorStop(0.7, `hsl(${{node.colorData.h}}, ${{node.colorData.s}}%, 55%)`);
                    sphereGrad.addColorStop(1, `hsl(${{node.colorData.h}}, ${{node.colorData.s}}%, 30%)`);
                    ctx.fillStyle = sphereGrad;
                }} else {{
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
                }}
                
                ctx.fill();
                if (isHighlighted) {{
                    ctx.strokeStyle = `rgba(255, 255, 255, 0.35)`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }}
            }})
            .linkWidth(link => highlightedLinks.has(link) ? 3.5 : 0.3)
            .linkColor(link => highlightedLinks.has(link) ? '#a78bfa' : 'rgba(255, 255, 255, 0.015)')
            .linkDirectionalParticles(link => highlightedLinks.has(link) ? 3 : 0)
            .linkDirectionalParticleWidth(2)
            .linkDirectionalParticleSpeed(0.005)
            .onNodeClick(node => selectNode(node))
            .onBackgroundClick(() => clearHighlight());
            
        function communityOrbitForce() {{
            let nodes = [];
            function force(alpha) {{
                const config = perspectivesConfig[currentPerspective];
                const centers = {{}};
                const counts = {{}};
                
                nodes.forEach(node => {{
                    const catId = config.getNodeCategoryId(node);
                    if (!centers[catId]) {{
                        centers[catId] = {{ x: 0, y: 0 }};
                        counts[catId] = 0;
                    }}
                    centers[catId].x += node.x || 0;
                    centers[catId].y += node.y || 0;
                    counts[catId]++;
                }});
                
                Object.keys(centers).forEach(cId => {{
                    if (counts[cId] > 0) {{
                        centers[cId].x /= counts[cId];
                        centers[cId].y /= counts[cId];
                    }}
                }});
                
                const strength = 0.08 * alpha;
                nodes.forEach(node => {{
                    const catId = config.getNodeCategoryId(node);
                    const center = centers[catId];
                    if (center) {{
                        const dx = node.x - center.x;
                        const dy = node.y - center.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        node.vx -= dx * (100 / dist) * strength;
                        node.vy -= dy * (100 / dist) * strength;
                    }}
                }});
            }}
            force.initialize = _ => {{ nodes = _; }};
            return force;
        }}

        Graph.d3Force('charge', d3.forceManyBody().strength(-55));
        Graph.d3Force('x', d3.forceX(0).strength(0.012));
        Graph.d3Force('y', d3.forceY(0).strength(0.012));
        Graph.d3Force('orbit', communityOrbitForce());

        function updateGraphFilter() {{
            const config = perspectivesConfig[currentPerspective];
            const filteredNodes = graphData.nodes.filter(node => activeFilters.has(config.getNodeCategoryId(node)));
            const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
            const filteredLinks = graphData.links.filter(l => 
                filteredNodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
                filteredNodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
            );
            Graph.graphData({{ nodes: filteredNodes, links: filteredLinks }});
        }}

        const listContainer = document.getElementById('communitiesList');
        const masterCheckbox = document.getElementById('masterCheckbox');

        function rebuildLegend() {{
            listContainer.innerHTML = '';
            const config = perspectivesConfig[currentPerspective];
            const categories = config.getCategories();
            
            if (activeFilters.size === 0) {{
                categories.forEach(c => activeFilters.add(c.id));
            }}
            
            if (masterCheckbox) {{
                const checkedCount = categories.filter(c => activeFilters.has(c.id)).length;
                masterCheckbox.checked = (checkedCount === categories.length);
                masterCheckbox.indeterminate = (checkedCount > 0 && checkedCount < categories.length);
            }}

            categories.forEach(cat => {{
                const count = graphData.nodes.filter(node => config.getNodeCategoryId(node) === cat.id).length;
                
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between';
                div.innerHTML = `
                    <label class="flex items-center gap-2 cursor-pointer max-w-[75%]">
                        <input type="checkbox" ${{activeFilters.has(cat.id) ? 'checked' : ''}} onchange="toggleCategoryFilter('${{cat.id}}', this.checked)" class="rounded border-white/10 bg-transparent text-indigo-600 focus:ring-0 w-3.5 h-3.5" />
                        <span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background-color: ${{cat.color}}"></span>
                        <span class="font-semibold text-gray-300 truncate" title="${{cat.name}}">${{cat.name}}</span>
                    </label>
                    <span class="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                        ${{count}} files
                    </span>
                `;
                listContainer.appendChild(div);
            }});
        }}

        function toggleCategoryFilter(catId, isChecked) {{
            const id = isNaN(catId) ? catId : Number(catId);
            if (isChecked) {{
                activeFilters.add(id);
            }} else {{
                activeFilters.delete(id);
            }}
            
            if (masterCheckbox) {{
                const categories = perspectivesConfig[currentPerspective].getCategories();
                const checkedCount = categories.filter(c => activeFilters.has(c.id)).length;
                masterCheckbox.checked = (checkedCount === categories.length);
                masterCheckbox.indeterminate = (checkedCount > 0 && checkedCount < categories.length);
            }}
            
            updateGraphFilter();
        }}

        function toggleAllCommunities(isChecked) {{
            const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {{
                cb.checked = isChecked;
            }});
            
            const categories = perspectivesConfig[currentPerspective].getCategories();
            if (isChecked) {{
                categories.forEach(c => activeFilters.add(c.id));
            }} else {{
                activeFilters.clear();
            }}
            updateGraphFilter();
        }}

        function changePerspective(perspective) {{
            currentPerspective = perspective;
            activeFilters.clear();
            applyPerspectiveColors();
            rebuildLegend();
            updateGraphFilter();
            Graph.nodeColor(Graph.nodeColor());
        }}

        rebuildLegend();

        function selectNode(node) {{
            selectedNode = node;
            Graph.centerAt(node.x, node.y, 800);
            Graph.zoom(3.5, 800);

            highlightedNodes.clear();
            highlightedLinks.clear();
            highlightedNodes.add(node.id);
            
            const incoming = [];
            const outgoing = [];

            graphData.links.forEach(link => {{
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                
                if (sId === node.id) {{
                    highlightedNodes.add(tId);
                    highlightedLinks.add(link);
                    outgoing.push(tId);
                }}
                if (tId === node.id) {{
                    highlightedNodes.add(sId);
                    highlightedLinks.add(link);
                    incoming.push(sId);
                }}
            }});

            const sortNodes = (idA, idB) => {{
                const a = graphData.nodes.find(n => n.id === idA);
                const b = graphData.nodes.find(n => n.id === idB);
                if (!a || !b) return 0;
                return b.degree - a.degree;
            }};
            incoming.sort(sortNodes);
            outgoing.sort(sortNodes);

            Graph.nodeColor(Graph.nodeColor());

            const detailPanel = document.getElementById('detailContent');
            detailPanel.innerHTML = `
                <div class="w-full text-left flex flex-col gap-4">
                    <div>
                        <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-1">FILE TYPE & COMMUNITY</div>
                        <div class="flex gap-2 items-center">
                            <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 capitalize">${{node.type}}</span>
                            <span class="px-2 py-0.5 rounded text-xs font-semibold text-white flex items-center gap-1.5" style="background-color: ${{node.color}}">
                                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                                Category ${{node.community}}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-1">RELATIVE PATH</div>
                        <div class="text-sm font-semibold text-gray-100 bg-black/20 p-2.5 rounded-xl border border-white/5 break-all">${{node.id}}</div>
                    </div>

                    <div class="flex gap-4">
                        <div class="flex-1">
                            <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-1">FILE SIZE</div>
                            <div class="text-lg font-bold text-gray-100">${{(node.size_bytes/1024).toFixed(1)}} <span class="text-xs text-gray-400">KB</span></div>
                        </div>
                    </div>

                    <div>
                        <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-2">DEPENDENCIES (OUTGOING - ${{outgoing.length}})</div>
                        <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            ${{outgoing.map(o => `<button onclick="jumpToNode('${{o}}')" class="text-left text-xs bg-white/5 hover:bg-indigo-500/10 hover:text-indigo-300 p-2 rounded-lg border border-white/5 truncate">${{o.split('/').pop()}}</button>`).join('') || '<span class="text-xs text-gray-500 italic">No outgoing connections</span>'}}
                        </div>
                    </div>

                    <div>
                        <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-400 mb-2">DEPENDENTS (INCOMING - ${{incoming.length}})</div>
                        <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            ${{incoming.map(i => `<button onclick="jumpToNode('${{i}}')" class="text-left text-xs bg-white/5 hover:bg-purple-500/10 hover:text-purple-300 p-2 rounded-lg border border-white/5 truncate">${{i.split('/').pop()}}</button>`).join('') || '<span class="text-xs text-gray-500 italic">No incoming connections</span>'}}
                        </div>
                    </div>
                </div>
            `;
        }}

        function jumpToNode(nodeId) {{
            const node = graphData.nodes.find(n => n.id === nodeId);
            if (node) selectNode(node);
        }}

        function clearHighlight() {{
            highlightedNodes.clear();
            highlightedLinks.clear();
            selectedNode = null;
            Graph.nodeColor(Graph.nodeColor());
            
            const detailPanel = document.getElementById('detailContent');
            detailPanel.innerHTML = `
                <div class="flex-1 flex flex-col gap-4 text-left text-gray-300">
                    <div class="text-center py-4 flex-shrink-0">
                        <span class="text-3xl">💡</span>
                        <p class="text-xs text-gray-400 mt-1">Select a node to inspect dependencies</p>
                    </div>
                    <div class="border-t border-white/5 pt-4 flex-1 flex flex-col gap-3">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400">🚀 Architectural Optimizations</h3>
                        <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-xs">
                            <strong class="text-gray-100 block mb-1">1. Split High-Frequency States</strong>
                            <p class="text-gray-400 leading-relaxed">Divide <code>LlmContext</code> state to separate high-frequency streaming (tokens, progress) from stable configurations to prevent app-wide re-renders.</p>
                        </div>
                        <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-xs">
                            <strong class="text-gray-100 block mb-1">2. SQLite Batch Transactions</strong>
                            <p class="text-gray-400 leading-relaxed">Wrap multiple insert/update commands inside <code>KnowledgeGraphService.ts</code> in explicit transactions to accelerate mobile disk writes.</p>
                        </div>
                    </div>
                </div>
            `;
        }}

        const searchInput = document.getElementById('searchInput');
        const suggestionsBox = document.getElementById('searchSuggestions');

        function handleSearch(query) {{
            if (!query.trim()) {{
                suggestionsBox.classList.add('hidden');
                return;
            }}
            const matches = graphData.nodes.filter(n => 
                n.id.toLowerCase().includes(query.toLowerCase()) || 
                n.label.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5);

            if (matches.length > 0) {{
                suggestionsBox.innerHTML = matches.map(m => `
                    <div onclick="selectSearch('${{m.id}}')" class="px-4 py-2 hover:bg-white/10 cursor-pointer text-xs flex justify-between items-center border-b border-white/5">
                        <span class="font-semibold text-gray-200 truncate pr-4">${{m.id}}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 capitalize flex-shrink-0">${{m.type}}</span>
                    </div>
                `).join('');
                suggestionsBox.classList.remove('hidden');
            }} else {{
                suggestionsBox.innerHTML = '<div class="px-4 py-3 text-xs text-gray-500 italic">No files found</div>';
                suggestionsBox.classList.remove('hidden');
            }}
        }}

        function selectSearch(nodeId) {{
            searchInput.value = '';
            suggestionsBox.classList.add('hidden');
            jumpToNode(nodeId);
        }}

        document.addEventListener('click', (e) => {{
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {{
                suggestionsBox.classList.add('hidden');
            }}
        }});

    </script>
</body>
</html>
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)

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
    
    resources_dir = root_path / "SKILLS" / "Graphipy" / "resources"
    resources_dir.mkdir(parents=True, exist_ok=True)
    
    md_path = resources_dir / "codebase_rag_db.md"
    generate_markdown(G, communities, md_path)
    print(f"[+] Successfully generated RAG-DB at {md_path}")

    html_path = resources_dir / "codebase_graph.html"
    generate_html_visualizer(G, communities, html_path)
    print(f"[+] Successfully generated Interactive Graph at {html_path}")
    
    print("\n--- Git Delta Validation ---")
    validate_delta(root_path, G)
    print("----------------------------\n")

if __name__ == "__main__":
    main()
