import { jsPDF } from 'jspdf';
import { AppState } from '../types';

export function generateWeeklyReportPDF(state: AppState): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Calculate actual statistics from user's data (no hardcoded fixed dummies)
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Prayer statistics
  const prayerDates = Object.keys(state.prayerLogs);
  let totalPrayersLogged = 0;
  let totalPrayersCompleted = 0;
  const prayerCounts = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

  prayerDates.forEach((d) => {
    const dayPrayers = state.prayerLogs[d];
    if (dayPrayers) {
      (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).forEach((p) => {
        totalPrayersLogged++;
        if (dayPrayers[p]) {
          totalPrayersCompleted++;
          prayerCounts[p]++;
        }
      });
    }
  });

  const prayerRate = totalPrayersLogged > 0
    ? Math.round((totalPrayersCompleted / totalPrayersLogged) * 100)
    : 0;

  // Study statistics
  const completedTasks = state.tasks.filter((t) => t.completed).length;
  const totalTasks = state.tasks.length;
  const studyTaskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Focus statistics
  const totalFocusMinutes = state.focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);
  const completedFocusSessions = state.focusSessions.filter((s) => s.completed).length;

  // Finance statistics
  const totalSpent = (state.expenses || []).reduce((acc, e) => acc + e.amount, 0);
  const currency = state.profile?.preferences?.currency || 'USD';
  const budget = state.monthlyBudget || state.profile?.preferences?.monthlyBudget || 0;
  const budgetUsedPct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  // Habits statistics
  const totalHabits = (state.habits || []).length;
  const activeHabitsCount = (state.habits || []).filter((h) => ((h.streak ?? h.streakCount) || 0) > 0).length;

  // Dynamic Productivity Score (0-100)
  let scorePoints = 0;
  let maxPoints = 0;

  if (totalPrayersLogged > 0) {
    scorePoints += prayerRate * 0.35;
    maxPoints += 35;
  }
  if (totalTasks > 0) {
    scorePoints += studyTaskRate * 0.25;
    maxPoints += 25;
  }
  if (totalFocusMinutes > 0) {
    scorePoints += Math.min(100, (totalFocusMinutes / 120) * 100) * 0.25;
    maxPoints += 25;
  }
  if (totalHabits > 0) {
    scorePoints += (activeHabitsCount / totalHabits) * 100 * 0.15;
    maxPoints += 15;
  }

  const overallScore = maxPoints > 0 ? Math.round((scorePoints / maxPoints) * 100) : 100;

  // ----------------------------------------------------
  // DRAW PDF LAYOUT (Liquid Monochrome Luxury)
  // ----------------------------------------------------
  let y = margin;

  // Header Background Card
  doc.setFillColor(18, 18, 20); // Near black (#121214)
  doc.roundedRect(margin, y, contentWidth, 34, 4, 4, 'F');

  // Veda Official 3-Pill Vector Logo
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.4);
  const logoX = margin + 12;
  const logoY = y + 17;
  // Left diagonal bar
  doc.line(logoX - 4.5, logoY - 5, logoX - 1.2, logoY + 2.5);
  // Right diagonal bar
  doc.line(logoX + 4.5, logoY - 5, logoX + 1.2, logoY + 2);
  // Bottom horizontal bar
  doc.line(logoX - 2.5, logoY + 6, logoX + 3.0, logoY + 5);

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VEDA', logoX + 10, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('EXECUTIVE PERFORMANCE & LIFE INTELLIGENCE REPORT', logoX + 10, y + 20);

  // Badge: PREMIUM VERIFIED
  doc.setFillColor(35, 35, 40);
  doc.roundedRect(pageWidth - margin - 42, y + 8, 34, 7, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(230, 230, 230);
  doc.text('★ PREMIUM VERIFIED', pageWidth - margin - 40, y + 13);

  // Date and User
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text(
    `User: ${state.profile.fullName || 'Member'} (${state.profile.email || 'guest'})`,
    pageWidth - margin - 42,
    y + 22
  );
  doc.text(`Generated: ${dateStr}`, pageWidth - margin - 42, y + 27);

  y += 40;

  // ----------------------------------------------------
  // 4 TOP METRIC CARDS
  // ----------------------------------------------------
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 22;

  const metrics = [
    { label: 'WEEKLY SCORE', val: `${overallScore}%`, sub: 'Integrated Discipline' },
    { label: 'PRAYER RATIO', val: `${prayerRate}%`, sub: `${totalPrayersCompleted} Obligatory` },
    { label: 'FOCUS WORK', val: `${totalFocusHours}h`, sub: `${completedFocusSessions} Sessions` },
    { label: 'TOTAL EXPENSE', val: `${currency} ${totalSpent.toFixed(0)}`, sub: `${state.expenses.length} Entries` },
  ];

  metrics.forEach((m, idx) => {
    const cx = margin + idx * (cardWidth + 3);
    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(225, 225, 230);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 110, 115);
    doc.text(m.label, cx + 4, y + 6);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 25);
    doc.text(m.val, cx + 4, y + 14);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 145);
    doc.text(m.sub, cx + 4, y + 19);
  });

  y += 28;

  // ----------------------------------------------------
  // SECTION 1: ISLAMIC WORSHIP & PRAYER DISCIPLINE
  // ----------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 25);
  doc.text('1. Islamic Worship & Prayer Consistency', margin, y);
  y += 4;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(225, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  const prayerCols = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const colW = contentWidth / 5;

  prayerCols.forEach((p, idx) => {
    const px = margin + idx * colW;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 75);
    doc.text(p, px + 6, y + 7);

    const count = prayerCounts[p as keyof typeof prayerCounts];
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 25);
    doc.text(`${count} days`, px + 6, y + 14);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 125);
    doc.text('Completed on time', px + 6, y + 19);
  });

  // Quran & Tasbih Summary inside Islamic Section
  doc.setDrawColor(230, 230, 235);
  doc.line(margin + 4, y + 23, margin + contentWidth - 4, y + 23);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 95);
  const quranText = state.quranLastRead
    ? `Quran Bookmark: Surah ${state.quranLastRead.surah}, Ayah ${state.quranLastRead.ayah}`
    : 'Quran Reading: Active Khatmah in progress';
  const tasbihText = `Digital Tasbih: ${state.tasbihCount} Dhikr completed (Goal: ${state.tasbihGoal})`;
  doc.text(`• ${quranText}    • ${tasbihText}`, margin + 6, y + 28);

  y += 38;

  // ----------------------------------------------------
  // SECTION 2: ACADEMICS, STUDY VAULT & EXAMS
  // ----------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 25);
  doc.text('2. Academic Progress, Study Vault & Exams', margin, y);
  y += 4;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(225, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  const studyStats = [
    { label: 'Active Subjects', val: `${state.subjects.length}` },
    { label: 'Completed Tasks', val: `${completedTasks} / ${totalTasks} (${studyTaskRate}%)` },
    { label: 'Vault Documents', val: `${state.documents.length} Files` },
    { label: 'Flashcards Mastered', val: `${state.flashcards.filter((f) => f.mastered).length} / ${state.flashcards.length}` },
  ];

  const sColW = contentWidth / 4;
  studyStats.forEach((st, idx) => {
    const sx = margin + idx * sColW;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 110, 115);
    doc.text(st.label, sx + 5, y + 7);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 25);
    doc.text(st.val, sx + 5, y + 15);
  });

  // Exam Countdown preview
  const nextExam = state.exams[0];
  doc.setDrawColor(230, 230, 235);
  doc.line(margin + 4, y + 20, margin + contentWidth - 4, y + 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 95);
  const examText = nextExam
    ? `Upcoming Exam: "${nextExam.title}" on ${nextExam.examDate} (${nextExam.topics.length} topics outlined)`
    : 'No immediate exam deadline configured. Continue steady daily revision.';
  doc.text(`• ${examText}`, margin + 6, y + 26);

  y += 36;

  // ----------------------------------------------------
  // SECTION 3: DEEP WORK & POMODORO SESSIONS
  // ----------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 25);
  doc.text('3. Deep Work & Focus Session Analysis', margin, y);
  y += 4;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(225, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  const avgSession = completedFocusSessions > 0 ? Math.round(totalFocusMinutes / completedFocusSessions) : 25;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 25);
  doc.text(`Total Focus Duration: ${totalFocusHours} hours (${totalFocusMinutes} minutes)`, margin + 6, y + 7);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 105);
  doc.text(
    `Completed ${completedFocusSessions} structured deep-work intervals with an average duration of ${avgSession} minutes.`,
    margin + 6,
    y + 13
  );
  doc.text(
    `Recommendation: Maintain your highest focus periods during the morning hours prior to Dhuhr for optimal cognitive output.`,
    margin + 6,
    y + 19
  );

  y += 30;

  // ----------------------------------------------------
  // SECTION 4: FINANCIAL HEALTH & EXPENSE BREAKDOWN
  // ----------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 25);
  doc.text('4. Financial Health & Expense Distribution', margin, y);
  y += 4;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(225, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 25);
  doc.text(
    `Recorded Spending: ${currency} ${totalSpent.toFixed(2)}  |  Monthly Budget: ${currency} ${budget.toFixed(2)} (${budgetUsedPct}% utilized)`,
    margin + 6,
    y + 7
  );

  // Group by category
  const catTotals: Record<string, number> = {};
  state.expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
  });
  const catSummary = Object.entries(catTotals)
    .map(([cat, amt]) => `${cat}: ${currency}${amt.toFixed(0)}`)
    .join('  •  ') || 'No expenses logged this period.';

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 95);
  doc.text(`Categories: ${catSummary}`, margin + 6, y + 14);

  const savingsTotal = state.savingsGoals.reduce((a, s) => a + s.currentAmount, 0);
  doc.text(
    `Savings Goals: Total accumulated ${currency} ${savingsTotal.toFixed(0)} across ${state.savingsGoals.length} active targets.`,
    margin + 6,
    y + 21
  );

  y += 34;

  // ----------------------------------------------------
  // SECTION 5: AI EXECUTIVE OBSERVATIONS & DIRECTIVES
  // ----------------------------------------------------
  doc.setFillColor(20, 20, 25);
  doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('★ VEDA AI STRATEGIC WEEKLY DIRECTIVES', margin + 6, y + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 225);

  const bullet1 = `• Faith Rhythm: Continue anchoring your day around the 5 daily prayers; Fajr and Asr provide natural cognitive boundaries.`;
  const bullet2 = `• Deep Work: Pair complex academic tasks directly with 25-minute Pomodoro focus blocks to minimize distraction.`;
  const bullet3 = `• Financial Peace: Review discretionary expenditures weekly to ensure your savings trajectory remains on schedule.`;
  const bullet4 = `• Harmony: Celebrate your consistency and strive for continuous, gentle progress rather than perfection.`;

  doc.text(bullet1, margin + 6, y + 15);
  doc.text(bullet2, margin + 6, y + 21);
  doc.text(bullet3, margin + 6, y + 27);
  doc.text(bullet4, margin + 6, y + 33);

  // ----------------------------------------------------
  // FOOTER
  // ----------------------------------------------------
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 165);
  doc.text('Veda Intelligence — Private & Confidential — Page 1 of 1', margin, pageHeight - 8);
  doc.text('https://veda.app', pageWidth - margin - 22, pageHeight - 8);

  return doc;
}

export function getWeeklyReportStatus(lastGeneratedAt?: string): {
  canGenerate: boolean;
  lastGeneratedDateFormatted?: string;
  nextAvailableDateFormatted: string;
  daysRemaining: number;
  isCurrentWeek: boolean;
} {
  if (!lastGeneratedAt) {
    return {
      canGenerate: true,
      nextAvailableDateFormatted: 'Now',
      daysRemaining: 0,
      isCurrentWeek: false,
    };
  }

  const lastDate = new Date(lastGeneratedAt);
  const now = new Date();

  if (isNaN(lastDate.getTime())) {
    return {
      canGenerate: true,
      nextAvailableDateFormatted: 'Now',
      daysRemaining: 0,
      isCurrentWeek: false,
    };
  }

  // Calculate start of current week (Monday 00:00:00)
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const distToMonday = (currentDay + 6) % 7; // 0 for Monday, 1 for Tue, ..., 6 for Sun

  const currentWeekMonday = new Date(now);
  currentWeekMonday.setDate(now.getDate() - distToMonday);
  currentWeekMonday.setHours(0, 0, 0, 0);

  // Next week's Monday 00:00:00
  const nextWeekMonday = new Date(currentWeekMonday);
  nextWeekMonday.setDate(currentWeekMonday.getDate() + 7);
  nextWeekMonday.setHours(0, 0, 0, 0);

  // If last generated time is on or after this week's Monday, user has already generated for this week
  const isCurrentWeek = lastDate.getTime() >= currentWeekMonday.getTime();

  // Days remaining until next Monday
  const msRemaining = Math.max(0, nextWeekMonday.getTime() - now.getTime());
  const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const lastGeneratedDateFormatted = lastDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const nextAvailableDateFormatted = nextWeekMonday.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return {
    canGenerate: !isCurrentWeek,
    lastGeneratedDateFormatted,
    nextAvailableDateFormatted,
    daysRemaining,
    isCurrentWeek,
  };
}

export function downloadWeeklyReportPDF(state: AppState) {
  const doc = generateWeeklyReportPDF(state);
  const fileName = `Veda_Weekly_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
