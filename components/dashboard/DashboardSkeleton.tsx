import { motion } from 'framer-motion';

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted/60 ${className || ''}`} />;
}

export function DashboardSkeleton() {
  return (
    <motion.div
      className="space-y-6 sm:space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-9 w-9 rounded-lg" />
            </div>
            <Pulse className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Milestone skeleton */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Pulse className="h-4 w-28" />
          <Pulse className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center flex-1">
              <Pulse className="w-9 h-9 rounded-xl" />
              {i < 4 && <Pulse className="flex-1 h-0.5 mx-1" />}
            </div>
          ))}
        </div>
        <Pulse className="h-1.5 w-full rounded-full" />
      </div>

      {/* Timeline skeleton */}
      <div className="space-y-3">
        <Pulse className="h-4 w-40" />
        {[0, 1].map((i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-4">
            <Pulse className="w-2 h-2 rounded-full" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-48" />
              <Pulse className="h-3 w-32" />
            </div>
            <Pulse className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <Pulse className="h-4 w-32" />
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border/30 flex gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Pulse key={i} className="h-4 flex-1" />
            ))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b border-border/20 flex gap-4">
              {[0, 1, 2, 3, 4].map((j) => (
                <Pulse key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
