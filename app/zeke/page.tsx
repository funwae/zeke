'use client';

import { useState, useEffect } from 'react';
import { useCompletion } from '@ai-sdk/react';
import Image from 'next/image';
import { buildZekePrompt, type LangMode } from '@/lib/utils';

export default function ZekePage() {
  const [url, setUrl] = useState('');
  const [langMode, setLangMode] = useState<LangMode>('BILINGUAL');
  const [mission, setMission] = useState(
    [
      'Give me a detailed, high-signal briefing on this page and its surrounding context.',
      "Assume I'm a senior engineer just joining the project.",
      'Include: core idea, main tradeoffs, important numbers, key risks, and any missing info or TODOs.',
      "It's okay if this is long; lean toward completeness over brevity.",
    ].join(' ')
  );

  const { completion, complete, isLoading, error } = useCompletion({
    api: '/api/zeke',
    onError: (err) => {
      console.error('[Zeke] useCompletion error:', err);
      console.error('[Zeke] Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        toString: err?.toString(),
      });
    },
    onFinish: (prompt, completion) => {
      console.log('[Zeke] Finished:', {
        prompt: prompt?.slice(0, 50) || 'no prompt',
        completion: completion?.slice(0, 100) || 'no completion',
        completionLength: completion?.length || 0
      });
    },
  });

  // Debug: Log completion changes
  useEffect(() => {
    console.log('[Zeke] State update:', {
      hasCompletion: !!completion,
      completionLength: completion?.length || 0,
      completionPreview: completion?.slice(0, 100) || '(empty)',
      isLoading,
      hasError: !!error,
      errorMessage: error?.message || error?.toString() || 'none'
    });
    if (completion) {
      console.log('[Zeke] ✅ Completion received:', completion.length, 'chars');
      console.log('[Zeke] Preview:', completion.slice(0, 200));
    }
    if (error) {
      console.error('[Zeke] ❌ Error detected:', error);
      console.error('[Zeke] Error type:', typeof error);
      console.error('[Zeke] Error stringified:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        console.error('[Zeke] Error message:', error.message);
        console.error('[Zeke] Error stack:', error.stack);
      }
    }
  }, [completion, isLoading, error]);

  const [hasRun, setHasRun] = useState(false);

  const handleRun = async () => {
    const trimmedMission = mission.trim();
    if (!trimmedMission) return;

    const prompt = buildZekePrompt(langMode, url, trimmedMission);
    setHasRun(true);

    // Open results page in new window/tab
    const resultsUrl = `/zeke/results?prompt=${encodeURIComponent(prompt)}`;
    window.open(resultsUrl, '_blank');
  };

  const zekePose = isLoading
    ? '/zeke-neutral.svg'
    : completion
      ? '/zeke-cheer.svg'
      : '/zeke-wave.svg';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:py-14">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Zeke avatar */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md shadow-black/40 sm:h-20 sm:w-20">
              <Image
                src={zekePose}
                alt="Zeke, your briefing assistant"
                fill
                className="object-contain p-2"
              />
            </div>

            {/* Title + subtitle */}
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                Zeke · Multi-Modal Briefing Desk
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
                One click. Zeke looks up the page, scouts the web, reads the
                content, and returns a clean briefing in English, Chinese, or
                both.
              </p>

              {/* Tiny speech line from Zeke */}
              <p className="mt-1 text-xs text-emerald-300/90 sm:text-[13px]">
                {isLoading
                  ? '"Give me a moment, I\'m reading this so you don\'t have to…"'
                  : completion
                    ? '"Briefing ready. No coffee spills detected."'
                    : '"Drop me a link and a mission — I\'ll bring you a proper briefing."'}
              </p>
            </div>
          </div>

          {/* Lang toggle */}
          <div className="inline-flex items-center gap-3 rounded-full bg-slate-800/70 px-3 py-2 text-xs sm:text-sm">
            <span className="text-slate-400">Language</span>
            <div className="flex overflow-hidden rounded-full bg-slate-900/80 border border-slate-700/80">
              {[
                { label: 'EN', value: 'EN' as LangMode },
                { label: '中文', value: 'ZH' as LangMode },
                { label: '双语', value: 'BILINGUAL' as LangMode },
              ].map((opt) => {
                const isSelected = langMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      console.log('[Zeke] Language toggle clicked:', opt.value);
                      setLangMode(opt.value);
                    }}
                    className={[
                      'px-3 py-1 text-xs sm:text-sm transition-colors rounded-full',
                      isSelected
                        ? 'bg-emerald-400 text-slate-900 font-medium'
                        : 'text-slate-300 hover:bg-slate-800',
                    ].join(' ')}
                    aria-pressed={isSelected}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Input card */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 sm:p-5 shadow-lg shadow-black/40">
          <div className="flex flex-col gap-4">
            {/* URL input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300 sm:text-sm">
                Target URL（可选）
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.z.ai/devpack/mcp/vision-mcp-server"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              <p className="text-xs text-slate-400">
                Paste any doc, blog post, or spec link. Zeke will use{' '}
                <span className="font-mono text-emerald-300">
                  webSearchPrime
                </span>{' '}
                +{' '}
                <span className="font-mono text-emerald-300">webReader</span>{' '}
                under the hood.
              </p>
            </div>

            {/* Mission textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300 sm:text-sm">
                Mission / 任务说明
              </label>
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="Tell Zeke what you want to understand or explain."
              />
              <p className="text-xs text-slate-400">
                Tip: Mention screenshot filenames (like{' '}
                <code className="font-mono">demo.png</code>) if you want Zeke
                to bring in Vision MCP too.
              </p>
            </div>

            {/* Action row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Powered by GLM-4.6 (Coding Plan) · Vision + Web Search + Web
                  Reader via MCP
                </span>
              </div>
              <button
                onClick={handleRun}
                disabled={isLoading}
                className={[
                  'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  isLoading
                    ? 'bg-emerald-500/60 text-slate-900 cursor-wait'
                    : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
                ].join(' ')}
              >
                {isLoading ? 'Zeke is thinking…' : 'Send to Zeke'}
              </button>
            </div>
          </div>
        </section>

        {/* Status / steps */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative h-6 w-6 overflow-hidden rounded-full bg-slate-900 border border-slate-700">
              <Image
                src={zekePose}
                alt="Zeke status"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <h2 className="text-sm font-semibold text-slate-200 sm:text-base">
              Run status
            </h2>
          </div>
          <ol className="mt-3 grid gap-2 text-xs text-slate-400 sm:text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              <span>1. Zeke parses mission &amp; language</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  isLoading || hasRun ? 'bg-emerald-400/80' : 'bg-slate-600',
                ].join(' ')}
              />
              <span>2. MCP: search + read (and vision if needed)</span>
            </li>
            <li className="flex items-center gap-2">
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  completion ? 'bg-emerald-400/80' : 'bg-slate-600',
                ].join(' ')}
              />
              <span>3. GLM-4.6 writes your briefing</span>
            </li>
          </ol>
        </section>

        {/* Output area */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-200 sm:text-base">
              Zeke's briefing
            </h2>
            <span className="text-xs text-slate-500">
              Output is markdown-style text
            </span>
          </div>

          <div className="mt-3 min-h-[120px] rounded-xl bg-slate-950/90 p-3 text-sm text-slate-100 sm:p-4 sm:text-base">
            {error && (
              <div className="mb-2 rounded-lg border border-rose-600/70 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
                <div className="font-semibold mb-1">Error occurred:</div>
                <div className="font-mono text-[10px] break-all">
                  {error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                    ? error
                    : JSON.stringify(error, null, 2)}
                </div>
                <div className="mt-2 text-rose-200/80">
                  Double-check your <code className="font-mono">Z_AI_API_KEY</code> and MCP settings, then try again.
                </div>
              </div>
            )}
            {!completion && !isLoading && !error && (
              <p className="text-xs text-slate-500 sm:text-sm">
                Run Zeke and your bilingual briefing will show up here.
              </p>
            )}
            <div className="whitespace-pre-wrap break-words">
              {completion || (isLoading && 'Streaming response…')}
            </div>
          </div>
        </section>

        {/* Tiny footer */}
        <footer className="pb-4 text-center text-[11px] text-slate-500 sm:text-xs">
          Zeke is a demo assistant that shows GLM-4.6 + Z.AI MCP in action.
          Built for builders in both English and 中文 communities.
        </footer>
      </main>
    </div>
  );
}

