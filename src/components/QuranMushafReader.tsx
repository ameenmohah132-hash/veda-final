import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { GlassButton, GlassCard } from './ui/LiquidGlass';
import { useLanguage } from '../lib/LanguageContext';
import quranOutlineData from '../data/quranOutline.json';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  BookOpen,
  List,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PDF_URL = '/quran/mushaf.pdf';

interface OutlineEntry {
  title: string;
  page: number;
}
const QURAN_OUTLINE = quranOutlineData as OutlineEntry[];

interface QuranMushafReaderProps {
  initialPage: number;
  onProgressChange: (page: number, totalPages: number) => void;
}

export function QuranMushafReader({ initialPage, onProgressChange }: QuranMushafReaderProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(Math.max(1, initialPage || 1));
  const [pageInput, setPageInput] = useState(String(pageNum));
  const [zoom, setZoom] = useState(1);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Load the document once
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    const loadingTask = pdfjsLib.getDocument({
      url: PDF_URL,
      // Enables byte-range fetching so the browser only downloads the pages
      // actually viewed, instead of the entire ~130MB file up front.
      disableRange: false,
      disableStream: false,
    });

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load Quran PDF:', err);
        setErrorMsg(t('quran.loadError'));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      loadingTask.destroy?.();
    };
  }, []);

  const renderPage = useCallback(
    async (num: number, scale: number) => {
      const pdf = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      setIsRendering(true);
      try {
        const page = await pdf.getPage(num);
        const containerWidth = containerRef.current?.clientWidth || 700;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = (containerWidth / baseViewport.width) * scale;
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        const viewport = page.getViewport({ scale: fitScale * outputScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / outputScale}px`;
        canvas.style.height = `${viewport.height / outputScale}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
        }
      } finally {
        setIsRendering(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status !== 'ready') return;
    renderPage(pageNum, zoom);
    setPageInput(String(pageNum));
  }, [status, pageNum, zoom, renderPage]);

  // Re-render on container resize (orientation change, sidebar toggle, etc.)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (status === 'ready') renderPage(pageNum, zoom);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Persist reading progress (debounced-ish via effect on pageNum change)
  useEffect(() => {
    if (status !== 'ready' || !numPages) return;
    const t = setTimeout(() => onProgressChange(pageNum, numPages), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, numPages, status]);

  function goToPage(n: number) {
    const clamped = Math.min(Math.max(1, n), numPages || 1);
    setPageNum(clamped);
  }

  function handlePageInputSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) goToPage(n);
  }

  const currentSurah = [...QURAN_OUTLINE].reverse().find((o) => o.page <= pageNum);

  if (status === 'error') {
    return (
      <GlassCard variant="subtle" className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{errorMsg}</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <GlassCard variant="subtle" className="p-2.5 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setIsOutlineOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-900/5 dark:hover:bg-white/5 min-h-[40px]"
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">
            {currentSurah ? `${t('quran.surahPrefix')} ${currentSurah.title}` : t('quran.surahsLabel')}
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(pageNum - 1)}
            disabled={pageNum <= 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900/5 dark:hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              inputMode="numeric"
              className="w-12 text-center text-xs font-semibold rounded-lg bg-zinc-900/5 dark:bg-white/10 py-1.5 text-zinc-900 dark:text-white"
            />
            <span className="text-xs text-zinc-400">/ {numPages || '—'}</span>
          </form>

          <button
            onClick={() => goToPage(pageNum + 1)}
            disabled={!numPages || pageNum >= numPages}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900/5 dark:hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900/5 dark:hover:bg-white/5"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-900/5 dark:hover:bg-white/5"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Page canvas */}
      <div
        ref={containerRef}
        className="relative w-full flex justify-center items-start overflow-auto rounded-2xl bg-zinc-100 dark:bg-black/30 border border-zinc-900/[0.06] dark:border-white/[0.07] p-3 sm:p-6 min-h-[420px]"
      >
        {(status === 'loading' || isRendering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100/70 dark:bg-black/40 backdrop-blur-sm z-10">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        )}
        <canvas ref={canvasRef} className="rounded-lg shadow-lg bg-white max-w-full" />
      </div>

      {/* Surah outline drawer */}
      {isOutlineOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsOutlineOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl bg-white dark:bg-zinc-900 max-h-[75vh] flex flex-col border border-black/10 dark:border-white/10"
          >
            <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> {t('quran.surahsLabel')}
              </h3>
              <button
                onClick={() => setIsOutlineOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900/5 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {QURAN_OUTLINE.map((entry, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    goToPage(entry.page);
                    setIsOutlineOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-900/5 dark:hover:bg-white/5 text-left"
                >
                  <span className="text-lg font-serif text-zinc-900 dark:text-white">{entry.title}</span>
                  <span className="text-[11px] text-zinc-400">p. {entry.page}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
