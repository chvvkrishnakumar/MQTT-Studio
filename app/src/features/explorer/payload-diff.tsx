import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNum: number | null;
}

interface Props {
  current: string;
  previous: string;
}

/** Pretty-print both payloads so JSON changes are structural (one key per line)
 *  rather than a giant single-line blob. Falls back to raw text. */
function normalize(payload: string): string {
  const t = payload.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      /* not json */
    }
  }
  return payload;
}

/** Minimal LCS-based line diff. Returns rows that can be rendered as
 *  added/removed/unchanged. Good enough for short payloads (< 200 lines). */
function lineDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n');
  const linesB = b.split('\n');

  // Trim common prefix.
  let start = 0;
  while (start < linesA.length && start < linesB.length && linesA[start] === linesB[start]) {
    start++;
  }
  // Trim common suffix.
  let endA = linesA.length;
  let endB = linesB.length;
  while (endA > start && endB > start && linesA[endA - 1] === linesB[endB - 1]) {
    endA--;
    endB--;
  }

  const result: DiffLine[] = [];

  // Unchanged prefix.
  for (let i = 0; i < start; i++) {
    result.push({ type: 'unchanged', text: linesA[i], lineNum: i + 1 });
  }

  // Removed lines (from old).
  for (let i = start; i < endA; i++) {
    result.push({ type: 'removed', text: linesA[i], lineNum: i + 1 });
  }
  // Added lines (from new).
  for (let i = start; i < endB; i++) {
    result.push({ type: 'added', text: linesB[i], lineNum: i + 1 });
  }

  // Unchanged suffix.
  for (let i = endA; i < linesA.length; i++) {
    result.push({ type: 'unchanged', text: linesA[i], lineNum: i + 1 });
  }

  return result;
}

/** Inline char-level diff for two lines — highlights the exact chars that
 *  differ within a single changed line. Returns segments. */
export function charDiff(a: string, b: string): Array<{ text: string; type: 'same' | 'added' | 'removed' }> {
  if (a === b) return [{ text: a, type: 'same' }];
  if (!a) return [{ text: b, type: 'added' }];
  if (!b) return [{ text: a, type: 'removed' }];

  // LCS for characters is O(n*m) — only attempt for short lines.
  if (a.length > 200 || b.length > 200) {
    return [
      { text: a, type: 'removed' },
      { text: b, type: 'added' },
    ];
  }

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const segs: Array<{ text: string; type: 'same' | 'added' | 'removed' }> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      segs.push({ text: a[i - 1], type: 'same' });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      segs.push({ text: a[i - 1], type: 'removed' });
      i--;
    } else {
      segs.push({ text: b[j - 1], type: 'added' });
      j--;
    }
  }
  while (i > 0) {
    segs.push({ text: a[i - 1], type: 'removed' });
    i--;
  }
  while (j > 0) {
    segs.push({ text: b[j - 1], type: 'added' });
    j--;
  }
  segs.reverse();

  // Merge consecutive same-type segments.
  const merged: Array<{ text: string; type: 'same' | 'added' | 'removed' }> = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.type === s.type) last.text += s.text;
    else merged.push({ ...s });
  }
  return merged;
}

export default function PayloadDiff({ current, previous }: Props) {
  const lines = useMemo(() => {
    const normPrev = normalize(previous);
    const normCurr = normalize(current);
    if (normPrev === normCurr) return null;
    return lineDiff(normPrev, normCurr);
  }, [current, previous]);

  if (!lines) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No changes detected — the payload is identical to the previous message.
      </div>
    );
  }

  const hasChanges = lines.some((l) => l.type !== 'unchanged');
  if (!hasChanges) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No changes detected.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border bg-muted/20 font-mono text-xs">
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            'flex items-start',
            line.type === 'added' && 'bg-emerald-500/15',
            line.type === 'removed' && 'bg-red-500/15',
          )}
        >
          <span
            className={cn(
              'w-7 shrink-0 select-none border-r px-1 text-right text-[10px] leading-relaxed',
              line.type === 'added' && 'border-emerald-500/30 text-emerald-600',
              line.type === 'removed' && 'border-red-500/30 text-red-600',
              line.type === 'unchanged' && 'border-border text-muted-foreground',
            )}
          >
            {line.lineNum ?? ''}
          </span>
          <span className="w-4 shrink-0 select-none px-1 text-[10px] leading-relaxed">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 whitespace-pre-wrap break-all px-1 leading-relaxed',
              line.type === 'added' && 'text-emerald-700 dark:text-emerald-400',
              line.type === 'removed' && 'text-red-700 dark:text-red-400',
              line.type === 'unchanged' && 'text-foreground/70',
            )}
          >
            {line.text || ' '}
          </span>
        </div>
      ))}
    </div>
  );
}
