function generate(urls, targetDir) {
  const urlList = urls.map(u => `  - ${u}`).join('\n');

  const patch = [
    '--- NSW_buy_nsw_refined.patch ---',
    `target: ${targetDir}`,
    'urls:',
    urlList,
    '',
    '# Patch skeleton (MVP stub)',
    '',
    'steps:',
    `  - navigate: "${urls[0] || 'N/A'}"`,
    '  - wait_for: "#login-form"',
    '  - fill: { selector: "#email", value: "{{email}}" }',
    '  - fill: { selector: "#password", value: "{{password}}" }',
    '  - click: "#submit-btn"',
    '',
    '--- end ---',
  ].join('\n');

  const notes = [
    '--- NSW_buy_nsw_refined.patch.notes ---',
    `Generated: ${new Date().toISOString()}`,
    `Target directory: ${targetDir}`,
    `URL count: ${urls.length}`,
    'Status: skeleton — requires field mapping validation',
    '--- end ---',
  ].join('\n');

  const qa = [
    '# NSW_buy_nsw_refined.patch.qa.md',
    '',
    '## QA Checklist',
    '- [x] Patch skeleton generated',
    '- [x] URLs listed and reachable (stub)',
    '- [x] Selectors are placeholders — need live validation',
    '- [ ] End-to-end run with real credentials (deferred)',
    '',
    '## Notes',
    'This is an MVP stub. Full QA requires a live browser environment.',
  ].join('\n');

  return { patch, notes, qa };
}

module.exports = { generate };
