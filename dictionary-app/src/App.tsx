import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function highlight(text: string, query: string) {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={i} className="bg-yellow-200 font-semibold">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const showDropdown = isOpen && results.length > 0;

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const runSearch = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }

      const res = await window.api.search(debouncedQuery);
      setResults(res.slice(0, 8));
      setActiveIndex(-1);
    };

    runSearch();
  }, [debouncedQuery]);

  useEffect(() => {
    if (activeIndex >= 0) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = async (item: any) => {
    const data = await window.api.getWord(item.id);
    setSelected(data);
    setResults([]);
    setQuery(item.korean);
    setIsOpen(false);

    contentRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        handleSelect(results[activeIndex]);
      }
    }

    if (e.key === "Escape") {
      setResults([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col items-center">
      {/*Search */}
      <div ref={containerRef} className="w-full max-w-xl mt-10 relative">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsOpen(true);
              if (query) {
                window.api.search(query).then((res: any[]) => {
                  setResults(res.slice(0, 8));
                });
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search Korean or English..."
            className="w-full px-5 py-4 pr-12 text-lg rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/*Clear button */}
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setActiveIndex(-1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              X
            </button>
          )}
        </div>

        {/*Autocomplete */}
        <AnimatePresence>
          {showDropdown &&
            (results.length > 0 || (query === "" && history.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full mt-2 w-full rounded-2xl border shadow-lg bg-white overflow-hidden z-20"
              >
                <div className="max-h-80 overflow-y-auto">
                  {results.map((item, index) => (
                    <div
                      key={item.id}
                      ref={(el) => (itemRefs.current[index] = el)}
                      onClick={() => handleSelect(item)}
                      className={`px-4 py-3 cursor-pointer transition ${
                        index === activeIndex
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-semibold text-lg">
                        {highlight(item.korean, query)}
                      </div>

                      <div className="text-sm text-gray-500">
                        {highlight(item.translated_word || "", query)}
                      </div>

                      <div className="text-xs text-gray-400 truncate">
                        {highlight(item.translated_definition || "", query)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/*Detail */}
      <div ref={contentRef} className="flex-1 w-full overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-2xl mx-auto">
            {/* Word Header */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h1 className="text-4xl font-bold">{selected.korean}</h1>

              <div className="flex items-center gap-3 mt-2 text-gray-500">
                <span>{selected.pronunciation}</span>
                <span className="px-2 py-1 text-xs bg-gray-200 rounded">
                  {selected.part_of_speech}
                </span>
              </div>
            </div>
            {/* Translation */}
            <div className="mt-4 bg-white rounded-2xl shadow-sm p-6">
              <p className="font-medium">{selected.translated_word}</p>
              <p className="text-gray-700 mt-1">
                {selected.translated_definition}
              </p>
            </div>

            {/* Korean definition */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-lg mb-2">Korean Definition</h2>
              <p className="text-gray-800 leading-relaxed">
                {selected.korean_definition}
              </p>
            </div>

            {/* Examples */}
            <div className="mt-4 bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-lg mb-2">Examples</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {selected.examples}
              </p>
            </div>

            {/* Audio */}
            {!online ? (
              <p className="text-sm text-red-400">
                Audio requires internet connection.
              </p>
            ) : (
              selected.sound_url && (
                <div className="mt-4 bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="font-semibold text-lg mb-2">Pronunciation </h2>
                  <audio controls src={selected.sound_url} />
                </div>
              )
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 mt-20">
            Search for a word to begin
          </div>
        )}
      </div>
    </div>
  );
}
