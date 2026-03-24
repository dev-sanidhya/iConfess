"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";

type SearchResult = {
  id: string;
  name: string;
  confessionCount: number;
  college: string | null;
  workplace: string | null;
  gym: string | null;
  neighbourhood: string | null;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    const timeout = setTimeout(() => search(val), 400);
    return () => clearTimeout(timeout);
  }

  return (
    <div className="py-2 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "#f0eeff" }}>Search</h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
          Find people on iConfess by name.
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-8">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "#4a4870" }}
        />
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={handleChange}
          className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm"
          style={{
            background: "rgba(30,30,63,0.5)",
            borderColor: "#1e1e3f",
            color: "#f0eeff",
          }}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "#c084fc", borderTopColor: "transparent" }} />
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {searched && results.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <User className="w-8 h-8 mx-auto mb-3" style={{ color: "#1e1e3f" }} />
            <p style={{ color: "#4a4870" }}>No one found for &quot;{query}&quot;</p>
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {results.map((result, i) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass glass-hover rounded-2xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
                  >
                    {result.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: "#f0eeff" }}>{result.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#4a4870" }}>
                      {result.college || result.workplace || result.gym || result.neighbourhood || "iConfess user"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Heart className="w-3 h-3" style={{ color: "#f472b6" }} />
                      <span className="text-xs" style={{ color: "#9b98c8" }}>
                        {result.confessionCount} confession{result.confessionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard/send?target=${result.id}&name=${encodeURIComponent(result.name)}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
                >
                  Confess
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
