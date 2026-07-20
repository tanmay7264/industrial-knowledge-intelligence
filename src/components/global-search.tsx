"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchSeeds } from "@/lib/seed";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ReturnType<typeof searchSeeds> | null>(
    null
  );

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      setResults(searchSeeds(value.trim()));
      setOpen(true);
    } else {
      setResults(null);
      setOpen(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/rca?query=${encodeURIComponent(query.trim())}`);
  };

  const hasResults =
    results &&
    (results.assets.length > 0 || results.alerts.length > 0);

  return (
    <div className="relative flex-1 min-w-0 max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search machine, symptoms, incidents, SOPs or experts..."
          className="pl-9 h-9 text-sm bg-muted border-border w-full min-w-0 sm:placeholder:text-muted-foreground"
        />
      </form>

      {open && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-background shadow-lg z-50 max-h-64 overflow-y-auto py-1">
          {results!.assets.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
              Assets
            </div>
          )}
          {results!.assets.slice(0, 5).map((a) => (
            <button
              key={a.tag}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex items-center justify-between gap-2"
              onMouseDown={() => router.push(`/assets/${a.tag}`)}
            >
              <span>
                <strong>{a.tag}</strong> — {a.name}
              </span>
              <span className="text-xs text-muted-foreground">{a.status}</span>
            </button>
          ))}
          {results!.alerts.slice(0, 3).map((a) => (
            <button
              key={a.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10"
              onMouseDown={() =>
                router.push(
                  `/rca?asset=${encodeURIComponent(a.assetTag)}&query=${encodeURIComponent(a.title)}`
                )
              }
            >
              <span className="text-xs text-muted-foreground">{a.severity}</span>{" "}
              {a.title}
            </button>
          ))}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 border-t"
            onMouseDown={() =>
              router.push(`/rca?query=${encodeURIComponent(query.trim())}`)
            }
          >
            Investigate: &ldquo;{query.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
