#!/usr/bin/env python3
import os
import re
from pathlib import Path

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Fix mismatched quotes: from "...path' -> from '...path'
        content = re.sub(r'from\s+"([^"]+)\'', r"from '\1'", content)
        
        # Fix mismatched quotes: from '...path" -> from '...path'
        content = re.sub(r"from\s+'([^']+)\"", r"from '\1'", content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except:
        pass
    return False

base = Path('/Users/denielson/Desktop/Teste/modules')
fixed = 0
for f in base.rglob('*.ts*'):
    if fix_file(f):
        fixed += 1
        print(f"✅ {f.relative_to(base.parent)}")

print(f"\n📊 Total: {fixed} arquivos corrigidos")
