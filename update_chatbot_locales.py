import json, os

os.chdir('/Users/veera.konjeti/Desktop/hack-n-stack/frontend/src/locales')

extras = {
  'en': {
    'chatbot_extra': {'title': 'AI Collab Hub', 'greetingBubble': 'Hi there! Ask me anything!', 'onlineNow': 'Online now', 'chatHistory': 'Chat History', 'historyBtn': 'History', 'save': 'Save', 'cancel': 'Cancel', 'edited': '(edited)'},
    'masterData_extra': {'selectTsForTopics': '← Select a tech stack to manage its topics.', 'selectTsForSmes': '← Select a tech stack to see its SMEs.'}
  },
  'hi': {
    'chatbot_extra': {'onlineNow': 'अभी ऑनलाइन', 'chatHistory': 'चैट इतिहास', 'historyBtn': 'इतिहास', 'save': 'सहेजें', 'cancel': 'रद्द करें', 'edited': '(संपादित)'},
    'masterData_extra': {'selectTsForTopics': '← टॉपिक्स के लिए टेक स्टैक चुनें।', 'selectTsForSmes': '← SME देखने के लिए टेक स्टैक चुनें।'}
  },
  'te': {
    'chatbot_extra': {'onlineNow': 'ఇప్పుడు ఆన్లైన్', 'chatHistory': 'చాట్ చరిత్ర', 'historyBtn': 'చరిత్ర', 'save': 'సేవ్', 'cancel': 'రద్దు', 'edited': '(సవరించబడింది)'},
    'masterData_extra': {'selectTsForTopics': '← అంశాల కోసం టెక్ స్టాక్ ఎంచుకోండి.', 'selectTsForSmes': '← SMEల కోసం టెక్ స్టాక్ ఎంచుకోండి.'}
  },
  'de': {
    'chatbot_extra': {'onlineNow': 'Jetzt online', 'chatHistory': 'Chatverlauf', 'historyBtn': 'Verlauf', 'save': 'Speichern', 'cancel': 'Abbrechen', 'edited': '(bearbeitet)'},
    'masterData_extra': {'selectTsForTopics': '← Tech-Stack fuer Themen auswaehlen.', 'selectTsForSmes': '← Tech-Stack fuer SMEs auswaehlen.'}
  },
  'fr': {
    'chatbot_extra': {'onlineNow': 'En ligne maintenant', 'chatHistory': 'Historique', 'historyBtn': 'Historique', 'save': 'Enregistrer', 'cancel': 'Annuler', 'edited': '(modifie)'},
    'masterData_extra': {'selectTsForTopics': '← Selectionnez une pile technologique.', 'selectTsForSmes': '← Selectionnez une pile pour les PME.'}
  },
  'kn': {
    'chatbot_extra': {'onlineNow': 'ಈಗ ಆನ್ಲೈನ್', 'chatHistory': 'ಚಾಟ್ ಇತಿಹಾಸ', 'historyBtn': 'ಇತಿಹಾಸ', 'save': 'ಉಳಿಸಿ', 'cancel': 'ರದ್ದು', 'edited': '(ಸಂಪಾದಿಸಲಾಗಿದೆ)'},
    'masterData_extra': {'selectTsForTopics': '← ವಿಷಯಗಳಿಗಾಗಿ ಟೆಕ್ ಸ್ಟಾಕ್ ಆಯ್ಕೆ ಮಾಡಿ.', 'selectTsForSmes': '← SMEಗಳಿಗಾಗಿ ಟೆಕ್ ಸ್ಟಾಕ್ ಆಯ್ಕೆ ಮಾಡಿ.'}
  },
  'ur': {
    'chatbot_extra': {'onlineNow': 'ابھی آن لائن', 'chatHistory': 'چیٹ کی تاریخ', 'historyBtn': 'تاریخ', 'save': 'محفوظ کریں', 'cancel': 'منسوخ', 'edited': '(ترمیم شدہ)'},
    'masterData_extra': {'selectTsForTopics': '← موضوعات کے لیے ٹیک اسٹیک منتخب کریں۔', 'selectTsForSmes': '← SMEs کے لیے ٹیک اسٹیک منتخب کریں۔'}
  }
}

for lang, additions in extras.items():
    with open(lang+'.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    for k, v in additions['chatbot_extra'].items():
        data['chatbot'][k] = v
    for k, v in additions['masterData_extra'].items():
        data['masterData'][k] = v
    with open(lang+'.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('Updated ' + lang + '.json')
print('Done!')
