import React, { useState } from 'react';
import { GlassButton, GlassCard, VedaLogo } from '../ui/LiquidGlass';
import { useLanguage } from '../../lib/LanguageContext';
import {
  AppState,
  ExamGoal,
  StudyDocument,
  StudyFlashcard,
  StudySubject,
  StudyTask,
} from '../../types';
import { getSubscriptionDetails } from '../../lib/subscription';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  FileText,
  Upload,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  MessageSquare,
  Lock,
  ArrowRight,
  Eye,
  Clock,
} from 'lucide-react';

interface StudyTabProps {
  state: AppState;
  onAddTask: (task: Omit<StudyTask, 'id' | 'createdAt'>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddSubject: (name: string) => void;
  onAddDocument: (doc: Omit<StudyDocument, 'id' | 'uploadedAt'>) => void;
  onDeleteDocument: (docId: string) => void;
  onAddExam: (exam: Omit<ExamGoal, 'id'>) => void;
  onAddFlashcard: (fc: Omit<StudyFlashcard, 'id' | 'createdAt'>) => void;
  onOpenFocus: () => void;
  onOpenPremium: () => void;
}

export function StudyTab({
  state,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddSubject,
  onAddDocument,
  onDeleteDocument,
  onAddExam,
  onAddFlashcard,
  onOpenFocus,
  onOpenPremium,
}: StudyTabProps) {
  const { t, language } = useLanguage();
  const [activeSection, setActiveSection] = useState<'tasks' | 'vault' | 'exam' | 'flashcards'>('tasks');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState(state.subjects[0]?.id || '');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  // New subject state
  const [newSubName, setNewSubName] = useState('');
  const [showAddSub, setShowAddSub] = useState(false);

  // New exam state
  const [showAddExam, setShowAddExam] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTopicsStr, setExamTopicsStr] = useState('');

  // Document AI modal state
  const [activeDocForAi, setActiveDocForAi] = useState<StudyDocument | null>(null);
  const [docQuestion, setDocQuestion] = useState('');
  const [docAiAnswer, setDocAiAnswer] = useState<string | null>(null);
  const [docAiLoading, setDocAiLoading] = useState(false);

  // AI Study Planner modal
  const [showAiPlanner, setShowAiPlanner] = useState(false);
  const [aiExamName, setAiExamName] = useState('');
  const [aiTargetDate, setAiTargetDate] = useState('');
  const [aiHoursPerDay, setAiHoursPerDay] = useState(3);
  const [aiPlanResult, setAiPlanResult] = useState<any>(null);
  const [aiPlannerLoading, setAiPlannerLoading] = useState(false);

  // Flashcards state
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardSubject, setCardSubject] = useState(state.subjects[0]?.id || 'sub_1');

  const sub = getSubscriptionDetails(state.profile);
  const isPremium = sub.isPremiumActive;

  // Task creation handler
  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask({
      subjectId: newTaskSubject || state.subjects[0]?.id || 'sub_1',
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      deadline: newTaskDeadline || undefined,
      completed: false,
    });
    setNewTaskTitle('');
    setNewTaskDeadline('');
  }

  // Document upload handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onAddDocument({
        subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : state.subjects[0]?.id || 'sub_1',
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        fileDataUrl: event.target?.result as string,
        extractedText: `Document: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nCoursework notes for ${state.subjects.find((s) => s.id === selectedSubjectId)?.name || 'General'}. Key definitions and core exam principles.`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // Ask Document AI
  async function handleAskDoc() {
    if (!activeDocForAi || !docQuestion.trim()) return;
    setDocAiLoading(true);
    setDocAiAnswer(null);

    try {
      const res = await fetch('/api/gemini/ask-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: activeDocForAi.name,
          documentText: activeDocForAi.extractedText || activeDocForAi.name,
          question: docQuestion,
          language,
        }),
      });
      const data = await res.json();
      setDocAiAnswer(data.answer || t('study.docAnalysisComplete'));
    } catch (_e) {
      setDocAiAnswer(t('study.docAnalysisError'));
    } finally {
      setDocAiLoading(false);
    }
  }

  // AI Study Plan Generator
  async function handleGenerateAiPlan() {
    if (!aiExamName.trim()) return;
    setAiPlannerLoading(true);
    try {
      const res = await fetch('/api/gemini/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName: aiExamName,
          targetDate: aiTargetDate,
          subjects: state.subjects.map((s) => s.name),
          hoursPerDay: aiHoursPerDay,
          language,
        }),
      });
      const data = await res.json();
      setAiPlanResult(data);
    } catch (_e) {
      // Fallback
    } finally {
      setAiPlannerLoading(false);
    }
  }

  const filteredTasks = state.tasks.filter((t) =>
    selectedSubjectId === 'all' ? true : t.subjectId === selectedSubjectId
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6" />
            {t('page.study.heading')}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('study.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPremium ? (
            <GlassButton
              variant="accent"
              size="sm"
              onClick={() => setShowAiPlanner(true)}
              className="text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('study.aiStudyPlanner')}
            </GlassButton>
          ) : (
            <GlassButton
              variant="glass"
              size="sm"
              onClick={onOpenPremium}
              className="text-xs border-dashed"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              {t('study.aiStudyPlannerLocked')}
            </GlassButton>
          )}

          <GlassButton
            variant="glass"
            size="sm"
            onClick={onOpenFocus}
            className="text-xs font-semibold"
          >
            {t('study.startFocus')}
          </GlassButton>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 overflow-x-auto">
        <button
          onClick={() => setActiveSection('tasks')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSection === 'tasks'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('study.studyTasksTab')} ({state.tasks.filter((tk) => !tk.completed).length})
        </button>
        <button
          onClick={() => setActiveSection('vault')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSection === 'vault'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('study.studyVaultTab')} ({state.documents.length})
        </button>
        <button
          onClick={() => setActiveSection('exam')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSection === 'exam'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('study.examModeTab')} ({state.exams.length})
        </button>
        <button
          onClick={() => setActiveSection('flashcards')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSection === 'flashcards'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('study.flashcardsTab')} ({state.flashcards.length})
        </button>
      </div>

      {/* SECTION 1: STUDY TASKS */}
      {activeSection === 'tasks' && (
        <div className="space-y-6">
          {/* Subject Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSubjectId('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedSubjectId === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {t('study.allSubjects')}
            </button>
            {state.subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSubjectId === sub.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {sub.name}
              </button>
            ))}

            {showAddSub ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder={t('study.subjectNamePlaceholder')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                />
                <GlassButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (newSubName.trim()) {
                      onAddSubject(newSubName.trim());
                      setNewSubName('');
                      setShowAddSub(false);
                    }
                  }}
                >
                  {t('study.save')}
                </GlassButton>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSub(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t('study.newSubject')}
              </button>
            )}
          </div>

          {/* New Task Entry Card */}
          <GlassCard variant="subtle" className="p-4 sm:p-5">
            <form onSubmit={handleCreateTask} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={t('study.taskPlaceholder')}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />

              <div className="flex items-center gap-2">
                <select
                  value={newTaskSubject}
                  onChange={(e) => setNewTaskSubject(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                >
                  {state.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                >
                  <option value="low">{t('study.priorityLow')}</option>
                  <option value="medium">{t('study.priorityMedium')}</option>
                  <option value="high">{t('study.priorityHigh')}</option>
                </select>

                <GlassButton type="submit" variant="primary" size="md" className="text-xs shrink-0">
                  <Plus className="w-3.5 h-3.5" /> {t('study.addTask')}
                </GlassButton>
              </div>
            </form>
          </GlassCard>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <GlassCard variant="subtle" className="p-12 text-center">
              <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('study.nothingPlanned')}</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t('study.addTasksDesc')}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const sub = state.subjects.find((s) => s.id === task.subjectId);
                return (
                  <GlassCard
                    key={task.id}
                    variant="subtle"
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0 cursor-pointer"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <span
                          className={`text-xs sm:text-sm font-semibold block truncate ${
                            task.completed
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                          <span>{sub?.name || t('home.general')}</span>
                          {task.deadline && (
                            <>
                              <span>•</span>
                              <span>{t('study.due')} {task.deadline}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.priority === 'high' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
                          {t('study.priorityHigh')}
                        </span>
                      )}
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={onOpenFocus}
                        title={t('study.startPomodoro')}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </GlassButton>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: STUDY VAULT */}
      {activeSection === 'vault' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('study.documentVault')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t('study.documentVaultDesc')}
              </p>
            </div>

            <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
              <Upload className="w-3.5 h-3.5" />
              {t('study.uploadDocument')}
              <input
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {state.documents.length === 0 ? (
            <GlassCard variant="subtle" className="p-12 text-center">
              <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {t('study.materialsHere')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t('study.materialsHereDesc')}
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.documents.map((doc) => {
                const sub = state.subjects.find((s) => s.id === doc.subjectId);
                const sizeKb = ((doc.sizeBytes || 0) / 1024).toFixed(1);
                return (
                  <GlassCard
                    key={doc.id}
                    variant="subtle"
                    className="p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-zinc-800 dark:text-zinc-200">
                          <FileText className="w-5 h-5" />
                        </div>
                        <button
                          onClick={() => onDeleteDocument(doc.id)}
                          className="text-zinc-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {sub?.name || t('home.general')} • {sizeKb} KB
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      {isPremium ? (
                        <GlassButton
                          variant="glass"
                          size="sm"
                          onClick={() => setActiveDocForAi(doc)}
                          className="text-[11px] gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {t('study.askDocAI')}
                        </GlassButton>
                      ) : (
                        <button
                          onClick={onOpenPremium}
                          className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          {t('study.askDocAILocked')}
                        </button>
                      )}

                      {doc.fileDataUrl && (
                        <a
                          href={doc.fileDataUrl}
                          download={doc.name}
                          className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline"
                        >
                          {t('study.download')}
                        </a>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: EXAM MODE */}
      {activeSection === 'exam' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('study.examCountdowns')}</h3>
              <p className="text-xs text-zinc-400">
                {t('study.examCountdownsDesc')}
              </p>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setShowAddExam(!showAddExam)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('study.newExamTarget')}
            </GlassButton>
          </div>

          {showAddExam && (
            <GlassCard variant="subtle" className="p-5">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-3">
                {t('study.configureExam')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.examTitle')}
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder={t('study.examTitlePlaceholder')}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.examDate')}
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  {t('study.topicsLabel')}
                </label>
                <input
                  type="text"
                  value={examTopicsStr}
                  onChange={(e) => setExamTopicsStr(e.target.value)}
                  placeholder={t('study.topicsPlaceholder')}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
                />
              </div>
              <div className="flex justify-end gap-2">
                <GlassButton size="sm" variant="ghost" onClick={() => setShowAddExam(false)}>
                  {t('study.cancel')}
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (examTitle.trim() && examDate) {
                      const topics = examTopicsStr
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean);
                      onAddExam({
                        subjectId: state.subjects[0]?.id || 'sub_1',
                        title: examTitle.trim(),
                        examDate,
                        topics,
                        dailyStudyMinutes: 90,
                        completedTopics: [],
                      });
                      setExamTitle('');
                      setExamDate('');
                      setExamTopicsStr('');
                      setShowAddExam(false);
                    }
                  }}
                >
                  {t('study.saveExam')}
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {state.exams.length === 0 ? (
            <GlassCard variant="subtle" className="p-12 text-center">
              <Calendar className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {t('study.noExamTargets')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t('study.noExamTargetsDesc')}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {state.exams.map((ex) => {
                const target = new Date(ex.examDate).getTime();
                const now = new Date().getTime();
                const daysLeft = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
                return (
                  <GlassCard key={ex.id} variant="elevated" className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                          {ex.title}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">{t('study.targetDate')} {ex.examDate}</p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold text-center">
                        {daysLeft} {t('study.daysRemaining')}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        {t('study.keyTopicsChecklist')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ex.topics.map((top, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                          >
                            <Circle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{top}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: FLASHCARDS */}
      {activeSection === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('study.studyFlashcards')}</h3>
              <p className="text-xs text-zinc-400">
                {t('study.flashcardsDesc')}
              </p>
            </div>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setShowAddCard(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('study.newCard')}
            </GlassButton>
          </div>

          {/* New Flashcard Form Modal/Card */}
          {showAddCard && (
            <GlassCard variant="elevated" className="p-4 sm:p-5 border border-zinc-300 dark:border-zinc-700 animate-fadeIn">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
                {t('study.createFlashcard')}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.subject')}
                  </label>
                  <select
                    value={cardSubject}
                    onChange={(e) => setCardSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                  >
                    {state.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.frontPrompt')}
                  </label>
                  <input
                    type="text"
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    placeholder={t('study.frontPlaceholder')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.backAnswer')}
                  </label>
                  <textarea
                    rows={2}
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder={t('study.backPlaceholder')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddCard(false);
                      setCardFront('');
                      setCardBack('');
                    }}
                  >
                    {t('study.cancel')}
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="primary"
                    disabled={!cardFront.trim() || !cardBack.trim()}
                    onClick={() => {
                      if (cardFront.trim() && cardBack.trim()) {
                        onAddFlashcard({
                          subjectId: cardSubject || state.subjects[0]?.id || 'sub_1',
                          front: cardFront.trim(),
                          back: cardBack.trim(),
                          mastered: false,
                        });
                        setCardFront('');
                        setCardBack('');
                        setShowAddCard(false);
                      }
                    }}
                  >
                    {t('study.saveCard')}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          )}

          {state.flashcards.length === 0 ? (
            <GlassCard variant="subtle" className="p-12 text-center">
              <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {t('study.noFlashcards')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t('study.noFlashcardsDesc')}
              </p>
            </GlassCard>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full h-64 p-6 rounded-2xl bg-white/85 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-xl flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:scale-[1.01]"
              >
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  {isFlipped ? t('study.answerFlip') : t('study.questionFlip')}
                </span>
                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white px-4 leading-relaxed">
                  {isFlipped
                    ? state.flashcards[activeCardIndex]?.back
                    : state.flashcards[activeCardIndex]?.front}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <GlassButton
                  size="sm"
                  variant="glass"
                  disabled={activeCardIndex === 0}
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveCardIndex((prev) => Math.max(0, prev - 1));
                  }}
                >
                  {t('study.previous')}
                </GlassButton>
                <span className="text-xs text-zinc-400 font-medium">
                  {activeCardIndex + 1} {t('study.ofWord')} {state.flashcards.length}
                </span>
                <GlassButton
                  size="sm"
                  variant="glass"
                  disabled={activeCardIndex === state.flashcards.length - 1}
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveCardIndex((prev) => Math.min(state.flashcards.length - 1, prev + 1));
                  }}
                >
                  {t('study.next')}
                </GlassButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ASK DOCUMENT AI */}
      {activeDocForAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/70 backdrop-blur-md">
          <GlassCard
            variant="elevated"
            className="w-full max-w-lg p-6 relative border border-black/10 dark:border-white/15"
          >
            <button
              onClick={() => setActiveDocForAi(null)}
              className="absolute top-5 right-5 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <Trash2 className="hidden" /> ✕
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {t('study.documentAiPrefix')} {activeDocForAi.name}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {t('study.askGrounded')}
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={docQuestion}
                onChange={(e) => setDocQuestion(e.target.value)}
                placeholder={t('study.docQuestionPlaceholder')}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
              />
              <GlassButton
                variant="primary"
                size="sm"
                disabled={docAiLoading || !docQuestion.trim()}
                onClick={handleAskDoc}
                className="w-full"
              >
                {docAiLoading ? t('study.analyzingDoc') : t('study.generateAnswer')}
              </GlassButton>

              {docAiAnswer && (
                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] text-xs text-zinc-800 dark:text-zinc-200 max-h-48 overflow-y-auto leading-relaxed border border-black/5 dark:border-white/5">
                  <p className="whitespace-pre-wrap">{docAiAnswer}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* MODAL: AI STUDY PLANNER */}
      {showAiPlanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/70 backdrop-blur-md">
          <GlassCard
            variant="elevated"
            className="w-full max-w-lg p-6 relative border border-black/10 dark:border-white/15 max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={() => setShowAiPlanner(false)}
              className="absolute top-5 right-5 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {t('study.aiStudyExamPlanner')}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {t('study.enterExamDetails')}
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  {t('study.examTargetName')}
                </label>
                <input
                  type="text"
                  value={aiExamName}
                  onChange={(e) => setAiExamName(e.target.value)}
                  placeholder={t('study.examTargetPlaceholder')}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.examDate')}
                  </label>
                  <input
                    type="date"
                    value={aiTargetDate}
                    onChange={(e) => setAiTargetDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    {t('study.dailyHours')}
                  </label>
                  <input
                    type="number"
                    value={aiHoursPerDay}
                    onChange={(e) => setAiHoursPerDay(Number(e.target.value))}
                    min={1}
                    max={12}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10"
                  />
                </div>
              </div>

              <GlassButton
                variant="primary"
                size="md"
                disabled={aiPlannerLoading || !aiExamName.trim()}
                onClick={handleGenerateAiPlan}
                className="w-full text-xs"
              >
                {aiPlannerLoading ? t('study.buildingPlan') : t('study.generateSchedule')}
              </GlassButton>
            </div>

            {aiPlanResult && (
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">
                    {aiPlanResult.summary}
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {t('study.recommendedWorkload')} {aiPlanResult.dailyWorkload}
                  </p>
                </div>

                {aiPlanResult.milestones && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {t('study.phases')}
                    </p>
                    {aiPlanResult.milestones.map((m: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                        <span className="font-bold block text-[11px] text-zinc-900 dark:text-white">
                          {m.phase} ({m.duration})
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {m.topics?.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {aiPlanResult.suggestedTasks && (
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      aiPlanResult.suggestedTasks.forEach((st: any) => {
                        onAddTask({
                          subjectId: state.subjects[0]?.id || 'sub_1',
                          title: st.title,
                          priority: st.priority || 'medium',
                          completed: false,
                        });
                      });
                      setShowAiPlanner(false);
                      setAiPlanResult(null);
                    }}
                    className="w-full text-xs mt-2"
                  >
                    {t('study.addPlanTasks')}
                  </GlassButton>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
