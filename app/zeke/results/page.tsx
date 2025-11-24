'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

function ZekeResultsContent() {
  const searchParams = useSearchParams();
  const promptParam = searchParams.get('prompt') || '';

  // Also try getting from URL directly as fallback
  const [prompt] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('prompt') || promptParam;
    }
    return promptParam;
  });

  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    if (!prompt) {
      setError('No prompt provided');
      setLoading(false);
      return;
    }

    const fetchResponse = async () => {
      try {
        console.log('[Zeke Results] Starting fetch with prompt length:', prompt.length);
        setStatus('Connecting to Zeke...');

        const res = await fetch('/api/zeke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        console.log('[Zeke Results] Response status:', res.status, 'ok:', res.ok);
        console.log('[Zeke Results] Response headers:', Object.fromEntries(res.headers.entries()));

        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          console.error('[Zeke Results] Error response:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        setStatus('Zeke is searching and analyzing...');

        // Read stream - match test page exactly
        if (!res.body) {
          const text = await res.text();
          setResponse(text);
          setStatus('Complete!');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let chunkCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            chunkCount++;

            if (done) {
              console.log('[Zeke Results] ✅ Stream complete:', chunkCount, 'chunks,', fullText.length, 'chars');
              break;
            }

            if (value && value.length > 0) {
              const chunk = decoder.decode(value, { stream: true });
              fullText += chunk;
              console.log('[Zeke Results] Chunk', chunkCount, ':', chunk.length, 'chars, total:', fullText.length);
              setResponse(fullText);

              // Update status
              if (fullText.length < 100) {
                setStatus('Zeke is thinking...');
              } else if (fullText.length < 300) {
                setStatus('Searching and analyzing...');
              } else {
                setStatus('Generating your briefing...');
              }
            } else {
              console.warn('[Zeke Results] Empty chunk', chunkCount);
            }
          }

          // Final decode
          const remaining = decoder.decode();
          if (remaining) {
            fullText += remaining;
            setResponse(fullText);
          }
        } catch (readErr) {
          console.error('[Zeke Results] Stream read error:', readErr);
          if (fullText.length > 0) {
            setResponse(fullText);
            setStatus('Complete (partial)');
          } else {
            throw readErr;
          }
        } finally {
          reader.releaseLock();
        }

        setStatus('Complete!');
      } catch (err) {
        console.error('[Zeke Results] Fetch error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('Error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchResponse();
  }, [prompt]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-900 border border-slate-700">
              <Image
                src={loading ? '/zeke-neutral.svg' : error ? '/zeke-wave.svg' : '/zeke-cheer.svg'}
                alt="Zeke"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Zeke's Briefing</h1>
              <p className="text-sm text-slate-400 mt-1">{status}</p>
            </div>
          </div>
        </header>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-600/70 bg-rose-950/40 p-4 sm:p-5">
            <div className="font-semibold text-rose-200 mb-2">Error occurred:</div>
            <div className="font-mono text-xs text-rose-100 break-all">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {loading && !response && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent mb-4"></div>
            <p className="text-slate-300">{status}</p>
          </div>
        )}

        {/* Results Display */}
        {response && (
          <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-200 sm:text-base">
                Your Briefing
              </h2>
              <span className="text-xs text-slate-500">
                {response.length} characters
              </span>
            </div>

            <div className="mt-3 min-h-[200px] rounded-xl bg-slate-900/90 p-4 sm:p-6 text-sm text-slate-100 sm:text-base">
              <div className="whitespace-pre-wrap break-words prose prose-invert max-w-none">
                {response}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 pb-4 text-center text-[11px] text-slate-500 sm:text-xs">
          Powered by GLM-4.6 (Coding Plan) · Vision + Web Search + Web Reader via MCP
        </footer>
      </main>
    </div>
  );
}

export default function ZekeResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    }>
      <ZekeResultsContent />
    </Suspense>
  );
}

