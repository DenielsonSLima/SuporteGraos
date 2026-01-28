// Script para corrigir o arquivo UsersSettings.tsx
// Remover a linha duplicada: "const handleDelete = (id: string) => {"

import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'modules/Settings/Users/UsersSettings.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Remover a primeira ocorrência de "const handleDelete = (id: string) => {"
// Mantendo apenas o "const confirmDelete = async () => {"
content = content.replace(
  'const handleDelete = (id: string) => {\n  const handleDelete = async (id: string) => {\n  const confirmDelete',
  'const confirmDelete'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Arquivo corrigido!');
