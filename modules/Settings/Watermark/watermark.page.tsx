
import React, { useState, useEffect } from 'react';
import { 
  FileImage, 
  Upload, 
  Save, 
  Smartphone, 
  Monitor, 
  Eye
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { useToast } from '../../../contexts/ToastContext';
import { useUpdateWatermark, useWatermark } from '../../../hooks/useWatermark';

interface Props {
  onBack: () => void;
}

const WatermarkSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const { data: watermarkData } = useWatermark();
  const updateWatermark = useUpdateWatermark();

  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(15);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isLoading, setIsLoading] = useState(false);

  // Sync form state when query data arrives
  useEffect(() => {
    if (watermarkData) {
      setWatermarkImage(watermarkData.imageUrl);
      setOpacity(watermarkData.opacity);
      setOrientation(watermarkData.orientation);
    }
  }, [watermarkData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkImage(reader.result as string);
        addToast('info', 'Pré-visualização', 'Imagem carregada para preview. Salve para aplicar.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setWatermarkImage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateWatermark.mutateAsync({
        imageUrl: watermarkImage,
        opacity: opacity,
        orientation: orientation
      });
      addToast('success', 'Marca D\'água Salva', 'As configurações foram aplicadas a todos os documentos PDF.');
    } catch (err) {
      addToast('error', 'Erro ao Salvar', 'Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock document lines for preview visualization
  const MockDocumentContent = () => (
    <div className="absolute inset-0 z-10 flex flex-col p-8 text-xs text-slate-300 pointer-events-none select-none overflow-hidden">
      {/* Header */}
      <div className="flex justify-between border-b border-slate-200 pb-4 mb-6">
        <div className="h-8 w-24 bg-slate-200 rounded"></div>
        <div className="space-y-1 text-right">
          <div className="h-2 w-32 bg-slate-200 rounded ml-auto"></div>
          <div className="h-2 w-20 bg-slate-200 rounded ml-auto"></div>
        </div>
      </div>
      
      {/* Title */}
      <div className="mb-6 h-6 w-1/2 bg-slate-200 rounded"></div>

      {/* Body Text / Rows */}
      <div className="space-y-3 flex-1">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="h-2 w-full bg-slate-100 rounded"></div>
            <div className={`h-2 bg-slate-100 rounded ${i % 2 === 0 ? 'w-1/4' : 'w-1/2'}`}></div>
          </div>
        ))}
        
        {/* Table Simulation */}
        <div className="mt-8 border border-slate-200 rounded-lg p-1">
           <div className="bg-slate-100 h-6 mb-1 rounded"></div>
           {[...Array(5)].map((_, i) => (
             <div key={`row-${i}`} className="h-6 mb-1 border-b border-slate-50 last:border-0"></div>
           ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-200 pt-4 flex justify-between items-center">
        <div className="h-2 w-48 bg-slate-200 rounded"></div>
        <div className="h-2 w-8 bg-slate-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <SettingsSubPage
      title="Marca D'água PDF"
      description="Personalize a identidade visual dos documentos gerados pelo sistema."
      icon={FileImage}
      color="bg-pink-500"
      onBack={onBack}
    >
      <form onSubmit={handleSave} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upload Section */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-4 font-semibold text-slate-800 flex items-center gap-2">
              <Upload size={18} className="text-slate-500" />
              Upload da Imagem
            </h3>
            
            {!watermarkImage ? (
              <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white transition-all hover:bg-pink-50 hover:border-pink-300">
                <div className="flex flex-col items-center justify-center pb-6 pt-5">
                  <FileImage className="mb-3 h-10 w-10 text-slate-400" />
                  <p className="mb-2 text-sm text-slate-500 text-center px-4">
                    <span className="font-semibold text-pink-600">Clique para enviar</span>
                    <br />ou arraste a imagem aqui
                  </p>
                  <p className="text-xs text-slate-400">PNG ou JPG (Fundo transparente recomendado)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 rounded bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    <img src={watermarkImage} alt="Miniatura" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">marca_dagua.png</p>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="mt-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Opacidade</label>
                <span className="text-xs font-mono font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                  {opacity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Ajuste para que a marca d'água não prejudique a leitura do texto.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Visualização</label>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded py-1.5 text-sm font-medium transition-colors ${
                    orientation === 'portrait' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Smartphone size={16} /> 
                  Retrato
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded py-1.5 text-sm font-medium transition-colors ${
                    orientation === 'landscape' 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Monitor size={16} />
                  Paisagem
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : (
                <>
                  <Save size={18} />
                  Salvar Preferências
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8">
          <div className="h-full rounded-xl bg-slate-100 p-8 flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden">
            
            {/* Background pattern for canvas feeling */}
            <div className="absolute inset-0 opacity-5" style={{ 
              backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }}></div>

            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 z-10">
              <Eye size={16} />
              <span>Pré-visualização do Documento (A4)</span>
            </div>

            {/* The Paper */}
            <div 
              className={`
                relative bg-white shadow-xl transition-all duration-500 ease-in-out border border-slate-200
                ${orientation === 'portrait' ? 'aspect-[210/297] w-[380px]' : 'aspect-[297/210] w-[560px]'}
              `}
            >
              {/* Fake Content Layer */}
              <MockDocumentContent />

              {/* Watermark Layer */}
              {watermarkImage && (
                <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                  <img 
                    src={watermarkImage} 
                    alt="Watermark Preview" 
                    className="max-w-[80%] max-h-[80%] object-contain transition-opacity duration-200"
                    style={{ opacity: opacity / 100 }}
                  />
                </div>
              )}

              {/* Empty State Helper Text inside Paper if no image */}
              {!watermarkImage && (
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                  <div className="text-center text-slate-300 p-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <FileImage size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">A marca d'água aparecerá aqui</p>
                  </div>
                </div>
              )}
            </div>
            
            <p className="mt-6 text-xs text-slate-400 text-center max-w-md z-10">
              * A visualização acima é apenas uma simulação. O resultado final dependerá do conteúdo real de cada relatório gerado pelo sistema.
            </p>
          </div>
        </div>
      </form>
    </SettingsSubPage>
  );
};

export default WatermarkSettings;
