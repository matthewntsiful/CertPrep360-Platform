#!/usr/bin/env python3

import os
import glob
import re

def remove_certification_hub_text():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Pattern to match various forms of the certification hub text
    patterns = [
        r"Page \d+ I Visit Global IT Certification Hub: https://t\.me/\+tRcmR89yGCtkZmM1\.? \d+ Global IT Certification Hub",
        r"Page \d+ I Visit Global IT Certification Hub: https://t\.me/\+tRcmR89yGCtkZmM1",
        r"\d+ Global IT Certification Hub",
        r"Visit Global IT Certification Hub: https://t\.me/\+tRcmR89yGCtkZmM1",
        r"Global IT Certification Hub"
    ]
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Remove all patterns
            for pattern in patterns:
                content = re.sub(pattern, '', content, flags=re.IGNORECASE)
            
            # Clean up any double spaces or extra whitespace left behind
            content = re.sub(r'\s+', ' ', content)
            content = re.sub(r'\s*\.\s*', '. ', content)
            
            if content != original_content:
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Removed certification hub text from {os.path.basename(exam_file)}")
            else:
                print(f"- No certification hub text found in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("✅ All Global IT Certification Hub references have been removed")

if __name__ == "__main__":
    remove_certification_hub_text()
