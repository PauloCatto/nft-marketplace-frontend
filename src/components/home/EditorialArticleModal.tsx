import { BookOpen, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import type { EditorialPost } from '../../constants/home.constants';

interface EditorialArticleModalProps {
  article: EditorialPost | null;
  onClose: () => void;
}

export function EditorialArticleModal({ article, onClose }: EditorialArticleModalProps) {
  if (!article) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#19100A] border border-[#3D281C] rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#140D0A] shrink-0">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#19100A] via-[#19100A]/40 to-black/50" />
          <button
            type="button"
            aria-label="Fechar artigo"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-[#D1823C] text-white hover:text-[#140D0A] flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#D1823C] text-[#140D0A] text-[10px] font-black uppercase tracking-wider shadow">
              {article.category}
            </span>
            <span className="text-[11px] text-[#E8D7C8] bg-black/50 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              {article.date} • {article.readTime}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-7 overflow-y-auto space-y-5 flex-1 pr-5">
          <div>
            <h2
              id="article-modal-title"
              className="text-xl sm:text-2xl font-bold text-[#FAF5F0] leading-snug tracking-tight"
            >
              {article.title}
            </h2>
            <p className="text-xs text-[#D1823C] font-medium leading-relaxed italic border-l-2 border-[#D1823C] pl-3 py-1 mt-3">
              {article.excerpt}
            </p>
            <div className="mt-4 pt-3 border-t border-[#2C1E16] flex items-center justify-between text-[11px] text-[#A8968A]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#D1823C] text-[#140D0A] font-bold text-[10px] flex items-center justify-center">
                  {article.author.name.charAt(0)}
                </div>
                <span>
                  Por <strong className="text-[#FAF5F0]">{article.author.name}</strong> •{' '}
                  <span className="text-[#8C7A6B]">{article.author.role}</span>
                </span>
              </div>
              <span className="text-[#D1823C] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs text-[#C5B4A6] leading-relaxed">
            {article.content.map((sec, idx) => (
              <div key={idx} className="space-y-2 bg-[#211610]/50 p-4 rounded-xl border border-[#2E1E14]">
                <h3 className="text-[13px] font-bold text-[#FAF5F0] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#D1823C] shrink-0" />
                  <span>{sec.heading}</span>
                </h3>
                <p className="text-[12px] leading-relaxed text-[#B5A395] pl-6">{sec.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2C1E16] bg-[#140D0A] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
              toast.success('Link do artigo copiado para a área de transferência!');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Copiar link</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-6 py-2 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            Concluir leitura
          </button>
        </div>
      </div>
    </div>
  );
}
