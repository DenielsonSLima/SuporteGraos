#!/usr/bin/env python3
"""
Script agressivo para corrigir paths de importação
Baseia-se em padrões encontrados nos erros do Vite
"""

import os
import re
from pathlib import Path

# Mapeamento de arquivos problemáticos e suas correções
FIXES = {
    'modules/Settings/Api/ApiSettings.tsx': [
        ('from \'../../../../services/api\'', 'from \'../../../services/api\''),
    ],
    'modules/Settings/Logs/LogsSettings.tsx': [
        ('from \'../../../../services/logService\'', 'from \'../../../services/logService\''),
    ],
    'modules/Settings/Backup/BackupSettings.tsx': [
        ('from \'../../../../contexts/ToastContext\'', 'from \'../../../contexts/ToastContext\''),
        ('from \'../../../../services/partnerService\'', 'from \'../../../services/partnerService\''),
        ('from \'../../../../services/fleetService\'', 'from \'../../../services/fleetService\''),
        ('from \'../../../../services/purchaseService\'', 'from \'../../../services/purchaseService\''),
        ('from \'../../../../services/salesService\'', 'from \'../../../services/salesService\''),
        ('from \'../../../../services/loadingService\'', 'from \'../../../services/loadingService\''),
        ('from \'../../../../services/financialActionService\'', 'from \'../../../services/financialActionService\''),
        ('from \'../../../../services/financialService\'', 'from \'../../../services/financialService\''),
        ('from \'../../../../services/shareholderService\'', 'from \'../../../services/shareholderService\''),
    ],
    'modules/Partners/components/PartnerForm.tsx': [
        ('from \'../../../../contexts/ToastContext\'', 'from \'../../../contexts/ToastContext\''),
        ('from \'../../../../services/partnerService\'', 'from \'../../../services/partnerService\''),
    ],
}

def apply_fixes():
    base_path = Path('/Users/denielson/Desktop/Teste')
    fixed_count = 0
    
    for file_rel, replacements in FIXES.items():
        file_path = base_path / file_rel
        if not file_path.exists():
            print(f"⚠️  Arquivo não encontrado: {file_rel}")
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original = content
            for old, new in replacements:
                content = content.replace(old, new)
            
            if content != original:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Corrigido: {file_rel} ({len(replacements)} replacements)")
                fixed_count += len(replacements)
            else:
                print(f"❓ Nenhuma mudança em: {file_rel}")
        except Exception as e:
            print(f"❌ Erro ao processar {file_rel}: {e}")
    
    print(f"\n📊 Total de replacements: {fixed_count}")

if __name__ == '__main__':
    apply_fixes()
