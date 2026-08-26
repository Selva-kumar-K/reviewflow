import { cn } from '@/lib/utils';
import type { DiffFile } from '@/lib/diff';

// Purely presentational — no hooks, no 'use client'. Renders one file's
// hunks as colored monospace: green for added lines, red for removed,
// muted for unchanged context, matching the plain-text +/- convention of
// the diff format itself.
export function DiffFileView({ file }: { file: DiffFile }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/50 px-3 py-1.5 font-mono text-xs font-medium">
        {file.path}
      </div>
      <div className="overflow-x-auto font-mono text-xs">
        {file.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex}>
            <div className="bg-muted/30 px-3 py-1 text-muted-foreground">{hunk.header}</div>
            {hunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  'whitespace-pre px-3',
                  line.type === 'add' &&
                    'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300',
                  line.type === 'remove' &&
                    'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300',
                  line.type === 'context' && 'text-foreground/80',
                )}
              >
                <span className="select-none text-foreground/40">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                {line.content}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
