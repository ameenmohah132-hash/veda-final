export const LEGAL_LAST_UPDATED = 'August 23, 2026';

// NOTE: Placeholders like [Legal Entity Name], [Support Email], and the
// Malaysia governing-law reference should be confirmed/customized before
// launch — see the delivery notes for what to fill in.

export interface LegalSection {
  heading: string;
  body: string[]; // paragraphs
}

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: '1. Introduction',
    body: [
      'This Privacy Policy explains how Veda ("Veda", "we", "us", or "our"), operated by [Legal Entity Name], collects, uses, discloses, and protects information when you use the Veda mobile and web application (the "Service").',
      'By creating an account or otherwise using the Service, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with this policy, please do not use the Service.',
    ],
  },
  {
    heading: '2. Information We Collect',
    body: [
      'Account Information: when you create an account, we collect your email address, full name, and (if you sign in with Google) your Google profile name and avatar image.',
      'Profile & Preferences: academic stage, field of study, target GPA, currency, prayer calculation method, theme, and other preferences you choose to set.',
      'Location Data: with your permission, we collect approximate or precise device location (latitude/longitude, city) to calculate accurate prayer times and Qibla direction. You can decline location access; prayer times will then use a default or manually-entered location.',
      'User Content: information you create within the app, including tasks, notes, journal entries, study documents you upload, flashcards, habit and goal tracking data, prayer and Quran reading logs, and Ask Veda AI chat messages.',
      'Financial Data: expense entries, budget figures, and savings goals you manually enter for the Finance tracker. We do not collect or store bank account or card numbers — subscription payments are handled entirely by PayPal (see Section 5).',
      'Subscription & Billing Status: your trial start date, subscription tier, billing cycle, and subscription status, which we receive from PayPal to activate and maintain your Premium access.',
      'Usage & Device Data: general technical information such as app version, device type, and crash/error logs, used to maintain and improve the Service.',
    ],
  },
  {
    heading: '3. How We Use Your Information',
    body: [
      'We use the information described above to: provide and operate the Service; calculate accurate prayer times and Qibla direction for your location; generate AI-assisted study plans, document summaries, flashcards, financial insights, and conversational responses; process and manage your subscription and free trial; sync your data securely across your devices; personalize your experience; and maintain the security and integrity of the Service.',
      'We do not sell your personal information to third parties, and we do not use your personal data to serve third-party advertising.',
    ],
  },
  {
    heading: '4. AI Features & Third-Party AI Processing',
    body: [
      'Veda\'s AI features (including the AI Daily Planner, AI Document Tutor, AI Notes Assistant, AI Financial Insights, and "Ask Veda" chat) are powered by Google\'s Gemini AI models. When you use these features, the relevant content you submit (such as a question, a document you upload, or your task/financial data needed to generate a response) is sent to Google\'s Gemini API for processing and is subject to Google\'s own applicable API data handling terms.',
      'Do not submit sensitive information (such as government ID numbers, medical information, or full financial account details) into the AI chat or document upload features.',
      'AI-generated responses are produced by an automated system and may be inaccurate or incomplete. See Section 8 of our Terms of Service for important disclaimers regarding AI-generated content, including Islamic guidance, financial insights, and academic content.',
    ],
  },
  {
    heading: '5. How We Share Your Information',
    body: [
      'We share information only with the following categories of service providers, each acting under their own privacy/security obligations, and only as needed to operate the Service:',
      '• Supabase — our database, authentication, and cloud storage provider, which hosts your account and app data behind row-level security so that only you can access your own records.',
      '• Google (Gemini API & Google Sign-In) — processes AI requests you submit, and authenticates you if you choose to sign in with Google.',
      '• PayPal — processes Premium subscription payments. Veda never sees or stores your full card or bank details; PayPal handles this directly.',
      'We may also disclose information if required to do so by law, legal process, or governmental request, or to protect the rights, property, or safety of Veda, our users, or others.',
    ],
  },
  {
    heading: '6. Data Storage & Security',
    body: [
      'Your account and app data are stored in Supabase-hosted infrastructure and protected by row-level security policies that restrict access to your own authenticated account. Data in transit is encrypted (HTTPS/TLS). No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.',
      'A local cache of your data may also be stored on your device to allow the app to load quickly and function with intermittent connectivity; this local cache is never treated as the authoritative copy of your data.',
    ],
  },
  {
    heading: '7. Data Retention & Deletion',
    body: [
      'We retain your account and app data for as long as your account remains active, or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements.',
      'You may request deletion of your account and associated personal data at any time by contacting us at [Support Email] or through the account deletion option in Settings (where available). We will delete or anonymize your data within a reasonable period, except where retention is required by law.',
    ],
  },
  {
    heading: '8. Your Rights & Choices',
    body: [
      'Depending on your location, you may have rights to access, correct, export, or delete your personal data, and to object to or restrict certain processing. You can update most profile information directly within the app, and can contact us at [Support Email] for any request we don\'t yet support natively.',
      'You may withdraw location permission at any time through your device settings. You may disconnect Google Sign-In through your Google Account security settings.',
    ],
  },
  {
    heading: '9. Children\'s Privacy',
    body: [
      'The Service is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If you are between 13 and the age of legal majority in your jurisdiction, you may only use the Service with the involvement and consent of a parent or legal guardian. If we learn we have collected personal information from a child under 13 without appropriate consent, we will delete it promptly.',
    ],
  },
  {
    heading: '10. International Data Transfers',
    body: [
      'Your information may be stored and processed in countries other than your own, including where our service providers (such as Supabase and Google) operate infrastructure. We take reasonable steps to ensure your data continues to be protected wherever it is processed.',
    ],
  },
  {
    heading: '11. Cookies & Local Storage',
    body: [
      'The web version of Veda uses browser local storage (not third-party advertising cookies) to cache your session and app data for performance. You can clear this at any time via your browser settings, though doing so will not delete your account data stored on our servers.',
    ],
  },
  {
    heading: '12. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. If we make material changes, we will notify you within the app or by email before the changes take effect. Continued use of the Service after changes take effect constitutes acceptance of the revised policy.',
    ],
  },
  {
    heading: '13. Contact Us',
    body: [
      'If you have questions about this Privacy Policy or how your data is handled, please contact us at [Support Email].',
    ],
  },
];
