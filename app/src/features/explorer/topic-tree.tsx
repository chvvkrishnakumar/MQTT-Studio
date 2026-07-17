import { useMemo, useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopicState } from './store';

interface Node {
  seg: string;
  path: string;
  children: Map<string, Node>;
  state?: TopicState;
  descendants: number;
  /** newest update time across this node + all descendants */
  subtreeUpdatedAt: number;
}

function buildTree(topics: Record<string, TopicState>): Node {
  const root: Node = { seg: '', path: '', children: new Map(), descendants: 0, subtreeUpdatedAt: 0 };
  for (const t of Object.values(topics)) {
    let cur = root;
    let path = '';
    for (const seg of t.topic.split('/')) {
      path = path ? `${path}/${seg}` : seg;
      let child = cur.children.get(seg);
      if (!child) {
        child = { seg, path, children: new Map(), descendants: 0, subtreeUpdatedAt: 0 };
        cur.children.set(seg, child);
      }
      cur.descendants++;
      child.subtreeUpdatedAt = Math.max(child.subtreeUpdatedAt, t.updatedAt);
      cur = child;
    }
    cur.state = t;
  }
  return root;
}

function preview(payload: string) {
  const flat = payload.replace(/\s+/g, ' ').trim();
  return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}

interface RowProps {
  node: Node;
  depth: number;
  selected?: string;
  exporting: Set<string>;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (topic: string) => void;
}

function Row({ node, depth, selected, exporting, expanded, onToggle, onSelect }: RowProps) {
  const children = [...node.children.values()].sort((a, b) => a.seg.localeCompare(b.seg));
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(node.path);
  const isSelected = node.state && selected === node.path;
  const isExporting = node.state && exporting.has(node.path);

  // Shimmer the deepest *visible* node on a path: an expanded folder defers to
  // its (visible) children and only reacts to its own message; a collapsed
  // folder — or any leaf — reacts to its whole subtree.
  const shimmerAt =
    hasChildren && isOpen ? node.state?.updatedAt : node.subtreeUpdatedAt || undefined;

  return (
    <div>
      <div
        className={cn(
          'relative flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors',
          isSelected
            ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
            : 'hover:bg-accent/40',
        )}
        style={{ paddingLeft: depth * 14 + 6 }}
        onClick={() => {
          if (hasChildren) onToggle(node.path);
          if (node.state) onSelect(node.path);
        }}
      >
        {shimmerAt && (
          <span
            key={shimmerAt}
            className="live-shimmer pointer-events-none absolute inset-0"
          />
        )}

        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform',
            hasChildren ? 'opacity-100' : 'opacity-0',
            isOpen && 'rotate-90',
          )}
        />

        <span className={cn('truncate font-medium', node.state && 'text-primary')}>
          {node.seg}
        </span>

        {node.state ? (
          <span className="ml-2 min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {preview(node.state.payload)}
          </span>
        ) : (
          <span className="ml-2 flex-1" />
        )}

        {isExporting && (
          <Download
            className="ml-auto size-3.5 shrink-0 animate-pulse text-emerald-500"
            aria-label="Live export in progress"
          />
        )}

        <span
          className={cn(
            'shrink-0 rounded-full bg-muted/70 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground',
            !isExporting && 'ml-auto',
          )}
        >
          {node.state ? node.state.count : node.descendants}
        </span>
      </div>

      {hasChildren && isOpen && (
        <div>
          {children.map((c) => (
            <Row
              key={c.path}
              node={c}
              depth={depth + 1}
              selected={selected}
              exporting={exporting}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  topics: Record<string, TopicState>;
  selected?: string;
  /** Topics with a live export running, flagged in the tree. */
  exporting?: Set<string>;
  onSelect: (topic: string) => void;
}

const NO_EXPORTS: Set<string> = new Set();

export default function TopicTree({ topics, selected, exporting = NO_EXPORTS, onSelect }: Props) {
  // Collapsed by default — expanding is manual.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const root = useMemo(() => buildTree(topics), [topics]);
  const roots = [...root.children.values()].sort((a, b) => a.seg.localeCompare(b.seg));

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  if (roots.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No topics yet. Connect and subscribe to start receiving messages.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      {roots.map((n) => (
        <Row
          key={n.path}
          node={n}
          depth={0}
          selected={selected}
          exporting={exporting}
          expanded={expanded}
          onToggle={toggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
