import { AdhkarItem, PrayerName, PrayerTimesData, QuranSurahInfo } from '../types';

// Coordinates of Kaaba in Makkah, Saudi Arabia
export const KAABA_LAT = 21.422487;
export const KAABA_LNG = 39.826206;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Default to Kuala Lumpur or Mecca coordinates if geolocation unavailable
export const DEFAULT_COORDS: Coordinates = {
  latitude: 3.139,
  longitude: 101.6869,
};

// ----------------------------------------------------
// PRAYER TIME CALCULATION ENGINE (Astronomical Math)
// ----------------------------------------------------
function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

function radiansToDegrees(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

function fixHour(hour: number): number {
  let h = hour - 24.0 * Math.floor(hour / 24.0);
  return h < 0 ? h + 24.0 : h;
}

export function calculatePrayerTimes(
  date: Date = new Date(),
  coords: Coordinates = DEFAULT_COORDS,
  method = 'MWL',
  asrJuristic: 'standard' | 'hanafi' = 'standard'
): PrayerTimesData {
  const lat = coords.latitude;
  const lng = coords.longitude;
  const timezone = -date.getTimezoneOffset() / 60;

  // Day of year
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Method angles
  let fajrAngle = 18;
  let ishaAngle = 17;
  if (method === 'ISNA') {
    fajrAngle = 15;
    ishaAngle = 15;
  } else if (method === 'UmmAlQura') {
    fajrAngle = 18.5;
    ishaAngle = 19;
  } else if (method === 'Egypt') {
    fajrAngle = 19.5;
    ishaAngle = 17.5;
  } else if (method === 'Karachi') {
    fajrAngle = 18;
    ishaAngle = 18;
  }

  // Solar position formulas
  const D = 360.0 / 365.24 * (dayOfYear + (date.getHours() - 12) / 24.0);
  const q = degreesToRadians(D);
  const L = 280.466 + 360.0077 * (dayOfYear / 365.25);
  const g = degreesToRadians(357.528 + 359.993 * (dayOfYear / 365.25));
  const lambda = degreesToRadians(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));

  const epsilon = degreesToRadians(23.439 - 0.0000004 * dayOfYear);
  const alpha = radiansToDegrees(Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))) / 15.0;
  const declination = radiansToDegrees(Math.asin(Math.sin(epsilon) * Math.sin(lambda)));

  // Equation of Time (EoT)
  const equationOfTime = (L / 15.0 - fixHour(alpha)) * 60; // in minutes

  // Solar Noon (Dhuhr)
  const solarNoon = fixHour(12 + timezone - lng / 15.0 - equationOfTime / 60.0);

  // Sun angle calculation helper
  function sunTime(angle: number, direction: 'morning' | 'evening'): number {
    const latRad = degreesToRadians(lat);
    const decRad = degreesToRadians(declination);
    const angRad = degreesToRadians(angle);

    const cosH = (-Math.sin(angRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    if (cosH > 1 || cosH < -1) return solarNoon; // Extreme latitudes fallback

    const H = radiansToDegrees(Math.acos(cosH)) / 15.0;
    return direction === 'morning' ? fixHour(solarNoon - H) : fixHour(solarNoon + H);
  }

  // Asr helper
  function asrTime(): number {
    const shadowFactor = asrJuristic === 'hanafi' ? 2 : 1;
    const latRad = degreesToRadians(lat);
    const decRad = degreesToRadians(declination);
    const angle = -radiansToDegrees(
      Math.atan(1 / (shadowFactor + Math.tan(Math.abs(latRad - decRad))))
    );
    const cosH = (-Math.sin(degreesToRadians(angle)) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    if (cosH > 1 || cosH < -1) return solarNoon + 3.5;
    const H = radiansToDegrees(Math.acos(cosH)) / 15.0;
    return fixHour(solarNoon + H);
  }

  const fajrDec = sunTime(fajrAngle, 'morning');
  const sunriseDec = sunTime(0.833, 'morning');
  const dhuhrDec = solarNoon;
  const asrDec = asrTime();
  const maghribDec = sunTime(0.833, 'evening');
  const ishaDec = sunTime(ishaAngle, 'evening');

  function decimalToTimeString(dec: number): string {
    const totalMinutes = Math.round(dec * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const fajrStr = decimalToTimeString(fajrDec);
  const sunriseStr = decimalToTimeString(sunriseDec);
  const dhuhrStr = decimalToTimeString(dhuhrDec);
  const asrStr = decimalToTimeString(asrDec);
  const maghribStr = decimalToTimeString(maghribDec);
  const ishaStr = decimalToTimeString(ishaDec);

  // Determine next prayer & countdown
  const now = date;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const prayerSchedule: { name: PrayerName; minutes: number; timeStr: string }[] = [
    { name: 'Fajr', minutes: Math.round(fajrDec * 60), timeStr: fajrStr },
    { name: 'Sunrise', minutes: Math.round(sunriseDec * 60), timeStr: sunriseStr },
    { name: 'Dhuhr', minutes: Math.round(dhuhrDec * 60), timeStr: dhuhrStr },
    { name: 'Asr', minutes: Math.round(asrDec * 60), timeStr: asrStr },
    { name: 'Maghrib', minutes: Math.round(maghribDec * 60), timeStr: maghribStr },
    { name: 'Isha', minutes: Math.round(ishaDec * 60), timeStr: ishaStr },
  ];

  let nextP = prayerSchedule[0];
  let diffMinutes = 0;

  for (let i = 0; i < prayerSchedule.length; i++) {
    if (prayerSchedule[i].minutes > currentMinutes) {
      nextP = prayerSchedule[i];
      diffMinutes = prayerSchedule[i].minutes - currentMinutes;
      break;
    }
  }

  // If all prayers today have passed, next prayer is tomorrow's Fajr
  if (diffMinutes === 0 && nextP.minutes <= currentMinutes) {
    nextP = prayerSchedule[0];
    diffMinutes = 24 * 60 - currentMinutes + prayerSchedule[0].minutes;
  }

  const hoursLeft = Math.floor(diffMinutes / 60);
  const minsLeft = diffMinutes % 60;
  const timeRemaining = `${hoursLeft.toString().padStart(2, '0')}h ${minsLeft.toString().padStart(2, '0')}m`;

  const hijri = getAccurateHijriDate(date);

  return {
    fajr: fajrStr,
    sunrise: sunriseStr,
    dhuhr: dhuhrStr,
    asr: asrStr,
    maghrib: maghribStr,
    isha: ishaStr,
    nextPrayer: nextP.name,
    nextPrayerTime: nextP.timeStr,
    timeRemaining,
    hijriDate: hijri,
  };
}

// ----------------------------------------------------
// ACCURATE HIJRI DATE CALCULATION (Umm Al-Qura alignment)
// ----------------------------------------------------
export function getAccurateHijriDate(date: Date = new Date()) {
  const hijriMonths = [
    { en: 'Muharram', ar: 'مُحَرَّم' },
    { en: 'Safar', ar: 'صَفَر' },
    { en: "Rabi' al-Awwal", ar: 'رَبِيع ٱلْأَوَّل' },
    { en: "Rabi' al-Thani", ar: 'رَبِيع ٱلثَّانِي' },
    { en: 'Jumada al-Awwal', ar: 'جُمَادَىٰ ٱلْأُولَىٰ' },
    { en: 'Jumada al-Thani', ar: 'جُمَادَىٰ ٱلثَّانِيَة' },
    { en: 'Rajab', ar: 'رَجَب' },
    { en: "Sha'ban", ar: 'شَعْبَان' },
    { en: 'Ramadan', ar: 'رَمَضَان' },
    { en: 'Shawwal', ar: 'شَوَّال' },
    { en: "Dhu al-Qi'dah", ar: 'ذُو ٱلْقَعْدَة' },
    { en: 'Dhu al-Hijjah', ar: 'ذُو ٱلْحِجَّة' },
  ];

  // Using Intl API with islamic-umalqura calendar
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    let day = 1;
    let month = 1;
    let year = 1448;

    parts.forEach((p) => {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    });

    const monthObj = hijriMonths[(month - 1) % 12] || hijriMonths[0];
    return {
      day,
      monthName: monthObj.en,
      monthArabic: monthObj.ar,
      year,
      formatted: `${day} ${monthObj.en} ${year} AH`,
    };
  } catch (_e) {
    // Fallback mathematical Kuwaity algorithm
    const julianDay = Math.floor(date.getTime() / 86400000 + 2440587.5);
    const l = julianDay - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l3) / 709);
    const day = l3 - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;

    const monthObj = hijriMonths[(month - 1) % 12] || hijriMonths[0];
    return {
      day,
      monthName: monthObj.en,
      monthArabic: monthObj.ar,
      year,
      formatted: `${day} ${monthObj.en} ${year} AH`,
    };
  }
}

// ----------------------------------------------------
// ACCURATE QIBLA BEARING & DISTANCE ENGINE
// ----------------------------------------------------
export function calculateQibla(coords: Coordinates = DEFAULT_COORDS): {
  bearingDegrees: number;
  distanceKm: number;
  distanceMiles: number;
  compassDirection: string;
} {
  const phi1 = degreesToRadians(coords.latitude);
  const lambda1 = degreesToRadians(coords.longitude);
  const phi2 = degreesToRadians(KAABA_LAT);
  const lambda2 = degreesToRadians(KAABA_LNG);

  const deltaLambda = lambda2 - lambda1;

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);

  let qiblaBearing = radiansToDegrees(Math.atan2(y, x));
  qiblaBearing = (qiblaBearing + 360) % 360;

  // Haversine Distance
  const R = 6371; // Earth radius in km
  const dLat = phi2 - phi1;
  const dLon = lambda2 - lambda1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);
  const distanceMiles = Math.round(distanceKm * 0.621371);

  // Compass directions
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirIndex = Math.round(qiblaBearing / 45) % 8;
  const compassDirection = directions[dirIndex];

  return {
    bearingDegrees: Math.round(qiblaBearing * 10) / 10,
    distanceKm,
    distanceMiles,
    compassDirection,
  };
}

// ----------------------------------------------------
// AUTHENTIC ADHKAR REPOSITORY
// ----------------------------------------------------
export const ADHKAR_COLLECTION: AdhkarItem[] = [
  {
    id: 'm1',
    category: 'morning',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: "Asbahna wa-asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadeer.",
    translation: 'We have entered upon the morning and to Allah belongs all sovereignty, and all praise is for Allah. There is no deity except Allah alone without partner.',
    targetCount: 1,
    currentCount: 0,
    reference: 'Muslim 4/2088',
  },
  {
    id: 'm2',
    category: 'morning',
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
    transliteration: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namootu wa ilaykan-nushoor.',
    translation: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and unto You is the resurrection.',
    targetCount: 1,
    currentCount: 0,
    reference: 'At-Tirmidhi 3391',
  },
  {
    id: 'm3',
    category: 'morning',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    transliteration: "Subhan-Allahi wa bihamdihi: 'Adada khalqihi, wa rida nafsihi, wa zinata 'arshihi, wa midada kalimatihi.",
    translation: 'Glory is to Allah and praise is to Him, by the number of His creation, by His pleasure, by the weight of His Throne, and by the ink of His words.',
    targetCount: 3,
    currentCount: 0,
    reference: 'Muslim 4/2090',
  },
  {
    id: 'm4',
    category: 'morning',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Aleem.",
    translation: 'In the Name of Allah with Whose Name nothing can cause harm in the earth nor in the heavens, and He is the All-Hearing, the All-Knowing.',
    targetCount: 3,
    currentCount: 0,
    reference: 'Abu Dawud 4/323',
  },
  {
    id: 'e1',
    category: 'evening',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Amsayna wa-amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la shareeka lah.',
    translation: 'We have reached the evening and sovereignty belongs to Allah, and all praise is for Allah.',
    targetCount: 1,
    currentCount: 0,
    reference: 'Muslim 4/2088',
  },
  {
    id: 'e2',
    category: 'evening',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: "A'oodhu bikalimatil-lahit-tammati min sharri ma khalaq.",
    translation: 'I seek refuge in the Perfect Words of Allah from the evil of what He has created.',
    targetCount: 3,
    currentCount: 0,
    reference: 'Muslim 4/2080',
  },
  {
    id: 'ap1',
    category: 'after_prayer',
    arabic: 'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالإِكْرَامِ',
    transliteration: "Astaghfirullah (3x). Allahumma Antas-Salam wa minkas-salam, tabarakta ya Dhal-Jalali wal-Ikram.",
    translation: 'I seek forgiveness from Allah (3x). O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of majesty and honor.',
    targetCount: 1,
    currentCount: 0,
    reference: 'Muslim 1/414',
  },
  {
    id: 'ap2',
    category: 'after_prayer',
    arabic: 'سُبْحَانَ اللَّهِ (٣٣) ، الحَمْدُ لِلَّهِ (٣٣) ، اللَّهُ أَكْبَرُ (٣٣)',
    transliteration: 'SubhanAllah (33x), Alhamdulillah (33x), Allahu Akbar (33x).',
    translation: 'Glory be to Allah, Praise be to Allah, Allah is the Greatest.',
    targetCount: 33,
    currentCount: 0,
    reference: 'Muslim 1/418',
  },
  {
    id: 's1',
    category: 'sleep',
    arabic: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
    transliteration: "Bismika Rabbi wada'tu janbi, wa bika arfa'uh, fa in amsakta nafsi farhamha, wa in arsaltaha fahfazha bima tahfazu bihi 'ibadakas-saliheen.",
    translation: 'In Your name my Lord, I lie down, and by Your name I rise. If You take my soul, have mercy upon it, and if You release it, protect it as You protect Your righteous servants.',
    targetCount: 1,
    currentCount: 0,
    reference: 'Al-Bukhari 11/126',
  },
];

// ----------------------------------------------------
// QURAN SURAHS INDEX
// ----------------------------------------------------
export const QURAN_SURAHS_INDEX: QuranSurahInfo[] = [
  { number: 1, nameArabic: 'الفاتحة', nameEnglish: 'Al-Fatihah', translationEnglish: 'The Opening', ayahCount: 7, revelationType: 'Meccan' },
  { number: 2, nameArabic: 'البقرة', nameEnglish: 'Al-Baqarah', translationEnglish: 'The Cow', ayahCount: 286, revelationType: 'Medinan' },
  { number: 3, nameArabic: 'آل عمران', nameEnglish: 'Ali \'Imran', translationEnglish: 'Family of Imran', ayahCount: 200, revelationType: 'Medinan' },
  { number: 4, nameArabic: 'النساء', nameEnglish: 'An-Nisa', translationEnglish: 'The Women', ayahCount: 176, revelationType: 'Medinan' },
  { number: 18, nameArabic: 'الكهف', nameEnglish: 'Al-Kahf', translationEnglish: 'The Cave', ayahCount: 110, revelationType: 'Meccan' },
  { number: 36, nameArabic: 'يس', nameEnglish: 'Ya-Sin', translationEnglish: 'Ya-Sin', ayahCount: 83, revelationType: 'Meccan' },
  { number: 55, nameArabic: 'الرحمن', nameEnglish: 'Ar-Rahman', translationEnglish: 'The Beneficent', ayahCount: 78, revelationType: 'Medinan' },
  { number: 56, nameArabic: 'الواقعة', nameEnglish: 'Al-Waqi\'ah', translationEnglish: 'The Inevitable', ayahCount: 96, revelationType: 'Meccan' },
  { number: 67, nameArabic: 'الملك', nameEnglish: 'Al-Mulk', translationEnglish: 'The Sovereignty', ayahCount: 30, revelationType: 'Meccan' },
  { number: 93, nameArabic: 'الضحى', nameEnglish: 'Ad-Duha', translationEnglish: 'The Morning Hours', ayahCount: 11, revelationType: 'Meccan' },
  { number: 94, nameArabic: 'الشرح', nameEnglish: 'Ash-Sharh', translationEnglish: 'The Relief', ayahCount: 8, revelationType: 'Meccan' },
  { number: 97, nameArabic: 'القدر', nameEnglish: 'Al-Qadr', translationEnglish: 'The Power', ayahCount: 5, revelationType: 'Meccan' },
  { number: 103, nameArabic: 'العصر', nameEnglish: 'Al-\'Asr', translationEnglish: 'The Declining Day', ayahCount: 3, revelationType: 'Meccan' },
  { number: 108, nameArabic: 'الكوثر', nameEnglish: 'Al-Kawthar', translationEnglish: 'Abundance', ayahCount: 3, revelationType: 'Meccan' },
  { number: 112, nameArabic: 'الإخلاص', nameEnglish: 'Al-Ikhlas', translationEnglish: 'Sincerity', ayahCount: 4, revelationType: 'Meccan' },
  { number: 113, nameArabic: 'الفلق', nameEnglish: 'Al-Falaq', translationEnglish: 'The Daybreak', ayahCount: 5, revelationType: 'Meccan' },
  { number: 114, nameArabic: 'الناس', nameEnglish: 'An-Nas', translationEnglish: 'Mankind', ayahCount: 6, revelationType: 'Meccan' },
];

// Curated authentic Surah sample reader texts
export const SURAH_CONTENT_STORE: Record<
  number,
  { numberInSurah: number; textArabic: string; textEnglish: string }[]
> = {
  1: [
    { numberInSurah: 1, textArabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', textEnglish: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
    { numberInSurah: 2, textArabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', textEnglish: '[All] praise is [due] to Allah, Lord of the worlds -' },
    { numberInSurah: 3, textArabic: 'الرَّحْمَٰنِ الرَّحِيمِ', textEnglish: 'The Entirely Merciful, the Especially Merciful,' },
    { numberInSurah: 4, textArabic: 'مَالِكِ يَوْمِ الدِّينِ', textEnglish: 'Sovereign of the Day of Recompense.' },
    { numberInSurah: 5, textArabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', textEnglish: 'It is You we worship and You we ask for help.' },
    { numberInSurah: 6, textArabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', textEnglish: 'Guide us to the straight path -' },
    { numberInSurah: 7, textArabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', textEnglish: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.' },
  ],
  67: [
    { numberInSurah: 1, textArabic: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', textEnglish: 'Blessed is He in whose hand is dominion, and He is over all things competent -' },
    { numberInSurah: 2, textArabic: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ', textEnglish: '[He] who created death and life to test you [as to] which of you is best in deed - and He is the Exalted in Might, the Forgiving -' },
    { numberInSurah: 3, textArabic: 'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ', textEnglish: '[And] who created seven heavens in layers. You see not in the creation of the Most Merciful any inconsistency. So return [your] vision; do you see any breaks?' },
    { numberInSurah: 4, textArabic: 'ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ', textEnglish: 'Then return [your] vision twice again. [Your] vision will return to you humbled while it is fatigued.' },
    { numberInSurah: 5, textArabic: 'وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ', textEnglish: 'And We have certainly beautified the nearest heaven with stars and have made [from] them what is thrown at the devils...' },
  ],
  112: [
    { numberInSurah: 1, textArabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', textEnglish: 'Say, "He is Allah, [who is] One,' },
    { numberInSurah: 2, textArabic: 'اللَّهُ الصَّمَدُ', textEnglish: 'Allah, the Eternal Refuge.' },
    { numberInSurah: 3, textArabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', textEnglish: 'He neither begets nor is born,' },
    { numberInSurah: 4, textArabic: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', textEnglish: 'Nor is there to Him any equivalent."' },
  ],
  113: [
    { numberInSurah: 1, textArabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', textEnglish: 'Say, "I seek refuge in the Lord of daybreak' },
    { numberInSurah: 2, textArabic: 'مِن شَرِّ مَا خَلَقَ', textEnglish: 'From the evil of that which He created' },
    { numberInSurah: 3, textArabic: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ', textEnglish: 'And from the evil of darkness when it settles' },
    { numberInSurah: 4, textArabic: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', textEnglish: 'And from the evil of the blowers in knots' },
    { numberInSurah: 5, textArabic: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', textEnglish: 'And from the evil of an envier when he envies."' },
  ],
  114: [
    { numberInSurah: 1, textArabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', textEnglish: 'Say, "I seek refuge in the Lord of mankind,' },
    { numberInSurah: 2, textArabic: 'مَلِكِ النَّاسِ', textEnglish: 'The Sovereign of mankind,' },
    { numberInSurah: 3, textArabic: 'إِلَٰهِ النَّاسِ', textEnglish: 'The God of mankind,' },
    { numberInSurah: 4, textArabic: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', textEnglish: 'From the evil of the retreating whisperer -' },
    { numberInSurah: 5, textArabic: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', textEnglish: 'Who whispers [evil] into the breasts of mankind -' },
    { numberInSurah: 6, textArabic: 'مِنَ الْجِنَّةِ وَالنَّاسِ', textEnglish: 'From among the jinn and mankind."' },
  ],
};
