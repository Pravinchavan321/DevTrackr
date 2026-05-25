import React, { useState } from 'react';
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import Button from '../common/Button';

const SectionList = ({ title, items, tone = 'violet' }) => {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-500'
    : tone === 'amber'
      ? 'border-amber-500'
      : tone === 'red'
        ? 'border-red-500'
        : 'border-violet-500';

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
      <h3 className={`border-l-4 ${toneClass} pl-3 text-sm font-semibold text-gray-200`}>{title}</h3>
      <ul className="mt-3 space-y-2">
        {(items || []).slice(0, 4).map((item) => (
          <li key={item} className="text-xs leading-relaxed text-gray-400">{item}</li>
        ))}
      </ul>
    </div>
  );
};

export default function SprintRetrospectiveCard({ data, loading, error, onRetry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data || !navigator.clipboard) return;

    const text = [
      `Sprint Retrospective (${data.range})`,
      data.summary,
      '',
      'What went well:',
      ...(data.whatWentWell || []).map((item) => `- ${item}`),
      '',
      'What went wrong:',
      ...(data.whatWentWrong || []).map((item) => `- ${item}`),
      '',
      'Risks:',
      ...(data.risks || []).map((item) => `- ${item}`),
      '',
      'Action items:',
      ...(data.actionItems || []).map((item) => `- ${item}`)
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5 animate-pulse">
        <div className="h-4 w-52 rounded bg-gray-800" />
        <div className="mt-5 h-16 rounded-xl bg-gray-800" />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-28 rounded-xl bg-gray-800" />
          <div className="h-28 rounded-xl bg-gray-800" />
          <div className="h-28 rounded-xl bg-gray-800" />
          <div className="h-28 rounded-xl bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <div>
            <h3 className="text-sm font-semibold text-red-100">AI sprint retrospective unavailable</h3>
            <p className="mt-1 text-xs leading-relaxed text-red-200/80">{error}</p>
            {onRetry && (
              <Button variant="ghost" onClick={onRetry} className="mt-3 px-3 py-1.5 text-xs">
                <ArrowPathIcon className="mr-1.5 h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5">
        <h2 className="text-gray-200 font-semibold border-l-4 border-emerald-500 pl-3">AI Sprint Retrospective</h2>
        <p className="mt-4 text-sm text-gray-500">Not enough sprint activity is available yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-emerald-300" />
            <h2 className="text-gray-200 font-semibold">AI Sprint Retrospective</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">Generated from repository activity for the last {data.range || '7d'}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            {data.aiGenerated ? 'AI assisted' : 'Rule fallback'}
          </span>
          <Button variant="secondary" onClick={handleCopy} className="px-3 py-1.5 text-xs">
            {copied ? (
              <ClipboardDocumentCheckIcon className="mr-1.5 h-4 w-4" />
            ) : (
              <ClipboardDocumentIcon className="mr-1.5 h-4 w-4" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {onRetry && (
            <Button variant="ghost" onClick={onRetry} className="px-3 py-1.5 text-xs">
              <ArrowPathIcon className="mr-1.5 h-4 w-4" />
              Regenerate
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/40 p-4">
        <p className="text-sm leading-relaxed text-gray-300">{data.summary}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionList title="What Went Well" items={data.whatWentWell} tone="emerald" />
        <SectionList title="What Went Wrong" items={data.whatWentWrong} tone="amber" />
        <SectionList title="Risks" items={data.risks} tone="red" />
        <SectionList title="Action Items" items={data.actionItems} tone="violet" />
      </div>
    </div>
  );
}
