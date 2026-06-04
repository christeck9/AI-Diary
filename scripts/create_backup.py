import os
import zipfile
import json

def create_backup():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    version = "unknown"
    try:
        with open(os.path.join(root_dir, "package.json"), "r", encoding="utf-8") as f:
            version = json.load(f).get("version", "unknown")
    except Exception:
        pass
        
    output_dir = os.path.join(root_dir, "BACKUPS", f"v{version}")
    output_zip = os.path.join(output_dir, f"v{version}_backup.zip")
    
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Target Zip: {output_zip}")
    print("Starting backup generation...")
    
    # Exclusion patterns (normalized paths)
    exclude_dirs = {
        '.git',
        'node_modules',
        '.expo',
        '.idea',
        'backups', # lowercase because we'll lower-case check
        '.gradle',
        '.kotlin',
        'build',
    }
    
    exclude_files = {
        'build_log.txt',
        'build_log_2.txt',
        'build_output.txt',
        'build_result.txt',
        'create_backup.py', # don't zip the backup script itself
    }

    count = 0
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            # Resolve relative parts to root_dir
            rel_path = os.path.relpath(root, root_dir)
            rel_parts = rel_path.split(os.sep) if rel_path != '.' else []
            
            # Check if any path segment matches exclude dirs
            should_exclude = False
            for part in rel_parts:
                if part.lower() in exclude_dirs:
                    should_exclude = True
                    break
            
            if should_exclude:
                continue
                
            # Filter directories in-place to prevent os.walk from entering them
            dirs[:] = [d for d in dirs if d.lower() not in exclude_dirs]
            
            for file in files:
                if file.lower() in exclude_files or file.endswith('.zip'):
                    continue
                    
                full_path = os.path.join(root, file)
                archive_name = os.path.relpath(full_path, root_dir)
                
                zipf.write(full_path, archive_name)
                count += 1
                if count % 100 == 0:
                    print(f"Added {count} files...")
                    
    print(f"Successfully created backup at {output_zip} with {count} files.")

if __name__ == "__main__":
    create_backup()
