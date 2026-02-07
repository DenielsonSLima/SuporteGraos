# 🖼️ Imagens da Tela de Login

## Descrição
Esta pasta contém as imagens que aparecem na tela de login.

As imagens neste diretório são servidas **sem autenticação** (através da pasta `public/`), o que resolve o problema onde a tela de login tentava buscar imagens que exigiam autenticação, causando tela em branco antes do login.

## Como Usar
1. **Copie suas imagens** para esta pasta:
   ```bash
   login-images/
   ├── banner-1.jpg
   ├── banner-2.jpg
   ├── banner-3.jpg
   └── ... (até 12 imagens)
   ```

2. **Nome dos arquivos**: Use nomes simples (ex: `banner-1.jpg`, `image-1.jpg`)

3. **Formato suportado**: JPG, PNG, WebP (recomendado WebP para melhor performance)

4. **Tamanho recomendado**:
   - Resolução: 1920x1080 (16:9)
   - Tamanho: < 500KB por imagem
   - Total máximo: 6MB para as 12 imagens

## Acesso nos Componentes
```typescript
// No LoginScreen.tsx
const backupImages = [
  '/login-images/banner-1.jpg',
  '/login-images/banner-2.jpg',
  // ... até 12
];
```

## Ordem de Precedência para Imagens
1. **Supabase** (se autenticado e gerenciado via Settings)
2. **Public (`/login-images/`)** ← Este arquivo (fallback sem autenticação)
3. **localStorage** (legacy)
4. **Imagem padrão** (Unsplash)

## Notas Importantes
- Imagens públicas **não requerem autenticação**
- São cached pelo navegador (melhor performance)
- Podem ser gerenciadas via commit no Git
- Ainda pode usar o módulo Settings para upload via Supabase quando autenticado

---
**Criado em:** 5 de fevereiro de 2026
**Propósito:** Corrigir erro de autenticação na tela de login
