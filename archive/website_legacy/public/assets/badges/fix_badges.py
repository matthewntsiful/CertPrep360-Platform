#!/usr/bin/env python3
"""Remove white backgrounds from badge images while preserving white text."""

from PIL import Image
import os

def remove_white_background_smart(input_path, output_path):
    """Remove white background but preserve white text by checking surrounding pixels."""
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    data = img.getdata()
    
    # Convert to list for easier manipulation
    pixels = list(data)
    
    # First pass: identify edge pixels (likely background)
    edge_threshold = 50  # pixels within this distance from edge
    
    new_data = []
    for i, item in enumerate(pixels):
        x = i % width
        y = i // width
        
        # Check if pixel is very white
        is_very_white = item[0] > 250 and item[1] > 250 and item[2] > 250
        
        # Check if near edge
        near_edge = (x < edge_threshold or x > width - edge_threshold or 
                    y < edge_threshold or y > height - edge_threshold)
        
        # Remove white pixels that are near edges (background)
        # Keep white pixels in the center (text/details)
        if is_very_white and near_edge:
            new_data.append((255, 255, 255, 0))
        # Also remove pure white pixels in center if they're isolated
        elif item[0] == 255 and item[1] == 255 and item[2] == 255:
            # Check if surrounded by other white pixels (background) or colored pixels (text outline)
            is_background = True
            check_radius = 2
            for dy in range(-check_radius, check_radius + 1):
                for dx in range(-check_radius, check_radius + 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        neighbor_idx = ny * width + nx
                        neighbor = pixels[neighbor_idx]
                        # If neighbor is not white, this might be text
                        if neighbor[0] < 240 or neighbor[1] < 240 or neighbor[2] < 240:
                            is_background = False
                            break
                if not is_background:
                    break
            
            if is_background:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"✓ Processed: {os.path.basename(output_path)}")

def main():
    badges_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create backup directory
    backup_dir = os.path.join(badges_dir, 'backup_original')
    os.makedirs(backup_dir, exist_ok=True)
    
    # List of badges to process
    badges = ['aif', 'ans', 'clf', 'coe', 'das', 'dbs', 'dop', 'dva', 'gdp', 'mls', 'pas', 'saa', 'sap', 'scs', 'soa']
    
    print("Restoring and reprocessing badges with smart background removal...\n")
    
    for badge in badges:
        input_file = os.path.join(badges_dir, f"{badge}.png")
        backup_file = os.path.join(backup_dir, f"{badge}_original.png")
        
        if os.path.exists(input_file):
            # Backup original if not already backed up
            if not os.path.exists(backup_file):
                img = Image.open(input_file)
                img.save(backup_file)
                print(f"📦 Backed up: {badge}.png")
            
            # Process with smart removal
            remove_white_background_smart(input_file, input_file)
        else:
            print(f"✗ Not found: {badge}.png")
    
    print("\n✓ Done! Badges processed with preserved text.")

if __name__ == "__main__":
    main()
