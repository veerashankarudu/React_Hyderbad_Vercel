/**
 * Generates a downloadable certificate (HTML → print-to-PDF).
 *
 * @param {Object} params
 * @param {string} params.name - Full name of the participant
 * @param {number} params.score - Number of correct answers
 * @param {number} params.total - Total questions
 * @param {number} params.percentage - Score percentage
 * @param {number|null} params.rank - 1, 2, 3 for podium or null for participation
 * @param {string} params.techStack - Tech stack name (optional)
 * @param {string} params.date - Date string
 */
export function generateCertificate({ name, score, total, percentage, rank, techStack, date }) {
  const isRanked = rank && rank <= 3;
  const rankLabel = rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : rank === 3 ? '3rd Place' : '';
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏆';
  const title = isRanked ? 'Certificate of Achievement' : 'Certificate of Participation';
  const borderColor = isRanked
    ? rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'
    : '#6983FF';
  const accentColor = isRanked
    ? rank === 1 ? '#B8860B' : rank === 2 ? '#6B7280' : '#92400E'
    : '#30176E';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${title} - ${name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: landscape; margin: 0; }
  body {
    width: 297mm; height: 210mm;
    font-family: 'Inter', sans-serif;
    display: flex; align-items: center; justify-content: center;
    background: #f8f9fa;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cert {
    width: 270mm; height: 190mm;
    background: white;
    border: 4px solid ${borderColor};
    border-radius: 12px;
    padding: 40px 60px;
    position: relative;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center;
    box-shadow: 0 0 0 2px ${borderColor}33, inset 0 0 0 1px ${borderColor}22;
  }
  .cert::before, .cert::after {
    content: '';
    position: absolute;
    width: 80px; height: 80px;
    border: 3px solid ${borderColor}44;
  }
  .cert::before { top: 15px; left: 15px; border-right: none; border-bottom: none; border-radius: 8px 0 0 0; }
  .cert::after { bottom: 15px; right: 15px; border-left: none; border-top: none; border-radius: 0 0 8px 0; }
  .logo { font-size: 14px; color: #6B7280; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; }
  .emoji { font-size: 48px; margin: 10px 0; }
  .title {
    font-family: 'Playfair Display', serif;
    font-size: 32px; color: ${accentColor};
    margin: 8px 0;
  }
  .rank-label {
    display: inline-block;
    background: ${borderColor}22; color: ${accentColor};
    padding: 4px 20px; border-radius: 20px;
    font-size: 14px; font-weight: 600;
    letter-spacing: 1px; text-transform: uppercase;
    margin: 6px 0 16px;
  }
  .presented { font-size: 13px; color: #9CA3AF; margin-top: 12px; }
  .name {
    font-family: 'Playfair Display', serif;
    font-size: 36px; color: #1F2937;
    border-bottom: 2px solid ${borderColor};
    padding: 4px 40px 8px; margin: 8px 0 16px;
  }
  .desc { font-size: 14px; color: #4B5563; max-width: 500px; line-height: 1.6; }
  .stats {
    display: flex; gap: 40px; margin: 20px 0 10px;
  }
  .stat { text-align: center; }
  .stat-value { font-size: 22px; font-weight: 700; color: ${accentColor}; }
  .stat-label { font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
  .footer {
    position: absolute; bottom: 30px; left: 60px; right: 60px;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .footer-col { text-align: center; }
  .footer-line { width: 120px; border-top: 1px solid #D1D5DB; margin-bottom: 4px; }
  .footer-text { font-size: 10px; color: #9CA3AF; }
  .watermark {
    position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
    font-size: 9px; color: #D1D5DB;
  }
</style>
</head>
<body>
<div class="cert">
  <div class="logo">Valkey • QuizHub AI</div>
  <div class="emoji">${rankEmoji}</div>
  <div class="title">${title}</div>
  ${isRanked ? `<div class="rank-label">${rankLabel}</div>` : '<div style="margin-bottom:16px"></div>'}
  <div class="presented">This is proudly presented to</div>
  <div class="name">${escapeHtml(name)}</div>
  <div class="desc">
    ${isRanked
      ? `For achieving <strong>${rankLabel}</strong> in the QuizHub AI Assessment${techStack ? ` on <strong>${escapeHtml(techStack)}</strong>` : ''} with an outstanding score of <strong>${percentage}%</strong>.`
      : `For successfully completing the QuizHub AI Assessment${techStack ? ` on <strong>${escapeHtml(techStack)}</strong>` : ''} and demonstrating commitment to continuous learning.`
    }
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-value">${score}/${total}</div><div class="stat-label">Score</div></div>
    <div class="stat"><div class="stat-value">${percentage}%</div><div class="stat-label">Accuracy</div></div>
    ${isRanked ? `<div class="stat"><div class="stat-value">#${rank}</div><div class="stat-label">Rank</div></div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-col">
      <div class="footer-line"></div>
      <div class="footer-text">Date: ${escapeHtml(date)}</div>
    </div>
    <div class="footer-col">
      <div class="footer-line"></div>
      <div class="footer-text">QuizHub AI Platform</div>
    </div>
  </div>
  <div class="watermark">Bumble Bee 2026 • Powered by AI</div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
