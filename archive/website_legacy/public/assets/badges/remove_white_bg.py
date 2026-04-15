#!/usr/bin/env python3
"""Remove white backgrounds from badge images and make them transparent."""

from PIL import Image
import os

def remove_white_background(input_path, output_path, threshold=240):
    """Remove white background from image and save with transparency."""
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # If pixel is close to white, make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"✓ Processed: {os.path.basename(output_path)}")

def main():
    badges_dir = os.path.dirname(os.path.abspath(__file__))
    
    # List of badges to process (excluding gdp which already has transparency)
    badges = ['aif', 'ans', 'clf', 'coe', 'das', 'dbs', 'dop', 'dva', 'mls', 'pas', 'saa', 'sap', 'scs', 'soa']
    
    print("Removing white backgrounds from badges...\n")
    
    for badge in badges:
        input_file = os.path.join(badges_dir, f"{badge}.png")
        if os.path.exists(input_file):
            # Check if already RGBA
            img = Image.open(input_file)
            if img.mode == 'RGBA':
                print(f"⊘ Skipped: {badge}.png (already has transparency)")
                continue
            
            remove_white_background(input_file, input_file)
        else:
            print(f"✗ Not found: {badge}.png")
    
    print("\n✓ Done! All badges now have transparent backgrounds.")

if __name__ == "__main__":
    main()
