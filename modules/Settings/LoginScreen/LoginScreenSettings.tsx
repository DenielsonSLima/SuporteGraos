
import React, { useState, useEffect } from 'react';
import { Layout, Sparkles, Upload, Trash2, Save, RefreshCcw, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, X, Maximize2, Download } from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { settingsService, RotationFrequency } from '../../../services/settingsService';
import { loginScreenService } from '../../../services/loginScreenService';
import { useToast } from '../../../contexts/ToastContext';
import { GoogleGenAI } from '@google/genai';

interface Props {
  onBack: () => void;
}

const MAX_SLOTS = 12;

const LoginScreenSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<RotationFrequency>('fixed');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number | null>(null);
  
  // State para visualização em tela cheia
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);

        // 1) Tenta carregar do Supabase
        const screens = await loginScreenService.loadActiveScreens();
        const ordered: string[] = new Array(MAX_SLOTS).fill('');
        screens
          .sort((a, b) => a.sequence_order - b.sequence_order)
          .forEach((s) => {
            const idx = Math.min(Math.max(s.sequence_order, 0), MAX_SLOTS - 1);
            ordered[idx] = s.image_url || s.image_data || '';
          });

        // 2) Se não tiver nada no Supabase, cai no localStorage
        if (ordered.every((v) => !v)) {
          const current = settingsService.getLoginSettings();
          setImages(current.images || []);
          setFrequency(current.frequency || 'fixed');
        } else {
          setImages(ordered);
          // Buscar config de rotação
          const config = await loginScreenService.loadRotationConfig();
          setFrequency((config?.rotation_frequency as RotationFrequency) || 'fixed');
        }
      } catch (error) {
        console.error('Erro ao carregar telas iniciais:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Limite de 1MB
        addToast('error', 'Arquivo muito grande', 'O limite é de 1MB por imagem para garantir o salvamento no navegador.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const newImages = [...images];
        newImages[index] = result;
        setImages(newImages);
        addToast('info', 'Imagem Preparada', 'Lembre-se de salvar para aplicar.');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();

    // Limpa localmente, mantendo o mesmo número de slots
    const newImages = [...images];
    newImages[index] = '';
    setImages(newImages);

    try {
      // Carrega estado mais recente do Supabase
      const screens = await loginScreenService.loadActiveScreens();
      const screen = screens.find((s) => s.sequence_order === index);

      if (screen) {
        await loginScreenService.deleteScreen(screen.id);
        addToast('success', 'Imagem Removida', 'Deletada do servidor.');
      }

      // Recarrega imagens do Supabase para refletir a exclusão
      const refreshed = await loginScreenService.loadActiveScreens();
      const ordered: string[] = new Array(MAX_SLOTS).fill('');
      refreshed
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .forEach((s) => {
          const idx = Math.min(Math.max(s.sequence_order, 0), MAX_SLOTS - 1);
          ordered[idx] = s.image_url || s.image_data || '';
        });
      setImages(ordered);

      // Atualiza backup local
      await settingsService.updateLoginSettings({
        images: ordered.filter((img) => !!img),
        frequency,
      });
    } catch (error: any) {
      console.error('Erro ao deletar imagem:', error);
      addToast('error', 'Erro ao Deletar', error.message);
    }
  };

  const generateViaIA = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    const prompts = settingsService.getAgroPrompts();
    const newImages = [...images];
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    addToast('info', 'Iniciando IA', 'Gerando 12 temas. Cadenciando a cada 3s para máxima qualidade.');

    try {
      for (let i = 0; i < 12; i++) {
        setCurrentGeneratingIndex(i);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompts[i] }]
          },
          config: {
            imageConfig: {
              aspectRatio: "16:9"
            }
          }
        });

        let base64Image = '';
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        if (base64Image) {
          newImages[i] = base64Image;
          setImages([...newImages]);
        }

        setGenerationProgress(((i + 1) / 12) * 100);

        if (i < 11) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      addToast('success', 'Galeria Concluída', '12 novas imagens foram geradas.');
    } catch (error) {
      console.error('Erro na geração IA:', error);
      addToast('error', 'Falha na IA', 'Erro ao gerar as imagens. Verifique sua cota da API.');
    } finally {
      setIsGenerating(false);
      setCurrentGeneratingIndex(null);
      setGenerationProgress(0);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      console.log('💾 Iniciando salvamento de imagens...', { total: images.length });
      
      // Salvar cada imagem no Supabase
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img) {
          console.log(`📸 Processando imagem ${i + 1}/${images.length}`);
          
          // Verificar se já existe
          const existingScreens = await loginScreenService.getScreens();
          console.log(`🔍 Total de imagens no cache: ${existingScreens.length}`);
          
          const existing = existingScreens.find(s => s.sequence_order === i);
          console.log(`🔎 Existente na posição ${i}:`, existing ? 'SIM' : 'NÃO');

          if (existing) {
            // Atualizar existente
            console.log(`✏️ Atualizando imagem ${i}: ${existing.id}`);
            const result = await loginScreenService.updateScreen(existing.id, {
              image_url: img,
              image_data: img.startsWith('data:') ? img : undefined,
              sequence_order: i,
              is_active: true
            });
            console.log(`✏️ Resultado update:`, result ? '✅ OK' : '❌ FALHA');
          } else {
            // Criar novo
            console.log(`➕ Criando nova imagem na posição ${i}`);
            const result = await loginScreenService.addScreen({
              image_url: img,
              image_data: img.startsWith('data:') ? img : undefined,
              title: `Imagem ${i + 1}`,
              sequence_order: i,
              source: img.startsWith('data:') ? 'upload' : 'ai_generated',
              is_active: true
            });
            console.log(`➕ Resultado insert:`, result ? '✅ OK' : '❌ FALHA');
          }
        }
      }

      console.log('⚙️ Salvando configuração de rotação...');
      // Salvar configuração de rotação
      const configResult = await loginScreenService.updateRotationConfig({
        rotation_frequency: frequency,
        display_order: 'sequential'
      });
      console.log('⚙️ Config salva:', configResult ? '✅ OK' : '❌ FALHA');

      console.log('💾 Salvando backup em localStorage...');
      // Também salvar no localStorage como backup
      await settingsService.updateLoginSettings({
        images: images.filter(img => !!img),
        frequency
      });
      console.log('💾 Backup localStorage: ✅ OK');

      // Refrescar cache local com o que está no Supabase
      const refreshed = await loginScreenService.loadActiveScreens();
      const ordered: string[] = new Array(MAX_SLOTS).fill('');
      refreshed
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .forEach((s) => {
          const idx = Math.min(Math.max(s.sequence_order, 0), MAX_SLOTS - 1);
          ordered[idx] = s.image_url || s.image_data || '';
        });
      setImages(ordered);

      console.log('🎉 SUCESSO! Todas as imagens foram salvas.');
      addToast('success', 'Sincronizado com Sucesso', '✅ Imagens salvas no servidor e no navegador.');
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO ao salvar:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        fullError: error
      });
      addToast('error', 'Erro ao Sincronizar', `${error?.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (imgUrl: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `agro-wallpaper-erp-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Download Iniciado');
  };

  return (
    <SettingsSubPage
      title="Tela Inicial"
      description="Gerencie as imagens de fundo e a dinâmica de exibição da tela de acesso ao ERP."
      icon={Layout}
      color="bg-indigo-600"
      onBack={onBack}
    >
      <div className="space-y-8">
        
        {/* Lógica de Rotação */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
           <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
             <RefreshCcw size={18} className="text-indigo-600" /> Frequência de Alteração Automática
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'fixed', label: 'Fixa (Estática)', desc: 'Exibe sempre a primeira imagem' },
                { id: 'daily', label: 'Diária', desc: 'Uma imagem diferente a cada dia' },
                { id: 'weekly', label: 'Semanal', desc: 'Muda no início de cada semana' },
                { id: 'monthly', label: 'Mensal', desc: 'Muda no primeiro dia do mês' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFrequency(f.id as RotationFrequency)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${frequency === f.id ? 'bg-white border-indigo-600 shadow-lg scale-[1.02]' : 'bg-white/50 border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className={`font-black text-xs uppercase ${frequency === f.id ? 'text-indigo-600' : 'text-slate-500'}`}>{f.label}</p>
                    {frequency === f.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">{f.desc}</p>
                </button>
              ))}
           </div>
        </div>

        {/* Gerenciamento de Imagens */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-500" /> Galeria de Fundos (Até 12 slots)
              </h3>
              <p className="text-xs text-slate-500 mt-1">Imagens de alta resolução. Clique para expandir ou baixar.</p>
            </div>
            
            <button 
              onClick={generateViaIA}
              disabled={isGenerating}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95
                ${isGenerating 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-105 hover:shadow-indigo-200'}
              `}
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isGenerating ? `Gerando (${Math.round(generationProgress)}%)` : 'Gerar 12 Temas via IA'}
            </button>
          </div>

          {/* Barra de Progresso da IA */}
          {isGenerating && (
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
               <div 
                className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" 
                style={{ width: `${generationProgress}%` }}
               />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => {
              const hasImage = !!images[i];
              const isCurrent = currentGeneratingIndex === i;

              return (
                <div 
                    key={i} 
                    onClick={() => hasImage && setPreviewImage(images[i])}
                    className={`
                        aspect-video relative rounded-2xl border-2 overflow-hidden group transition-all
                        ${isCurrent ? 'border-indigo-500 ring-4 ring-indigo-100' : 'border-slate-200'}
                        ${!hasImage && !isCurrent ? 'border-dashed bg-slate-50' : 'bg-white shadow-sm cursor-pointer'}
                    `}
                >
                  {isCurrent ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px]">
                       <Loader2 size={24} className="text-indigo-600 animate-spin mb-2" />
                       <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Gerando...</span>
                    </div>
                  ) : hasImage ? (
                    <>
                      <img src={images[i]} alt={`Slide ${i+1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                         <div className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl">
                            <Maximize2 size={16} />
                         </div>
                         <button 
                            onClick={(e) => removeImage(e, i)} 
                            className="p-2 bg-rose-600 text-white rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                         >
                            <Trash2 size={16} />
                         </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter backdrop-blur-md">
                        Slot {i+1}
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                       <Upload size={20} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                       <span className="text-[9px] font-black text-slate-400 mt-1 uppercase">Upload</span>
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(i, e)} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
             <AlertCircle className="text-amber-600 shrink-0" size={18} />
             <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
               <strong>Dica Visual:</strong> Clique em uma imagem para visualizá-la em tamanho real e realizar o download para seu computador. O armazenamento é limitado ao navegador.
             </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-200 flex justify-end">
           <button 
             onClick={saveSettings}
             disabled={isLoading || isGenerating}
             className="flex items-center gap-2 bg-slate-950 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
           >
             {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
             {isLoading ? 'Sincronizando...' : 'Salvar e Aplicar Galeria'}
           </button>
        </div>

      </div>

      {/* LIGHTBOX MODAL (TELA CHEIA) */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="absolute top-6 right-6 flex gap-3">
            <button 
              onClick={() => downloadImage(previewImage)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-sm"
              title="Baixar Imagem"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Baixar Wallpaper</span>
            </button>
            <button 
              onClick={() => setPreviewImage(null)}
              className="p-3 bg-white/10 hover:bg-rose-600 text-white rounded-2xl transition-all"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="w-full max-w-6xl aspect-video rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
             <img src={previewImage} alt="Preview Full" className="w-full h-full object-contain" />
          </div>
          
          <div className="mt-6 text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
            Visualização de Alta Fidelidade • Suporte Grãos ERP
          </div>
        </div>
      )}
    </SettingsSubPage>
  );
};

export default LoginScreenSettings;
