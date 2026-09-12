import React, { useState, useMemo } from 'react';
import { GlassButton, GlassCard } from '../ui/LiquidGlass';
import { useLanguage } from '../../lib/LanguageContext';
import { AppState, QuickNote, NoteTag } from '../../types';
import { getSubscriptionDetails } from '../../lib/subscription';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Search,
  BookOpen,
  User,
  Briefcase,
  GraduationCap,
  Tag,
  X,
  Edit2,
  Check,
} from 'lucide-react';

interface NotesTabProps {
  state: AppState;
  onAddNote: (note: Omit<QuickNote, 'id' | 'createdAt'>) => void;
  onUpdateNote?: (id: string, updates: Partial<QuickNote>) => void;
  onDeleteNote: (id: string) => void;
  onOpenPremium: () => void;
}

const TAG_CONFIG: Record<
  NoteTag,
  {
    label: NoteTag;
    icon: React.ElementType;
    badgeClass: string;
    activeFilterClass: string;
    borderClass: string;
  }
> = {
  Personal: {
    label: 'Personal',
    icon: User,
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    activeFilterClass: 'bg-purple-600 text-white shadow-sm',
    borderClass: 'border-purple-500/30',
  },
  Work: {
    label: 'Work',
    icon: Briefcase,
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    activeFilterClass: 'bg-blue-600 text-white shadow-sm',
    borderClass: 'border-blue-500/30',
  },
  Study: {
    label: 'Study',
    icon: GraduationCap,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    activeFilterClass: 'bg-emerald-600 text-white shadow-sm',
    borderClass: 'border-emerald-500/30',
  },
};

export function NotesTab({
  state,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onOpenPremium,
}: NotesTabProps) {
  const { t, language } = useLanguage();
  function tagLabel(tag: NoteTag): string {
    if (tag === 'Personal') return t('notes.tagPersonal');
    if (tag === 'Work') return t('notes.tagWork');
    return t('notes.tagStudy');
  }
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<NoteTag>('Study');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<'ALL' | NoteTag>('ALL');

  // Inline editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState<NoteTag>('Study');

  const [aiSummary, setAiSummary] = useState<{ [id: string]: string }>({});
  const [loadingAiNoteId, setLoadingAiNoteId] = useState<string | null>(null);

  const sub = getSubscriptionDetails(state.profile);
  const isPremium = sub.isPremiumActive;

  // Counts for each tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: state.notes?.length || 0,
      Personal: 0,
      Work: 0,
      Study: 0,
    };
    (state.notes || []).forEach((n) => {
      const tag = (n.tag || (n.category === 'study' ? 'Study' : 'Personal')) as NoteTag;
      if (counts[tag] !== undefined) {
        counts[tag]++;
      }
    });
    return counts;
  }, [state.notes]);

  function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onAddNote({
      title: title.trim(),
      tag: selectedTag,
      category: selectedTag.toLowerCase() as any,
      content: content.trim(),
    });

    setTitle('');
    setContent('');
    setSelectedTag('Study');
    setShowAdd(false);
  }

  function startEditing(note: QuickNote) {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTag(
      (note.tag || (note.category === 'study' ? 'Study' : 'Personal')) as NoteTag
    );
  }

  function saveEditing(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return;
    if (onUpdateNote) {
      onUpdateNote(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        tag: editTag,
        category: editTag.toLowerCase() as any,
      });
    }
    setEditingNoteId(null);
  }

  function handleQuickChangeTag(id: string, newTag: NoteTag) {
    if (onUpdateNote) {
      onUpdateNote(id, {
        tag: newTag,
        category: newTag.toLowerCase() as any,
      });
    }
  }

  async function handleSummarize(note: QuickNote) {
    if (!isPremium) {
      onOpenPremium();
      return;
    }

    setLoadingAiNoteId(note.id);
    try {
      const res = await fetch('/api/gemini/ask-veda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please summarize this note into 3 key takeaways and 2 actionable items:\n\nTag: ${note.tag || 'General'}\nTitle: ${note.title}\n\nContent:\n${note.content}`,
          mode: 'general',
          context: { language },
        }),
      });
      const data = await res.json();
      setAiSummary((prev) => ({ ...prev, [note.id]: data.reply || t('notes.summaryFallback') }));
    } catch (_e) {
      setAiSummary((prev) => ({ ...prev, [note.id]: t('notes.summaryError') }));
    } finally {
      setLoadingAiNoteId(null);
    }
  }

  const filteredNotes = (state.notes || []).filter((n) => {
    const noteTag = (n.tag || (n.category === 'study' ? 'Study' : 'Personal')) as NoteTag;
    
    // Tag filter
    if (activeTagFilter !== 'ALL' && noteTag !== activeTagFilter) {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (n.title || '').toLowerCase().includes(q);
      const matchContent = (n.content || '').toLowerCase().includes(q);
      const matchTag = noteTag.toLowerCase().includes(q);
      const matchCategory = (n.category || '').toLowerCase().includes(q);
      return matchTitle || matchContent || matchTag || matchCategory;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6" />
            {t('page.notes.heading')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
{t('notes.subtitlePrefix')} <span className="font-semibold text-purple-600 dark:text-purple-400">{t('notes.tagPersonal')}</span>, <span className="font-semibold text-blue-600 dark:text-blue-400">{t('notes.tagWork')}</span>, {t('notes.and')} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{t('notes.tagStudy')}</span>.
          </p>
        </div>

        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAdd ? t('notes.closeForm') : t('notes.createNote')}
        </GlassButton>
      </div>

      {/* NEW NOTE FORM */}
      {showAdd && (
        <GlassCard variant="elevated" className="p-5 border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              {t('notes.newQuickNote')}
            </h3>
            <button
              onClick={() => setShowAdd(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateNote} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {t('notes.noteTitle')}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('notes.noteTitlePlaceholder')}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  {t('notes.tagContext')}
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10">
                  {(['Personal', 'Work', 'Study'] as NoteTag[]).map((t) => {
                    const cfg = TAG_CONFIG[t];
                    const Icon = cfg.icon;
                    const isSel = selectedTag === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTag(t)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                          isSel
                            ? `${cfg.activeFilterClass}`
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{tagLabel(t)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                {t('notes.contentBody')}
              </label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('notes.contentPlaceholder')}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('notes.taggedAs')} </span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider ${TAG_CONFIG[selectedTag].badgeClass}`}>
                  {tagLabel(selectedTag)}
                </span>
              </div>

              <div className="flex gap-2">
                <GlassButton size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  {t('notes.cancel')}
                </GlassButton>
                <GlassButton size="sm" variant="primary" type="submit">
                  {t('notes.saveNote')}
                </GlassButton>
              </div>
            </div>
          </form>
        </GlassCard>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Tag Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTagFilter('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTagFilter === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm'
                : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/5 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            <span>{t('notes.allNotes')}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTagFilter === 'ALL'
                  ? 'bg-white/20 dark:bg-black/20'
                  : 'bg-black/10 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {tagCounts.ALL}
            </span>
          </button>

          {(['Personal', 'Work', 'Study'] as NoteTag[]).map((tagKey) => {
            const cfg = TAG_CONFIG[tagKey];
            const Icon = cfg.icon;
            const isSelected = activeTagFilter === tagKey;
            return (
              <button
                key={tagKey}
                onClick={() => setActiveTagFilter(isSelected ? 'ALL' : tagKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? `${cfg.activeFilterClass} border-transparent`
                    : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/5 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tagLabel(tagKey)}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-black/10 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {tagCounts[tagKey] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notes.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE FILTER / RESULT STATUS */}
      {(activeTagFilter !== 'ALL' || search.trim() !== '') && (
        <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              {t('notes.showing')} {filteredNotes.length} {t('notes.ofWord')} {state.notes?.length || 0} {t('notes.ofNotesSuffix')}
            </span>
            {activeTagFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-[11px]">
                {t('notes.tagLabel')} <strong className="font-semibold">{tagLabel(activeTagFilter as NoteTag)}</strong>
                <button
                  onClick={() => setActiveTagFilter('ALL')}
                  className="hover:text-zinc-900 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-[11px]">
                {t('notes.queryLabel')} &ldquo;{search}&rdquo;
                <button
                  onClick={() => setSearch('')}
                  className="hover:text-zinc-900 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            onClick={() => {
              setActiveTagFilter('ALL');
              setSearch('');
            }}
            className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:underline"
          >
            {t('notes.resetFilters')}
          </button>
        </div>
      )}

      {/* NOTES GRID */}
      {filteredNotes.length === 0 ? (
        <GlassCard variant="subtle" className="p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {search || activeTagFilter !== 'ALL' ? t('notes.noMatchingTitle') : t('notes.noNotesTitle')}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {search || activeTagFilter !== 'ALL'
              ? t('notes.adjustSearch')
              : t('notes.captureIdeas')}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {(search || activeTagFilter !== 'ALL') ? (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveTagFilter('ALL');
                  setSearch('');
                }}
              >
                {t('notes.clearFilters')}
              </GlassButton>
            ) : (
              <GlassButton size="sm" variant="primary" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" />
                {t('notes.createFirstNote')}
              </GlassButton>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const currentTag = (note.tag ||
              (note.category === 'study' ? 'Study' : 'Personal')) as NoteTag;
            const tagCfg = TAG_CONFIG[currentTag] || TAG_CONFIG.Personal;
            const TagIcon = tagCfg.icon;
            const isEditing = editingNoteId === note.id;

            return (
              <GlassCard
                key={note.id}
                variant="subtle"
                className={`p-5 flex flex-col justify-between transition-all duration-200 hover:border-black/20 dark:hover:border-white/20 ${
                  activeTagFilter === currentTag ? 'ring-1 ring-black/10 dark:ring-white/10' : ''
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        {t('notes.editingNote')}
                      </span>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                      placeholder={t('notes.noteTitle')}
                    />

                    {/* Tag Switcher in Edit Mode */}
                    <div className="grid grid-cols-3 gap-1">
                      {(['Personal', 'Work', 'Study'] as NoteTag[]).map((t) => {
                        const cfg = TAG_CONFIG[t];
                        const Icon = cfg.icon;
                        const isSel = editTag === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditTag(t)}
                            className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold transition-all ${
                              isSel
                                ? `${cfg.activeFilterClass}`
                                : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {t}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white leading-relaxed"
                      placeholder={t('notes.noteContentPlaceholder')}
                    />

                    <div className="flex justify-end gap-1.5 pt-1">
                      <GlassButton size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>
                        {t('notes.cancel')}
                      </GlassButton>
                      <GlassButton size="sm" variant="primary" onClick={() => saveEditing(note.id)}>
                        <Check className="w-3 h-3" />
                        {t('notes.saveChanges')}
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header with Tag Badge and Actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {/* Clickable Tag Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() =>
                            setActiveTagFilter(activeTagFilter === currentTag ? 'ALL' : currentTag)
                          }
                          title={`${t('notes.filterByPrefix')} ${tagLabel(currentTag)}`}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all hover:scale-105 ${tagCfg.badgeClass}`}
                        >
                          <TagIcon className="w-2.5 h-2.5" />
                          <span>{tagLabel(currentTag)}</span>
                        </button>

                        {/* Quick Tag Changer Menu */}
                        <div className="relative group inline-block">
                          <button
                            title={t('notes.changeTag')}
                            className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-60 group-hover:opacity-100 transition-opacity"
                          >
                            {t('notes.editTagLabel')}
                          </button>
                          <div className="hidden group-hover:flex absolute left-0 top-full z-20 mt-0.5 flex-col gap-1 p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-lg min-w-[100px]">
                            {(['Personal', 'Work', 'Study'] as NoteTag[]).map((t) => (
                              <button
                                key={t}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickChangeTag(note.id, t);
                                }}
                                className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-lg text-left transition-colors ${
                                  t === currentTag
                                    ? 'font-bold bg-black/5 dark:bg-white/5 text-zinc-950 dark:text-white'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                              >
                                {t === currentTag && <Check className="w-2.5 h-2.5" />}
                                <span>{tagLabel(t)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(note)}
                          className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-200 p-1 transition-colors"
                          title={t('notes.editNote')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 p-1 transition-colors"
                          title={t('notes.deleteNote')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2 leading-snug">
                      {note.title}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-6 leading-relaxed">
                      {note.content}
                    </p>

                    {/* AI Summary Block if generated */}
                    {aiSummary[note.id] && (
                      <div className="mt-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-xs text-zinc-800 dark:text-zinc-200">
                        <span className="font-bold flex items-center gap-1 text-zinc-900 dark:text-white text-[11px] mb-1">
                          <Sparkles className="w-3 h-3 text-purple-500" /> {t('notes.aiSummaryTitle')}
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">{aiSummary[note.id]}</p>
                      </div>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-400">
                      {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : t('notes.saved')}
                    </span>

                    <button
                      onClick={() => handleSummarize(note)}
                      disabled={loadingAiNoteId === note.id}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      {loadingAiNoteId === note.id
                        ? t('notes.summarizing')
                        : isPremium
                        ? t('notes.aiSummarize')
                        : t('notes.aiSummarizeLocked')}
                    </button>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
