import subprocess
import os
from pathlib import Path
import json

def get_changed_files(root_path):
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=root_path,
            capture_output=True,
            text=True,
            check=True
        )
        lines = result.stdout.strip().split('\n')
        files = []
        for line in lines:
            if not line.strip():
                continue
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2:
                files.append(parts[1])
        
        if not files:
            result = subprocess.run(
                ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
                cwd=root_path,
                capture_output=True,
                text=True,
                check=True
            )
            files = result.stdout.strip().split('\n')
            
        return [f for f in files if f.strip()]
    except Exception as e:
        print(f"[!] Warning: Git delta extraction failed: {e}")
        return []

def is_entry_point(filepath):
    fp = filepath.replace("\\", "/").lower()
    if fp.startswith("app/"):
        return True
    if fp in {"index.js", "index.ts"}:
        return True
    if "mainactivity" in fp or "mainapplication" in fp or "visionbridge" in fp or "vision_bridge" in fp:
        return True
    if fp.startswith("scripts/") or fp.startswith("plugins/"):
        return True
    if fp.endswith("config.js") or fp.endswith("config.ts") or fp.endswith("config.json"):
        return True
    if "anima-voice" in fp and (fp.endswith(".cpp") or fp.endswith(".h") or fp.endswith(".kt") or fp.endswith(".ts")):
        return True
    return False

def validate_delta(root_path, current_graph):
    changed_files = get_changed_files(root_path)
    if not changed_files:
        print("[*] No git changes detected for delta validation.")
        return
        
    print(f"[*] Validating {len(changed_files)} changed files...")
    
    alerts = []
    normalized_changes = [f.replace("\\", "/") for f in changed_files]
    
    for f in normalized_changes:
        if f in current_graph.nodes:
            degree = current_graph.degree(f)
            if degree == 0:
                if not is_entry_point(f):
                    alerts.append(f"[ALERT] Changed file `{f}` is COMPLETELY DISCONNECTED (no imports in or out).")
            else:
                in_degree = current_graph.in_degree(f)
                if in_degree == 0 and not is_entry_point(f):
                    alerts.append(f"[WARNING] Changed file `{f}` is UNUSED (no incoming imports).")
        else:
            ext = Path(f).suffix.lower()
            if ext in {".ts", ".tsx", ".js", ".jsx", ".cpp", ".h", ".java", ".kt"}:
                alerts.append(f"[NOTE] Changed source file `{f}` is not part of the dependency graph (might be deleted or not parsed).")
            
    if alerts:
        print("\n".join(alerts))
    else:
        print("[+] Delta validation passed successfully. No integrity issues found.")

if __name__ == "__main__":
    print(get_changed_files("."))
