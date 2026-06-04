import os

filepath = r"c:\AI-Diary\app\(tabs)\index.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

import_inserted = False

for i, line in enumerate(lines):
    if not import_inserted and line.startswith('import { micService } from \'../../lib/UnifiedMicService\';'):
        new_lines.append(line)
        new_lines.append("import { CONSCIOUSNESS_CONFIG, WAIT_PHRASES_ES, WAIT_PHRASES_EN } from '../../constants/NeuralConstants';\n")
        new_lines.append("import { Message, MessageItem } from '../../components/ui/MessageItem';\n")
        new_lines.append("import { CognitiveNode } from '../../components/ui/CognitiveNode';\n")
        import_inserted = True
        continue
    
    if line.startswith('interface Message {'):
        skip = True
        
    if line.startswith('export default function NeuralLinkScreen() {'):
        skip = False

    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Refactored index.tsx")
