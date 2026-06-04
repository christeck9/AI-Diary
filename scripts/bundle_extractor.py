import re

keywords = ["processMessage", "Llama", "Ollama", "Speech", "Audio", "expo-av"]
bundle_path = "temp_apk/assets/index.android.bundle"

def extract_logic():
    print(f"Analyzing bundle: {bundle_path}")
    with open(bundle_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    for kw in keywords:
        print(f"\n--- SEARCHING FOR: {kw} ---")
        # Find matches with some context
        matches = re.finditer(kw, content)
        for i, match in enumerate(matches):
            start = max(0, match.start() - 500)
            end = min(len(content), match.end() + 1500)
            snippet = content[start:end]
            print(f"MATCH {i+1}:\n{snippet}\n{'-'*50}")
            if i > 5: break # Limit output

if __name__ == "__main__":
    extract_logic()
