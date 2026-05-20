#!/usr/bin/env python3
import json

keys = {
  'en': {
    'cp.passwordChanged': 'Password Changed!',
    'cp.passwordChangedMsg': 'Your password has been updated successfully.',
    'cp.currentPassword': 'Current Password',
    'cp.currentPasswordPlaceholder': 'Enter your current password',
    'cp.newPassword': 'New Password',
    'cp.newPasswordPlaceholder': 'Min 6 characters',
    'cp.confirmNewPassword': 'Confirm New Password',
    'cp.confirmPasswordPlaceholder': 'Repeat new password',
  },
  'te': {
    'cp.passwordChanged': 'పాస్‌వర్డ్ మార్చబడింది!',
    'cp.passwordChangedMsg': 'మీ పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది.',
    'cp.currentPassword': 'ప్రస్తుత పాస్‌వర్డ్',
    'cp.currentPasswordPlaceholder': 'మీ ప్రస్తుత పాస్‌వర్డ్ నమోదు చేయండి',
    'cp.newPassword': 'కొత్త పాస్‌వర్డ్',
    'cp.newPasswordPlaceholder': 'కనీసం 6 అక్షరాలు',
    'cp.confirmNewPassword': 'కొత్త పాస్‌వర్డ్ నిర్ధారించు',
    'cp.confirmPasswordPlaceholder': 'కొత్త పాస్‌వర్డ్ మళ్ళీ నమోదు చేయండి',
  },
  'de': {
    'cp.passwordChanged': 'Passwort geändert!',
    'cp.passwordChangedMsg': 'Ihr Passwort wurde erfolgreich aktualisiert.',
    'cp.currentPassword': 'Aktuelles Passwort',
    'cp.currentPasswordPlaceholder': 'Aktuelles Passwort eingeben',
    'cp.newPassword': 'Neues Passwort',
    'cp.newPasswordPlaceholder': 'Mindestens 6 Zeichen',
    'cp.confirmNewPassword': 'Neues Passwort bestätigen',
    'cp.confirmPasswordPlaceholder': 'Neues Passwort wiederholen',
  },
  'fr': {
    'cp.passwordChanged': 'Mot de passe modifié !',
    'cp.passwordChangedMsg': 'Votre mot de passe a été mis à jour avec succès.',
    'cp.currentPassword': 'Mot de passe actuel',
    'cp.currentPasswordPlaceholder': 'Entrez votre mot de passe actuel',
    'cp.newPassword': 'Nouveau mot de passe',
    'cp.newPasswordPlaceholder': 'Min 6 caractères',
    'cp.confirmNewPassword': 'Confirmer le nouveau mot de passe',
    'cp.confirmPasswordPlaceholder': 'Répéter le nouveau mot de passe',
  },
  'hi': {
    'cp.passwordChanged': 'पासवर्ड बदला गया!',
    'cp.passwordChangedMsg': 'आपका पासवर्ड सफलतापूर्वक अपडेट किया गया है।',
    'cp.currentPassword': 'वर्तमान पासवर्ड',
    'cp.currentPasswordPlaceholder': 'अपना वर्तमान पासवर्ड दर्ज करें',
    'cp.newPassword': 'नया पासवर्ड',
    'cp.newPasswordPlaceholder': 'न्यूनतम 6 अक्षर',
    'cp.confirmNewPassword': 'नया पासवर्ड पुष्टि करें',
    'cp.confirmPasswordPlaceholder': 'नया पासवर्ड दोहराएं',
  },
  'kn': {
    'cp.passwordChanged': 'ಪಾಸ್ ವರ್ಡ್ ಬದಲಾಯಿಸಲಾಗಿದೆ!',
    'cp.passwordChangedMsg': 'ನಿಮ್ಮ ಪಾಸ್ ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ.',
    'cp.currentPassword': 'ಪ್ರಸ್ತುತ ಪಾಸ್ ವರ್ಡ್',
    'cp.currentPasswordPlaceholder': 'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಪಾಸ್ ವರ್ಡ್ ನಮೂದಿಸಿ',
    'cp.newPassword': 'ಹೊಸ ಪಾಸ್ ವರ್ಡ್',
    'cp.newPasswordPlaceholder': 'ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳು',
    'cp.confirmNewPassword': 'ಹೊಸ ಪಾಸ್ ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
    'cp.confirmPasswordPlaceholder': 'ಹೊಸ ಪಾಸ್ ವರ್ಡ್ ಪುನರಾವರ್ತಿಸಿ',
  },
  'ur': {
    'cp.passwordChanged': 'پاس ورڈ تبدیل کر دیا گیا!',
    'cp.passwordChangedMsg': 'آپ کا پاس ورڈ کامیابی سے اپ ڈیٹ کر دیا گیا ہے۔',
    'cp.currentPassword': 'موجودہ پاس ورڈ',
    'cp.currentPasswordPlaceholder': 'اپنا موجودہ پاس ورڈ درج کریں',
    'cp.newPassword': 'نیا پاس ورڈ',
    'cp.newPasswordPlaceholder': 'کم از کم 6 حروف',
    'cp.confirmNewPassword': 'نئے پاس ورڈ کی تصدیق کریں',
    'cp.confirmPasswordPlaceholder': 'نیا پاس ورڈ دہرائیں',
  },
}

for lang, trans in keys.items():
    fpath = f'frontend/src/locales/{lang}.json'
    with open(fpath, 'r', encoding='utf-8') as f:
        d = json.load(f)
    for dotkey, val in trans.items():
        section, key = dotkey.split('.', 1)
        if section not in d:
            d[section] = {}
        d[section][key] = val
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'{lang}: updated')

print('CP modal keys added!')
