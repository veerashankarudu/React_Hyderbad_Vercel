#!/usr/bin/env python3
import json

# Additional keys to add
translations = {
  'en': {
    'mcd2.qualityScoreLabel': 'QUALITY SCORE',
    'mcd2.aiQualityAssessment': '🏅 AI Quality Assessment',
    'mcd2.versionHistoryTitle': '🕒 Version History',
    'mcd2.noVersionHistory': 'No version history yet. History is recorded each time the MCQ is edited.',
    'mcd2.tabDetails': '📋 Details',
    'mcd2.tabHistory': '🕒 History',
    'mcd2.colVer': 'Ver',
    'mcd2.colChangedBy': 'Changed By',
    'mcd2.colStatus': 'Status',
    'mcd2.colNote': 'Note',
    'mcd2.colDate': 'Date',
    'mcd2.colQuestionStem': 'Question Stem (snapshot)',
    'mcd2.historyLoading': 'Loading history…',
  },
  'te': {
    'mcd2.qualityScoreLabel': 'నాణ్యత స్కోర్',
    'mcd2.aiQualityAssessment': '🏅 AI నాణ్యత మదింపు',
    'mcd2.versionHistoryTitle': '🕒 వెర్షన్ చరిత్ర',
    'mcd2.noVersionHistory': 'ఇంకా వెర్షన్ చరిత్ర లేదు. MCQ సవరించినప్పుడల్లా చరిత్ర నమోదవుతుంది.',
    'mcd2.tabDetails': '📋 వివరాలు',
    'mcd2.tabHistory': '🕒 చరిత్ర',
    'mcd2.colVer': 'వెర్',
    'mcd2.colChangedBy': 'మార్చినవారు',
    'mcd2.colStatus': 'స్థితి',
    'mcd2.colNote': 'గమనిక',
    'mcd2.colDate': 'తేదీ',
    'mcd2.colQuestionStem': 'ప్రశ్న (స్నాప్‌షాట్)',
    'mcd2.historyLoading': 'చరిత్ర లోడవుతోంది…',
  },
  'de': {
    'mcd2.qualityScoreLabel': 'QUALITÄTSSCORE',
    'mcd2.aiQualityAssessment': '🏅 KI-Qualitätsbewertung',
    'mcd2.versionHistoryTitle': '🕒 Versionsverlauf',
    'mcd2.noVersionHistory': 'Noch kein Versionsverlauf. Wird bei jeder Bearbeitung aufgezeichnet.',
    'mcd2.tabDetails': '📋 Details',
    'mcd2.tabHistory': '🕒 Verlauf',
    'mcd2.colVer': 'Ver',
    'mcd2.colChangedBy': 'Geändert von',
    'mcd2.colStatus': 'Status',
    'mcd2.colNote': 'Notiz',
    'mcd2.colDate': 'Datum',
    'mcd2.colQuestionStem': 'Frage (Snapshot)',
    'mcd2.historyLoading': 'Verlauf wird geladen…',
  },
  'fr': {
    'mcd2.qualityScoreLabel': 'SCORE QUALITÉ',
    'mcd2.aiQualityAssessment': '🏅 Évaluation qualité IA',
    'mcd2.versionHistoryTitle': '🕒 Historique des versions',
    'mcd2.noVersionHistory': "Pas encore d'historique. Enregistré à chaque modification.",
    'mcd2.tabDetails': '📋 Détails',
    'mcd2.tabHistory': '🕒 Historique',
    'mcd2.colVer': 'Ver',
    'mcd2.colChangedBy': 'Modifié par',
    'mcd2.colStatus': 'Statut',
    'mcd2.colNote': 'Note',
    'mcd2.colDate': 'Date',
    'mcd2.colQuestionStem': 'Question (instantané)',
    'mcd2.historyLoading': 'Chargement de l\'historique…',
  },
  'hi': {
    'mcd2.qualityScoreLabel': 'गुणवत्ता स्कोर',
    'mcd2.aiQualityAssessment': '🏅 AI गुणवत्ता मूल्यांकन',
    'mcd2.versionHistoryTitle': '🕒 संस्करण इतिहास',
    'mcd2.noVersionHistory': 'अभी कोई संस्करण इतिहास नहीं। हर संपादन पर रिकॉर्ड होता है।',
    'mcd2.tabDetails': '📋 विवरण',
    'mcd2.tabHistory': '🕒 इतिहास',
    'mcd2.colVer': 'वर्',
    'mcd2.colChangedBy': 'बदला गया',
    'mcd2.colStatus': 'स्थिति',
    'mcd2.colNote': 'नोट',
    'mcd2.colDate': 'तारीख',
    'mcd2.colQuestionStem': 'प्रश्न (स्नैपशॉट)',
    'mcd2.historyLoading': 'इतिहास लोड हो रहा है…',
  },
  'kn': {
    'mcd2.qualityScoreLabel': 'ಗುಣಮಟ್ಟ ಸ್ಕೋರ್',
    'mcd2.aiQualityAssessment': '🏅 AI ಗುಣಮಟ್ಟ ಮೌಲ್ಯಮಾಪನ',
    'mcd2.versionHistoryTitle': '🕒 ಆವೃತ್ತಿ ಇತಿಹಾಸ',
    'mcd2.noVersionHistory': 'ಇನ್ನೂ ಆವೃತ್ತಿ ಇತಿಹಾಸ ಇಲ್ಲ. ಪ್ರತಿ ಸಂಪಾದನೆ ದಾಖಲಾಗುತ್ತದೆ.',
    'mcd2.tabDetails': '📋 ವಿವರಗಳು',
    'mcd2.tabHistory': '🕒 ಇತಿಹಾಸ',
    'mcd2.colVer': 'ವರ್',
    'mcd2.colChangedBy': 'ಬದಲಾಯಿಸಿದವರು',
    'mcd2.colStatus': 'ಸ್ಥಿತಿ',
    'mcd2.colNote': 'ಟಿಪ್ಪಣಿ',
    'mcd2.colDate': 'ದಿನಾಂಕ',
    'mcd2.colQuestionStem': 'ಪ್ರಶ್ನೆ (ಸ್ನ್ಯಾಪ್‌ಶಾಟ್)',
    'mcd2.historyLoading': 'ಇತಿಹಾಸ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  },
  'ur': {
    'mcd2.qualityScoreLabel': 'معیار اسکور',
    'mcd2.aiQualityAssessment': '🏅 AI معیار تشخیص',
    'mcd2.versionHistoryTitle': '🕒 ورژن تاریخ',
    'mcd2.noVersionHistory': 'ابھی کوئی ورژن تاریخ نہیں۔ ہر ترمیم پر ریکارڈ ہوتا ہے۔',
    'mcd2.tabDetails': '📋 تفصیلات',
    'mcd2.tabHistory': '🕒 تاریخ',
    'mcd2.colVer': 'ورژن',
    'mcd2.colChangedBy': 'تبدیل کیا',
    'mcd2.colStatus': 'حالت',
    'mcd2.colNote': 'نوٹ',
    'mcd2.colDate': 'تاریخ',
    'mcd2.colQuestionStem': 'سوال (اسنیپ شاٹ)',
    'mcd2.historyLoading': 'تاریخ لوڈ ہو رہی ہے…',
  },
}

locale_dir = 'frontend/src/locales'

for lang, trans in translations.items():
  fpath = f'{locale_dir}/{lang}.json'
  with open(fpath, 'r', encoding='utf-8') as f:
    data = json.load(f)
  
  for dotkey, val in trans.items():
    section, key = dotkey.split('.', 1)
    if section not in data:
      data[section] = {}
    data[section][key] = val
  
  with open(fpath, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
  print(f'Updated {lang}.json')

print('McqDetail locale keys added!')
