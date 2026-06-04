import ast
import os
import sys

# Common built-in functions to ignore
BUILTINS = set(dir(__builtins__))

# Markers that often indicate AI hallucinations or placeholders
HALLUCINATION_MARKERS = [
    "todo", "placeholder", "implement_me", "magic_", "temp_fix", 
    "ai_generated", "hallucination", "dummy_function"
]

class HallucinationDetector(ast.NodeVisitor):
    def __init__(self, filename):
        self.filename = filename
        self.defined_names = set()
        self.imported_names = set()
        self.issues = []

    def visit_Import(self, node):
        for alias in node.names:
            self.imported_names.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        for alias in node.names:
            self.imported_names.add(alias.asname or alias.name)
        self.generic_visit(node)

    def visit_FunctionDef(self, node):
        self.defined_names.add(node.name)
        # Check for empty functions (hallucination pattern)
        if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            self.issues.append((node.lineno, f"Empty function definition: {node.name}"))
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        self.defined_names.add(node.name)
        self.generic_visit(node)

    def visit_Assign(self, node):
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.defined_names.add(target.id)
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name not in self.defined_names and func_name not in self.imported_names and func_name not in BUILTINS:
                self.issues.append((node.lineno, f"Call to potentially undefined/hallucinated function: {func_name}"))
        elif isinstance(node.func, ast.Attribute):
            # For attribute calls (e.g., obj.method()), we can't easily know if it's hallucinated without type info
            # but we can check the method name for markers
            method_name = node.func.attr
            if any(marker in method_name.lower() for marker in HALLUCINATION_MARKERS):
                self.issues.append((node.lineno, f"Call to method with hallucination marker: {method_name}"))
        self.generic_visit(node)

def analyze_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read())
        except SyntaxError as e:
            return [(e.lineno, f"Syntax Error: {e.msg}")]

    detector = HallucinationDetector(filepath)
    detector.visit(tree)
    return detector.issues

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    python_files = []
    exclude_dirs = {'.git', 'venv', 'node_modules', '__pycache__'}
    for root, dirs, files in os.walk(root_dir):
        # Excluir directorios del recorrido de forma in-place
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(".py"):
                python_files.append(os.path.join(root, file))

    print(f"--- AST Hallucination Detector ---")
    print(f"Scanning {len(python_files)} Python files...\n")

    total_issues = 0
    for py_file in python_files:
        issues = analyze_file(py_file)
        if issues:
            print(f"File: {py_file}")
            for line, msg in issues:
                print(f"  Line {line}: {msg}")
            total_issues += len(issues)
            print()

    print(f"--- Scan Complete ---")
    print(f"Total potential hallucinations found: {total_issues}")

if __name__ == "__main__":
    main()