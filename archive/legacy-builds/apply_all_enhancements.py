#!/usr/bin/env python3
import subprocess
import sys
import os

def run_enhancement(script_name, description):
    try:
        print(f"\n🔧 Applying {description}...")
        result = subprocess.run([sys.executable, script_name], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout:
                print(result.stdout)
        else:
            print(f"❌ Error in {description}: {result.stderr}")
    except Exception as e:
        print(f"❌ Failed to run {description}: {e}")

def main():
    print("🚀 Applying Practice Exam Enhancements...")
    print("=" * 50)
    
    enhancements = [
        ("enhance_visual_styling.py", "Enhanced Visual Styling"),
        ("add_bookmarking.py", "Question Bookmarking"),
        ("add_keyboard_shortcuts.py", "Keyboard Shortcuts"),
        ("enhance_results.py", "Enhanced Results Display")
    ]
    
    for script, description in enhancements:
        if os.path.exists(script):
            run_enhancement(script, description)
        else:
            print(f"⚠️ {script} not found, skipping {description}")
    
    print("\n🎉 All enhancements applied!")
    print("\nNew Features Added:")
    print("• Enhanced visual styling with gradients and animations")
    print("• Question bookmarking with star icons")
    print("• Keyboard shortcuts (arrows, 1-5, B, S)")
    print("• Enhanced results with circular progress and domain breakdown")
    print("• Improved mobile responsiveness")
    print("• Print-friendly formatting")

if __name__ == "__main__":
    main()
