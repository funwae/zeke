export type LangMode = 'BILINGUAL' | 'EN' | 'ZH';

/**
 * Build the Zeke prompt string with LANG_MODE, URL, and MISSION sections
 */
export function buildZekePrompt(
  langMode: LangMode,
  url: string,
  mission: string,
): string {
  return [
    `LANG_MODE=${langMode}`,
    `URL=${url || ''}`,
    '',
    'MISSION:',
    mission.trim(),
  ].join('\n');
}

