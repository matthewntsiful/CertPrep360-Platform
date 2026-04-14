#!/usr/bin/env python3

import os
import glob

def add_better_favicon():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Better favicon using data URI for AWS-themed icon
    favicon_html = '''    <!-- AWS SAA-C03 Associate Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF9900;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23232F3E;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='15' fill='url(%23grad)'/%3E%3Ctext x='50' y='35' font-family='Arial,sans-serif' font-size='16' font-weight='bold' text-anchor='middle' fill='white'%3EAWS%3C/text%3E%3Ctext x='50' y='55' font-family='Arial,sans-serif' font-size='12' font-weight='bold' text-anchor='middle' fill='white'%3ESAA%3C/text%3E%3Ctext x='50' y='75' font-family='Arial,sans-serif' font-size='10' text-anchor='middle' fill='white'%3EC03%3C/text%3E%3Ccircle cx='85' cy='15' r='8' fill='%2328a745'/%3E%3Ctext x='85' y='19' font-family='Arial,sans-serif' font-size='8' font-weight='bold' text-anchor='middle' fill='white'%3EA%3C/text%3E%3C/svg%3E">
    <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF9900;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23232F3E;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='15' fill='url(%23grad)'/%3E%3Ctext x='50' y='35' font-family='Arial,sans-serif' font-size='16' font-weight='bold' text-anchor='middle' fill='white'%3EAWS%3C/text%3E%3Ctext x='50' y='55' font-family='Arial,sans-serif' font-size='12' font-weight='bold' text-anchor='middle' fill='white'%3ESAA%3C/text%3E%3Ctext x='50' y='75' font-family='Arial,sans-serif' font-size='10' text-anchor='middle' fill='white'%3EC03%3C/text%3E%3Ccircle cx='85' cy='15' r='8' fill='%2328a745'/%3E%3Ctext x='85' y='19' font-family='Arial,sans-serif' font-size='8' font-weight='bold' text-anchor='middle' fill='white'%3EA%3C/text%3E%3C/svg%3E">'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find the head section and add favicon after title
            if '<title>' in content and 'AWS SAA-C03 Associate Favicon' not in content:
                # Find the title tag and add favicon after it
                title_end = content.find('</title>') + len('</title>')
                
                # Insert favicon HTML after title
                content = content[:title_end] + '\n' + favicon_html + content[title_end:]
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Added better favicon to {os.path.basename(exam_file)}")
            else:
                print(f"- Favicon already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")
    print("\n🎨 Favicon Features:")
    print("   • AWS orange to dark blue gradient background")
    print("   • 'AWS SAA C03' text in white")
    print("   • Green 'A' badge for Associate level")
    print("   • Professional rounded corners")
    print("   • Works on all browsers and devices")

if __name__ == "__main__":
    add_better_favicon()
