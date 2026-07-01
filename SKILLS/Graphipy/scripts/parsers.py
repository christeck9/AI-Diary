import os
import re
from pathlib import Path

# Common ignored directories
IGNORED_DIRS = {"node_modules", "dist", ".git", ".expo", "venv", ".idea", ".vscode", "assets", "website", "scratch", "build", ".gradle", ".cxx", "BACKUPS"}

# Regex patterns
TS_IMPORT_PATTERN = re.compile(r"(?:import\s+(?:[\w\s{},*]+from\s*)?|require\s*\(\s*)['\"]([^'\"]+)['\"]")
NATIVE_MODULE_PATTERN = re.compile(r"NativeModules\.(\w+)")
CPP_INCLUDE_PATTERN = re.compile(r"#include\s*['\"]([^'\"]+)['\"]")
CPP_JNI_PATTERN = re.compile(r"extern\s+\"C\"\s+JNIEXPORT")
JAVA_IMPORT_PATTERN = re.compile(r"import\s+([a-zA-Z0-9_.]+);")
JAVA_PACKAGE_PATTERN = re.compile(r"package\s+([a-zA-Z0-9_.]+);")

class CodebaseParser:
    def __init__(self, root_dir):
        self.root_dir = Path(root_dir).resolve()
        self.nodes = {}  # filepath relative to root -> metadata
        self.edges = []  # list of (source, target, type)
        self.ignored = self._load_ignored()

    def _load_ignored(self):
        # Default ignored set
        ignored = {"node_modules", "dist", ".git", ".expo", "venv", ".idea", ".vscode", "assets", "website", "scratch", "build", ".gradle", ".cxx", "BACKUPS"}
        easignore_path = self.root_dir / ".easignore"
        if easignore_path.exists():
            try:
                with open(easignore_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        clean = line.rstrip('/').replace('**/', '')
                        if clean.startswith('!'):
                            continue
                        ignored.add(clean)
            except Exception as e:
                print(f"[!] Warning: Failed to parse .easignore: {e}")
        return ignored

    def is_target_file(self, path):
        ext = path.suffix.lower()
        return ext in {".ts", ".tsx", ".js", ".jsx", ".cpp", ".h", ".java", ".kt"}

    def walk_codebase(self):
        for root, dirs, files in os.walk(self.root_dir):
            dirs[:] = [d for d in dirs if d not in self.ignored]
            for file in files:
                p = Path(root) / file
                if file in self.ignored or f"*{p.suffix.lower()}" in self.ignored:
                    continue
                if self.is_target_file(p):
                    self.parse_file(p)

    def resolve_ts_import(self, source_path, import_str):
        if import_str.startswith("@/"):
            target_path = (self.root_dir / import_str[2:]).resolve()
        elif import_str.startswith("."):
            base_dir = source_path.parent
            target_path = (base_dir / import_str).resolve()
        else:
            return import_str
        
        try:
            rel_target = target_path.relative_to(self.root_dir).as_posix()
            return rel_target
        except ValueError:
            return import_str

    def parse_file(self, path):
        rel_path = path.relative_to(self.root_dir).as_posix()
        ext = path.suffix.lower()
        size = path.stat().st_size
        
        # Merge Metro platform variants into a single logical node
        rel_path = re.sub(r'\.(web|ios|android)\.(ts|tsx|js|jsx)$', r'.\2', rel_path)
        
        if rel_path not in self.nodes:
            self.nodes[rel_path] = {
                "id": rel_path,
                "type": self._guess_type(rel_path, ext),
                "size_bytes": 0,
                "imports": [],
                "bridges": []
            }
        
        self.nodes[rel_path]["size_bytes"] += size
        node_metadata = self.nodes[rel_path]

        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            return

        if ext in {".ts", ".tsx", ".js", ".jsx"}:
            imports = TS_IMPORT_PATTERN.findall(content)
            for imp in imports:
                resolved = self.resolve_ts_import(path, imp)
                node_metadata["imports"].append(resolved)
                self.edges.append((rel_path, resolved, "import"))
            
            native_modules = NATIVE_MODULE_PATTERN.findall(content)
            for nm in native_modules:
                bridge_id = f"NATIVE_MODULE_{nm}"
                node_metadata["bridges"].append(bridge_id)
                self.edges.append((rel_path, bridge_id, "jni_bridge"))

        elif ext in {".cpp", ".h"}:
            includes = CPP_INCLUDE_PATTERN.findall(content)
            for inc in includes:
                node_metadata["imports"].append(inc)
                self.edges.append((rel_path, inc, "include"))
            
            if CPP_JNI_PATTERN.search(content):
                node_metadata["bridges"].append("JNI_BRIDGE_EXPORT")
                self.edges.append((rel_path, "JNI_BRIDGE_EXPORT", "jni_export"))
        
        elif ext in {".java", ".kt"}:
            imports = JAVA_IMPORT_PATTERN.findall(content)
            for imp in imports:
                node_metadata["imports"].append(imp)
                self.edges.append((rel_path, imp, "java_import"))

    def _guess_type(self, rel_path, ext):
        if "contexts/" in rel_path: return "context"
        if "hooks/" in rel_path: return "hook"
        if "components/" in rel_path: return "component"
        if "lib/" in rel_path or "service" in rel_path.lower(): return "service"
        if "db/" in rel_path or "schema" in rel_path.lower(): return "schema"
        if ext in {".cpp", ".h", ".java", ".kt"}: return "native"
        return "file"

if __name__ == "__main__":
    parser = CodebaseParser(os.getcwd())
    parser.walk_codebase()
    print(f"Parsed {len(parser.nodes)} nodes and {len(parser.edges)} edges.")
