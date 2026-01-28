# 📝 EXEMPLO: Integração com LoginScreenSettings.tsx

## 🎯 Objetivo
Mostrar como integrar o `loginScreenService` no componente `LoginScreenSettings.tsx`

---

## ✅ MUDANÇAS NECESSÁRIAS

### 1. Imports
```tsx
import { loginScreenService, LoginScreen } from '../../../services/loginScreenService';
```

### 2. Adicionar States
```tsx
// Estado para controlar sincronização
const [isSyncing, setIsSyncing] = useState(false);
```

### 3. useEffect para Carregar do Supabase
```tsx
useEffect(() => {
  // Carregar imagens do Supabase ao montar
  const loadScreens = async () => {
    setIsLoading(true);
    const screens = await loginScreenService.loadActiveScreens();
    setImages(screens.map(s => s.image_url));
    setIsLoading(false);
  };
  
  loadScreens();
}, []);
```

### 4. Listener Realtime
```tsx
useEffect(() => {
  // Escutar mudanças em tempo real
  const handleScreensUpdated = async () => {
    const screens = await loginScreenService.loadActiveScreens();
    setImages(screens.map(s => s.image_url));
    addToast('info', 'Atualização', 'Tela inicial atualizada em tempo real');
  };

  window.addEventListener('login_screens:updated', handleScreensUpdated);
  
  return () => {
    window.removeEventListener('login_screens:updated', handleScreensUpdated);
  };
}, [addToast]);
```

### 5. Função de Salvar (Modificada)
```tsx
const handleSave = async () => {
  setIsSyncing(true);
  
  try {
    // Salvar cada imagem no Supabase
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      if (image.startsWith('data:image')) {
        // É uma imagem nova (base64 ou upload)
        const success = await loginScreenService.addScreen({
          image_url: image,
          image_data: image, // Guardar como fallback
          title: `Tela Inicial ${i + 1}`,
          source: 'upload',
          sequence_order: i
        });
        
        if (!success) {
          addToast('error', 'Erro', `Falha ao salvar imagem ${i + 1}`);
          return;
        }
      } else if (image.startsWith('http') && image.length > 0) {
        // URL remota - já está no banco
        continue;
      }
    }
    
    addToast('success', 'Salvo', 'Imagens da tela inicial sincronizadas com Supabase!');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    addToast('error', 'Erro', 'Falha ao sincronizar imagens');
  } finally {
    setIsSyncing(false);
  }
};
```

### 6. Função de Deletar (Modificada)
```tsx
const removeImage = async (e: React.MouseEvent, index: number) => {
  e.stopPropagation();
  
  const image = images[index];
  
  // Se é URL remota (Supabase), deletar do banco
  if (image.startsWith('http')) {
    const screens = loginScreenService.getScreens();
    const screenToDelete = screens.find(s => s.image_url === image);
    
    if (screenToDelete) {
      const success = await loginScreenService.deleteScreen(screenToDelete.id);
      if (!success) {
        addToast('error', 'Erro', 'Falha ao deletar imagem');
        return;
      }
    }
  }
  
  // Remover do estado local
  const newImages = [...images];
  newImages.splice(index, 1);
  setImages(newImages);
  
  addToast('info', 'Removido', 'Imagem removida');
};
```

### 7. Geração por IA (com Sincronização)
```tsx
const generateViaIA = async () => {
  if (isGenerating) return;
  
  setIsGenerating(true);
  setGenerationProgress(0);
  
  const prompts = settingsService.getAgroPrompts();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const newImages: string[] = [];
  
  addToast('info', 'Iniciando IA', 'Gerando imagens. Isso pode levar um tempo...');
  
  try {
    for (let i = 0; i < 12; i++) {
      setCurrentGeneratingIndex(i);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompts[i] }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      
      let base64Image = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (base64Image) {
        // ✨ NOVO: Salvar direto no Supabase
        const success = await loginScreenService.addScreen({
          image_url: base64Image,
          image_data: base64Image,
          title: `IA Gerada #${i + 1}`,
          source: 'ai_generated',
          ai_prompt: prompts[i],
          sequence_order: i
        });
        
        if (success) {
          newImages.push(base64Image);
        }
      }
      
      setGenerationProgress(((i + 1) / 12) * 100);
      
      if (i < 11) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Imagens já estão no banco via realtime
    addToast('success', 'Concluído', '12 imagens geradas e sincronizadas!');
  } catch (error) {
    console.error('Erro IA:', error);
    addToast('error', 'Erro', 'Falha na geração de imagens');
  } finally {
    setIsGenerating(false);
    setCurrentGeneratingIndex(null);
  }
};
```

### 8. Badge de Sincronização
```tsx
// Adicionar ao renderizar cada imagem
{isSyncing && (
  <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
    🔄 Sincronizando...
  </div>
)}

// Adicionar indicador realtime
{loginScreenService.isLoaded() && (
  <div className="text-xs text-green-600 flex items-center gap-1">
    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
    Sincronizado em tempo real
  </div>
)}
```

---

## 🔄 FLUXO COMPLETO

```
1. Usuário abre LoginScreenSettings
   ↓
2. useEffect carrega imagens do Supabase
   setImages(loginScreenService.getScreens())
   ↓
3. Usuário faz ação (upload, geração IA, delete)
   ↓
4. Salva no Supabase via loginScreenService
   ↓
5. Supabase envia mudança via Realtime WebSocket
   ↓
6. loginScreenService recebe e dispara 'login_screens:updated'
   ↓
7. useEffect listener recebe evento
   ↓
8. Recarrega imagens do cache local
   ↓
9. UI atualiza automaticamente
   ↓
10. Badge "Sincronizado em tempo real" aparece
```

---

## 💾 FALLBACK (Se Supabase Cair)

```tsx
// Salvamento local como backup
const saveToLocalStorage = () => {
  localStorage.setItem('login_images_backup', JSON.stringify(images));
};

// Restaurar do backup
const restoreFromLocalStorage = () => {
  const backup = localStorage.getItem('login_images_backup');
  if (backup) {
    setImages(JSON.parse(backup));
    addToast('warning', 'Offline', 'Carregado do backup local');
  }
};

// Usar fallback se Supabase falhar
const loadScreensWithFallback = async () => {
  try {
    const screens = await loginScreenService.loadActiveScreens();
    setImages(screens.map(s => s.image_url || s.image_data));
  } catch (error) {
    console.error('Supabase indisponível, usando backup');
    restoreFromLocalStorage();
  }
};
```

---

## ✅ BENEFÍCIOS

| Recurso | Antes | Depois |
|---------|-------|--------|
| Armazenamento | localStorage | ✅ Supabase (escalável) |
| Sincronização | Manual | ✅ Automática (Realtime) |
| Multi-cliente | ❌ Não | ✅ Sim (todos atualizam) |
| Backup | ❌ Não | ✅ Banco de dados |
| Performance | Cache | ✅ Cache + Índices |
| Segurança | Browser | ✅ RLS + Auth |

---

## 🚀 PRÓXIMOS PASSOS

1. Copiar este exemplo
2. Integrar no LoginScreenSettings.tsx
3. Testar com upload
4. Testar com geração IA
5. Testar delete
6. Testar realtime (2 abas do navegador)
7. Produção ✅

---

**Tempo estimado:** 30-45 minutos para integração completa
