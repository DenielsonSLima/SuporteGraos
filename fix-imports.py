#!/usr/bin/env python3
"""
Script para corrigir imports com caminhos incorretos
Reduz ../../.. para ../.. quando apropriado baseado na profundidade do arquivo
"""

import os
import re
from pathlib import Path

def get_depth(file_path):
    """Calcula a profundidade do arquivo em relação à raiz"""
    # Conta quantas pastas acima de 'modules'
    parts = Path(file_path).parts
    if 'modules' in parts:
        return len(parts) - parts.index('modules') - 1
    return 0

def fix_imports_in_file(file_path):
    """Corrige imports em um arquivo específico"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return False
    
    original_content = content
    depth = get_depth(file_path)
    
    if depth == 0:
        return False
    
    # Pattern: imports que usam ../../../../ ou ../../../ para services/contexts/utils
    # Se arquivo está em modules/A/B, precisa usar ../../ (2 níveis para sair de B e A)
    # Se está em modules/A/B/C, precisa usar ../../../ (3 níveis)
    
    # Para cada nivel extra de profundidade, remove um ../
    if depth == 1:  # modules/Something/file.tsx
        content = re.sub(
            r'from\s+["\'](\.\./){4}(services|contexts|utils)/',
            r'from "\g<2>/',  # Remove ../../../ -> /
            content
        )
        content = re.sub(
            r'from\s+["\'](\.\./){5}',
            r'from "../',
            content
        )
    elif depth == 2:  # modules/Something/folder/file.tsx
        content = re.sub(
            r'from\s+["\'](\.\./){5}(services|contexts|utils)/',
            r'from "../../../\g<2>/',
            content
        )
        content = re.sub(
            r'from\s+["\'](\.\./){4}(services|contexts|utils)/',
            r'from "../../../\g<2>/',
            content
        )
        content = re.sub(
            r'from\s+["\'](\.\./){6}',
            r'from "../../../../',
            content
        )
    elif depth >= 3:  # modules/Something/folder/subfolder/file.tsx or deeper
        # Remove um ../
        content = re.sub(
            r'from\s+["\'](\.\./){6}(services|contexts|utils)/',
            r'from "../../../../\g<2>/',
            content
        )
        content = re.sub(
            r'from\s+["\'](\.\./){5}(services|contexts|utils)/',
            r'from "../../../../\g<2>/',
            content
        )
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    base_path = Path('/Users/denielson/Desktop/Teste')
    
    fixed_files = []
    for file_path in base_path.rglob('*.tsx'):
        if fix_imports_in_file(str(file_path)):
            fixed_files.append(str(file_path))
    
    for file_path in base_path.rglob('*.ts'):
        if file_path.name != 'fix-imports.py':
            if fix_imports_in_file(str(file_path)):
                fixed_files.append(str(file_path))
    
    print(f"✅ Corrigidos {len(fixed_files)} arquivos")
    for f in fixed_files[:10]:
        print(f"  - {f}")
    if len(fixed_files) > 10:
        print(f"  ... e {len(fixed_files) - 10} mais")

if __name__ == '__main__':
    main()
