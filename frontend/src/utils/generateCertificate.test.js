/**
 * generateCertificate.test.js — Tests for generateCertificate utility
 */
import { generateCertificate } from './generateCertificate';

describe('generateCertificate', () => {
  let openSpy;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let capturedHtml;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    // Intercept Blob constructor to capture the HTML
    const OriginalBlob = global.Blob;
    jest.spyOn(global, 'Blob').mockImplementation((parts, opts) => {
      capturedHtml = parts[0];
      return new OriginalBlob(parts, opts);
    });
    URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    openSpy.mockRestore();
    global.Blob.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.useRealTimers();
    capturedHtml = null;
  });

  test('opens a new window with blob URL', () => {
    generateCertificate({ name: 'John', score: 8, total: 10, percentage: 80, rank: 1, techStack: 'Java', date: '2024-01-01' });
    expect(openSpy).toHaveBeenCalledWith('blob:test', '_blank');
  });

  test('creates a blob with text/html type', () => {
    generateCertificate({ name: 'Jane', score: 9, total: 10, percentage: 90, rank: null, date: '2024-01-01' });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(capturedHtml).toContain('<!DOCTYPE html>');
  });

  test('revokes blob URL after timeout', () => {
    generateCertificate({ name: 'Test', score: 5, total: 10, percentage: 50, rank: null, date: '2024-01-01' });
    jest.advanceTimersByTime(15000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  test('rank 1 generates Certificate of Achievement title', () => {
    generateCertificate({ name: 'Winner', score: 10, total: 10, percentage: 100, rank: 1, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('Certificate of Achievement');
    expect(html).toContain('1st Place');
  });

  test('rank 2 generates 2nd Place label', () => {
    generateCertificate({ name: 'Silver', score: 9, total: 10, percentage: 90, rank: 2, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('2nd Place');
  });

  test('rank 3 generates 3rd Place label', () => {
    generateCertificate({ name: 'Bronze', score: 8, total: 10, percentage: 80, rank: 3, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('3rd Place');
  });

  test('no rank generates Certificate of Participation title', () => {
    generateCertificate({ name: 'Participant', score: 5, total: 10, percentage: 50, rank: null, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('Certificate of Participation');
  });

  test('escapes HTML in name in the certificate body', () => {
    generateCertificate({ name: '<script>alert("xss")</script>', score: 5, total: 10, percentage: 50, rank: null, date: '2024-01-01' });
    const html = capturedHtml;
    // The body uses escapeHtml for the name display
    expect(html).toContain('&lt;script&gt;alert');
  });

  test('includes techStack in certificate when provided', () => {
    generateCertificate({ name: 'Dev', score: 8, total: 10, percentage: 80, rank: 1, techStack: 'Spring Boot', date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('Spring Boot');
  });

  test('includes date in certificate', () => {
    generateCertificate({ name: 'Dev', score: 7, total: 10, percentage: 70, rank: null, date: '2024-06-15' });
    const html = capturedHtml;
    expect(html).toContain('2024-06-15');
  });

  test('includes score and total in stats', () => {
    generateCertificate({ name: 'Dev', score: 7, total: 10, percentage: 70, rank: null, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('7/10');
    expect(html).toContain('70%');
  });

  test('rank 1 uses gold border color', () => {
    generateCertificate({ name: 'Gold', score: 10, total: 10, percentage: 100, rank: 1, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('#FFD700');
  });

  test('rank 2 uses silver border color', () => {
    generateCertificate({ name: 'Silver', score: 9, total: 10, percentage: 90, rank: 2, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('#C0C0C0');
  });

  test('rank 3 uses bronze border color', () => {
    generateCertificate({ name: 'Bronze', score: 8, total: 10, percentage: 80, rank: 3, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('#CD7F32');
  });

  test('no rank uses purple border color', () => {
    generateCertificate({ name: 'Participant', score: 5, total: 10, percentage: 50, rank: null, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('#A100FF');
  });

  test('escapes techStack HTML characters', () => {
    generateCertificate({ name: 'Dev', score: 8, total: 10, percentage: 80, rank: 1, techStack: 'C++ & <Templates>', date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;Templates&gt;');
  });

  test('handles null techStack gracefully', () => {
    generateCertificate({ name: 'Dev', score: 8, total: 10, percentage: 80, rank: 1, techStack: null, date: '2024-01-01' });
    expect(openSpy).toHaveBeenCalled();
  });

  test('rank > 3 is treated as unranked', () => {
    generateCertificate({ name: 'Dev', score: 5, total: 10, percentage: 50, rank: 5, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('Certificate of Participation');
  });

  test('includes print script for auto-printing', () => {
    generateCertificate({ name: 'Dev', score: 8, total: 10, percentage: 80, rank: null, date: '2024-01-01' });
    const html = capturedHtml;
    expect(html).toContain('window.print()');
  });
});
