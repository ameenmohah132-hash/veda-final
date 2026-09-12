import { useState, useEffect } from 'react';
import { GlassButton, GlassCard } from '../ui/LiquidGlass';
import { useLanguage } from '../../lib/LanguageContext';
import { QuranMushafReader } from '../QuranMushafReader';
import { AppState, PrayerName } from '../../types';
import {
  calculatePrayerTimes,
  calculateQibla,
  ADHKAR_COLLECTION,
} from '../../lib/islamic';
import { sound } from '../../lib/audio';
import {
  Compass,
  CheckCircle2,
  Circle,
  Sparkles,
  MapPin,
  RotateCw,
  Sun,
  Moon,
} from 'lucide-react';

interface IslamicTabProps {
  state: AppState;
  onTogglePrayer: (date: string, prayer: PrayerName) => void;
  onUpdateCoordinates: (coords: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  }) => void;
  onOpenReport: () => void;
  onOpenPremium: () => void;
  onOpenAskVeda: () => void;
  onUpdateQuranProgress: (page: number, totalPages: number) => void;
}

export function IslamicTab({
  state,
  onTogglePrayer,
  onUpdateCoordinates,
  onOpenReport,
  onOpenPremium,
  onOpenAskVeda,
  onUpdateQuranProgress,
}: IslamicTabProps) {
  const { t } = useLanguage();

  function prayerLabel(name: PrayerName): string {
    return t(`islamic.prayer.${name}`);
  }
  const [activeSubTab, setActiveSubTab] = useState<'prayers' | 'qibla' | 'quran' | 'tasbih' | 'adhkar'>('prayers');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  // Digital Tasbih State
  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihTarget, setTasbihTarget] = useState(33);
  const [selectedZikr, setSelectedZikr] = useState('SubhanAllah (سُبْحَانَ اللَّهِ)');

  // Quran Reader State

  // Adhkar State
  const [adhkarMode, setAdhkarMode] = useState<'morning' | 'evening'>('morning');
  const [adhkarCounts, setAdhkarCounts] = useState<{ [id: string]: number }>({});

  const todayDateStr = currentTime.toISOString().split('T')[0];

  // Tick clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Device orientation for Qibla Compass
  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      const e = event as any;
      if (e.webkitCompassHeading !== undefined) {
        setDeviceHeading(e.webkitCompassHeading);
      } else if (event.alpha !== null) {
        setDeviceHeading(360 - event.alpha);
      }
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  const coords = state.profile.location || {
    latitude: 3.139,
    longitude: 101.6869,
    city: 'Kuala Lumpur',
    country: 'Malaysia',
  };

  const prayerData = calculatePrayerTimes(
    currentTime,
    coords,
    state.profile.preferences.prayerCalculationMethod,
    state.profile.preferences.asrJuristic?.toLowerCase() === 'hanafi' ? 'hanafi' : 'standard'
  );

  const qiblaData = calculateQibla(coords);

  const todayPrayers = state.prayerLogs[todayDateStr] || {
    Fajr: false,
    Sunrise: false,
    Dhuhr: false,
    Asr: false,
    Maghrib: false,
    Isha: false,
  };

  const prayersList: { name: PrayerName; time: string }[] = [
    { name: 'Fajr', time: prayerData.fajr },
    { name: 'Sunrise', time: prayerData.sunrise },
    { name: 'Dhuhr', time: prayerData.dhuhr },
    { name: 'Asr', time: prayerData.asr },
    { name: 'Maghrib', time: prayerData.maghrib },
    { name: 'Isha', time: prayerData.isha },
  ];

  function handleRequestLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onUpdateCoordinates({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            city: 'Current Location',
            country: '',
          });
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
        }
      );
    }
  }

  function handleTasbihTap() {
    sound.playClick();
    const next = tasbihCount + 1;
    if (next === tasbihTarget) {
      sound.playChime();
    }
    setTasbihCount(next);
  }

  function handleAdhkarCount(id: string, maxCount: number) {
    sound.playClick();
    setAdhkarCounts((prev) => {
      const current = prev[id] || 0;
      const next = current + 1;
      if (next >= maxCount) {
        sound.playChime();
      }
      return { ...prev, [id]: next };
    });
  }

  const activeAdhkarList = ADHKAR_COLLECTION.filter((a) => a.category === adhkarMode);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header with Hijri Date & Live Location */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
              <Compass className="w-6 h-6" />
              {t('page.islamic.title')}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
              {t('islamic.astronomicalPrecision')}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <span className="font-semibold text-zinc-900 dark:text-white">
              {prayerData.hijriDate.formatted}
            </span>
            <span>•</span>
            <button
              onClick={handleRequestLocation}
              className="inline-flex items-center gap-1 hover:underline text-zinc-600 dark:text-zinc-300"
              title={t('islamic.calibrateGps')}
            >
              <MapPin className="w-3.5 h-3.5" />
              {coords.city} ({coords.latitude.toFixed(2)}°, {coords.longitude.toFixed(2)}°)
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            variant="glass"
            size="sm"
            onClick={onOpenReport}
            className="text-xs font-semibold"
          >
            {t('finance.weeklyReport')}
          </GlassButton>
          <GlassButton
            variant="accent"
            size="sm"
            onClick={onOpenAskVeda}
            className="text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('islamic.askFaithVeda')}
          </GlassButton>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('prayers')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'prayers'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('islamic.prayerTimesTab')}
        </button>
        <button
          onClick={() => setActiveSubTab('qibla')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'qibla'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('islamic.qiblaDirectionTab')}
        </button>
        <button
          onClick={() => setActiveSubTab('quran')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'quran'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('islamic.quranReaderTab')}
        </button>
        <button
          onClick={() => setActiveSubTab('tasbih')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'tasbih'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('islamic.digitalTasbihTab')}
        </button>
        <button
          onClick={() => setActiveSubTab('adhkar')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'adhkar'
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          {t('islamic.adhkarTab')}
        </button>
      </div>

      {/* SUBTAB 1: PRAYER TIMES */}
      {activeSubTab === 'prayers' && (
        <div className="space-y-6">
          {/* Next Prayer Live Banner */}
          <GlassCard
            variant="elevated"
            className="p-6 relative overflow-hidden border border-black/10 dark:border-white/15"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  {t('islamic.upcomingPrayer')}
                </span>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white">
                    {prayerLabel(prayerData.nextPrayer as PrayerName)}
                  </h2>
                  <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {t('islamic.at')} {prayerData.nextPrayerTime}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                  {t('islamic.startsIn')}
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {prayerData.timeRemaining}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Prayer Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {prayersList.map(({ name, time }) => {
              const isNext = prayerData.nextPrayer === name;
              const isSunrise = name === 'Sunrise';
              const isChecked = !!todayPrayers[name];

              return (
                <GlassCard
                  key={name}
                  variant={isNext ? 'elevated' : 'subtle'}
                  className={`p-4 flex flex-col justify-between transition-all select-none ${
                    isNext
                      ? 'border-black/20 dark:border-white/30 ring-1 ring-black/10 dark:ring-white/15'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{prayerLabel(name)}</h4>
                      {isSunrise ? (
                        <span className="text-[11px] text-zinc-400 font-semibold">{t('islamic.duhaWindow')}</span>
                      ) : isNext ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {t('islamic.next')}
                        </span>
                      ) : null}
                    </div>

                    {!isSunrise && (
                      <button
                        onClick={() => onTogglePrayer(todayDateStr, name)}
                        className="text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                    <span className="text-base font-bold text-zinc-900 dark:text-white tabular-nums">
                      {time}
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Calculation Info and GPS Calibrator */}
          <GlassCard variant="subtle" className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-white">{t('islamic.methodLabel')} </span>
              {state.profile.preferences.prayerCalculationMethod || 'Muslim World League'} •{' '}
              {state.profile.preferences.asrJuristic === 'Hanafi' ? t('islamic.hanafiAsr') : t('islamic.standardAsr')}
            </div>

            <GlassButton
              variant="glass"
              size="sm"
              onClick={handleRequestLocation}
              className="text-xs shrink-0 gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              {t('islamic.recalibrate')}
            </GlassButton>
          </GlassCard>
        </div>
      )}

      {/* SUBTAB 2: QIBLA COMPASS */}
      {activeSubTab === 'qibla' && (
        <div className="max-w-xl mx-auto space-y-6 text-center">
          <GlassCard variant="elevated" className="p-6 sm:p-8">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {t('islamic.qiblaDirectionTitle')}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t('islamic.exactBearing')} {qiblaData.bearingDegrees}° {qiblaData.compassDirection} {t('islamic.fromGps')}
              </p>
            </div>

            {/* Compass Dial */}
            <div className="relative w-64 h-64 mx-auto flex items-center justify-center my-6">
              <div
                className="w-full h-full rounded-full border-2 border-black/10 dark:border-white/20 relative transition-transform duration-300 ease-out"
                style={{
                  transform: deviceHeading !== null ? `rotate(${-deviceHeading}deg)` : 'none',
                }}
              >
                {/* Cardinal Points */}
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-extrabold text-red-500">
                  N
                </span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-zinc-400">
                  S
                </span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  E
                </span>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  W
                </span>

                {/* Degree tick markers */}
                <div className="absolute inset-4 rounded-full border border-dashed border-black/5 dark:border-white/10" />

                {/* Qibla Needle Pointer */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
                  style={{
                    transform: `rotate(${qiblaData.bearingDegrees}deg)`,
                  }}
                >
                  <div className="flex flex-col items-center h-full justify-between py-4">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex flex-col items-center justify-center shadow-lg border border-amber-400">
                      <span className="text-[11px] font-black text-amber-400">كعبة</span>
                    </div>
                    <div className="w-1.5 h-16 bg-zinc-900 dark:bg-white rounded-full shadow-md" />
                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Center point */}
              <div className="absolute w-4 h-4 rounded-full bg-zinc-950 dark:bg-white border-2 border-white dark:border-zinc-950 shadow-md" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-4 border-t border-black/5 dark:border-white/5">
              <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                <span className="text-zinc-400 block text-[11px] uppercase font-semibold">
                  {t('islamic.bearing')}
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-white">
                  {qiblaData.bearingDegrees}° {qiblaData.compassDirection}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                <span className="text-zinc-400 block text-[11px] uppercase font-semibold">
                  {t('islamic.distanceToKaaba')}
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-white">
                  {qiblaData.distanceKm} km ({qiblaData.distanceMiles} mi)
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* SUBTAB 3: QURAN READER */}
      {activeSubTab === 'quran' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{t('islamic.mushafTitle')}</h3>
              <p className="text-[11px] text-zinc-400">
                {t('islamic.mushafSubtitle')}
              </p>
            </div>
            {state.quranLastRead?.page && state.quranLastRead.page > 1 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-900/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                {t('islamic.lastRead')} {state.quranLastRead.page}
              </span>
            )}
          </div>

          <QuranMushafReader
            initialPage={state.quranLastRead?.page || 1}
            onProgressChange={onUpdateQuranProgress}
          />
        </div>
      )}

      {/* SUBTAB 4: DIGITAL TASBIH */}
      {activeSubTab === 'tasbih' && (
        <div className="max-w-md mx-auto space-y-6 text-center">
          <GlassCard variant="elevated" className="p-6 sm:p-8">
            <div className="mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">{t('islamic.tasbihCounterTitle')}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{t('islamic.mindfulRemembrance')}</p>
            </div>

            {/* Zikr Preset Selector */}
            <div className="mb-6 text-left">
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                {t('islamic.selectedDhikr')}
              </label>
              <select
                value={selectedZikr}
                onChange={(e) => setSelectedZikr(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white"
              >
                <option value="SubhanAllah (سُبْحَانَ اللَّهِ)">SubhanAllah (سُبْحَانَ اللَّهِ)</option>
                <option value="Alhamdulillah (الْحَمْدُ لِلَّهِ)">Alhamdulillah (الْحَمْدُ لِلَّهِ)</option>
                <option value="Allahu Akbar (اللَّهُ أَكْبَرُ)">Allahu Akbar (اللَّهُ أَكْبَرُ)</option>
                <option value="Astaghfirullah (أَسْتَغْفِرُ اللَّهَ)">Astaghfirullah (أَسْتَغْفِرُ اللَّهَ)</option>
                <option value="La ilaha illallah (لَا إِلَٰهَ إِلَّا اللَّهُ)">La ilaha illallah (لَا إِلَٰهَ إِلَّا اللَّهُ)</option>
              </select>
            </div>

            {/* Tap Circle */}
            <button
              onClick={handleTasbihTap}
              className="w-48 h-48 mx-auto rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all select-none border-4 border-black/10 dark:border-white/20"
            >
              <span className="text-5xl font-extrabold tracking-tighter tabular-nums">
                {tasbihCount}
              </span>
              <span className="text-[11px] uppercase font-bold tracking-widest mt-1 opacity-70">
                {t('islamic.targetLabel')} {tasbihTarget}
              </span>
            </button>

            {/* Target & Reset Controls */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[33, 99, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setTasbihTarget(val);
                    setTasbihCount(0);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    tasbihTarget === val
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {val} {t('islamic.targetSuffix')}
                </button>
              ))}

              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setTasbihCount(0)}
                className="text-xs text-zinc-500"
              >
                {t('islamic.reset')}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* SUBTAB 5: MORNING & EVENING ADHKAR */}
      {activeSubTab === 'adhkar' && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setAdhkarMode('morning')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                adhkarMode === 'morning'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                  : 'bg-black/5 dark:bg-white/5 text-zinc-500'
              }`}
            >
              <Sun className="w-4 h-4" />
              {t('islamic.morningAdhkar')}
            </button>
            <button
              onClick={() => setAdhkarMode('evening')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                adhkarMode === 'evening'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                  : 'bg-black/5 dark:bg-white/5 text-zinc-500'
              }`}
            >
              <Moon className="w-4 h-4" />
              {t('islamic.eveningAdhkar')}
            </button>
          </div>

          <div className="space-y-4">
            {activeAdhkarList.map((item) => {
              const current = adhkarCounts[item.id] || 0;
              const isDone = current >= item.targetCount;

              return (
                <GlassCard key={item.id} variant="elevated" className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {item.reference}
                    </span>
                    <button
                      onClick={() => handleAdhkarCount(item.id, item.targetCount)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t('islamic.done')}
                        </>
                      ) : (
                        `${t('islamic.countLabel')} ${current} / ${item.targetCount}`
                      )}
                    </button>
                  </div>

                  <p className="text-right text-lg sm:text-xl font-serif text-zinc-900 dark:text-white leading-relaxed">
                    {item.arabic}
                  </p>

                  <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-300">
                    <p className="italic text-zinc-400">{item.transliteration}</p>
                    <p>{item.translation}</p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
