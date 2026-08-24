import React from 'react';

const SKELETON_COLUMNS = 4;
const SKELETON_CARDS = 3;

export const BoardSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full flex gap-4">
      {Array.from({ length: SKELETON_COLUMNS }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="w-[300px] shrink-0 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl flex flex-col h-full max-h-full overflow-hidden animate-pulse"
        >
          <div className="p-4 border-b border-zinc-800/80">
            <div className="h-4 w-2/3 bg-zinc-800/50 rounded" />
          </div>
          <div className="flex-1 px-3 py-4 space-y-3">
            {Array.from({ length: SKELETON_CARDS }).map((_, cardIdx) => (
              <div key={cardIdx} className="h-20 bg-zinc-800/50 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
