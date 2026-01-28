#!/usr/bin/env python3
"""
Script mestre para corrigir TODOS os problemas de import no projeto
"""
import os
import re
from pathlib import Path

def calculate_depth(filepath):
    """Calcula profundidade do arquivo em relação à raiz do projeto"""
    parts = Path(filepath).parts
    # A partir de 'modules', conta quantos níveis de diretório tem
    if 'modules' in parts:
        idx = parts.index('modules')
        # Profundidade = níveis após 'modules' até o arquivo (excluindo o arquivo)
        return len(parts) - idx - 1
    return 0

def fix_mismatched_quotes(content):
    """Corrige aspas incompatíveis em strings"""
    # Padrão: from "...path' ou from '...path"
    content = re.sub(r'from\s+"([^"\']+)\'', r"from '\1'", content)
    content = re.sub(r"from\s+'([^'\"]+)\"", r"from '\1'", content)
    
    # Corrige strings com aspas incompatíveis em geral (const x = "....')
    content = re.sub(r'=\s*"([^"\']*?)\'(?=\s*;)', r"= '\1'", content)
    content = re.sub(r"=\s*'([^'\"]*?)\"(?=\s*;)", r"= '\1'", content)
    
    return content

def fix_import_paths(filepath, content):
    """Corrige caminhos de import baseado na profundidade do arquivo"""
    depth = calculate_depth(filepath)
    
    if depth == 0:
        return content
    
    # Para services, contexts, utils que estão na raiz
    # depth 1: modules/X/file.tsx -> usa ../
    # depth 2: modules/X/Y/file.tsx -> usa ../../
    # depth 3: modules/X/Y/Z/file.tsx -> usa ../../../
    # depth 4: modules/X/Y/Z/W/file.tsx -> usa ../../../../
    
    correct_prefix = '../' * depth
    
    # Corrige imports de services, contexts, utils
    for folder in ['services', 'contexts', 'utils']:
        # Encontra todos os padrões de import para essa pasta
        pattern = rf'from\s+[\'"](\.\./)+{folder}/'
        
        def replacer(match):
            return f"from '{correct_prefix}{folder}/"
        
        content = re.sub(pattern, replacer, content)
    
    return content

def process_file(filepath):
    """Processa um arquivo corrigindo todos os problemas"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Aplica todas as correções
        content = fix_mismatched_quotes(content)
        content = fix_import_paths(filepath, content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"❌ Erro em {filepath}: {e}")
    return False

def main():
    base_path = Path('/Users/denielson/Desktop/Teste/modules')
    
    if not base_path.exists():
        print(f"❌ Diretório não encontrado: {base_path}")
        return
    
    print("🔍 Buscando arquivos TypeScript/TSX...")
    files = list(base_path.rglob('*.ts')) + list(base_path.rglob('*.tsx'))
    print(f"📁 Encontrados {len(files)} arquivos\n")
    
    print("🔧 Corrigindo arquivos...")
    fixed_count = 0
    
    for file_path in files:
        if process_file(file_path):
            fixed_count += 1
            rel_path = file_path.relative_to(base_path.parent)
            print(f"✅ {rel_path}")
    
    print(f"\n📊 Resumo:")
    print(f"   Total de arquivos: {len(files)}")
    print(f"   Arquivos corrigidos: {fixed_count}")
    print(f"   Arquivos sem alteração: {len(files) - fixed_count}")

if __name__ == '__main__':
    main()
