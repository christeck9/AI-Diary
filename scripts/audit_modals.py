import os
import re
import sys

# Ensure UTF-8 output on Windows terminal
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

def audit_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If it contains <Modal, we audit it
    if '<Modal' not in content:
        return None

    # Check for exceptions (like VoicePickerModal which doesn't need to be fullscreen)
    filename = os.path.basename(filepath)
    is_excepted = filename in ['VoicePickerModal.tsx']

    issues = []
    
    # Check for transparent prop
    # We match transparent={true} or just transparent prop
    if not (re.search(r'transparent\s*=\s*\{\s*true\s*\}', content) or re.search(r'\btransparent\b', content)):
        issues.append("Missing 'transparent' prop (must be true)")
        
    # Check for statusBarTranslucent prop
    if not (re.search(r'statusBarTranslucent\s*=\s*\{\s*true\s*\}', content) or re.search(r'\bstatusBarTranslucent\b', content)):
        issues.append("Missing 'statusBarTranslucent' prop (must be true)")

    # Check for useEffect or layout ticket logic
    if not (re.search(r'\b\w*Ticket\b', content) or re.search(r'\b\w*ReRender\b', content)):
        issues.append("Missing layout forcing ticket ('*Ticket' or '*ReRender')")

    # Check for Dimensions.get('screen')
    if "Dimensions.get('screen')" not in content and "Dimensions.get(\"screen\")" not in content:
        issues.append("Missing Dimensions.get('screen') for absolute screen boundaries")

    return {
        "file": filepath,
        "is_excepted": is_excepted,
        "issues": issues,
        "passed": len(issues) == 0 or is_excepted
    }

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    search_dirs = [
        os.path.join(root_dir, 'components'),
        os.path.join(root_dir, 'app')
    ]

    print("==================================================")
    print("      AI DIARY - MODAL & OVERLAYER AUDITOR        ")
    print("==================================================")
    
    audited_count = 0
    passed_count = 0
    failed_count = 0
    
    for search_dir in search_dirs:
        if not os.path.exists(search_dir):
            continue
            
        for root, _, files in os.walk(search_dir):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    filepath = os.path.join(root, file)
                    res = audit_file(filepath)
                    if res:
                        audited_count += 1
                        rel_path = os.path.relpath(filepath, root_dir)
                        if res["passed"]:
                            passed_count += 1
                            except_msg = " [EXCEPTED - Center Alert]" if res["is_excepted"] else ""
                            print(f"✅ {rel_path}{except_msg}")
                        else:
                            failed_count += 1
                            print(f"❌ {rel_path}")
                            for issue in res["issues"]:
                                print(f"   - {issue}")
    
    print("\n--------------------------------------------------")
    print(f"Audited: {audited_count} | Passed: {passed_count} | Failed: {failed_count}")
    print("==================================================")
    
    if failed_count > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()
