import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <Loader2
        className="size-10 animate-spin text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
