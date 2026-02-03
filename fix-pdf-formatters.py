import re

file_path = "modules/Performance/components/PerformancePdfDocument.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir currency() por formatMoney()
content = re.sub(r'\{currency\(([^)]+)\)\}', r'{formatMoney(\1)}', content)

# Substituir number() por formatDecimal()  
content = re.sub(r'\{number\(([^)]+)\)\}', r'{formatDecimal(\1)}', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ Formatters substituídos em {file_path}")
