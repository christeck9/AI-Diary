import os
from PIL import Image

image_dir = r"c:\AI-Diary\assets\images"

for file in os.listdir(image_dir):
    if file.lower().endswith('.png'):
        filepath = os.path.join(image_dir, file)
        try:
            # Open the image
            img = Image.open(filepath)
            # Save it optimized
            img.save(filepath, optimize=True)
            print(f"Optimized {file}")
        except Exception as e:
            print(f"Error optimizing {file}: {e}")
