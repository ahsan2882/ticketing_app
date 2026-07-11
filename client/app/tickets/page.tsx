"use client";
import {
  ChevronDown,
  Loader2,
  Search,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import LazyCard from "../../components/tickets/lazy-card";
import { useOnReachEnd } from "../../hooks/use-on-reach-end";
import { useRequest } from "../../hooks/use-request";
import { EVENT_TYPES, type TicketModel } from "../../models/ticket.model";

const PAGE_SIZE = 9;

export default function ListAllTickets() {
  const [allTickets, setAllTickets] = useState<TicketModel[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("soonest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const handleTicketsLoaded = useCallback((tickets?: TicketModel[]) => {
    if (!tickets) return;
    setAllTickets(tickets);
  }, []);
  const { doRequest } = useRequest<TicketModel[]>({
    url: "/api/tickets?limit=100",
    method: "get",
    onSuccess: handleTicketsLoaded,
  });
  useEffect(() => {
    const fetchTickets = async () => {
      await doRequest();
    };
    fetchTickets();
  }, []);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, category, sort]);
  const filtered = useMemo(() => {
    let list = allTickets.filter((t) => {
      const matchesCategory = category === "All" || t.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        t.artist.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.venue.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
    if (sort === "price-asc")
      list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc")
      list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [query, category, sort, allTickets]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Simulates a paginated fetch, e.g. GET /api/tickets?page=n — swap for a real request
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, hasMore, filtered.length]);

  const sentinelRef = useOnReachEnd(loadMore);
  return (
    <>
      <div className="text-2xl font-mono uppercase tracking-widest text-fuchsia-400 mb-2">
        Browse Events
      </div>
      <h1 className="text-4xl font-extrabold mb-2 text-white">
        All available tickets
      </h1>
      <p className="text-gray-400 mb-8">
        Showing {visible.length.toLocaleString()} of{" "}
        {filtered.length.toLocaleString()} listings
      </p>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artist, venue, or city..."
            className="w-full bg-black/40 border border-white/10 rounded-md pl-10 pr-3.5 py-2.5 text-sm placeholder-gray-600 outline-none focus:border-fuchsia-500/60 focus:ring-1 focus:ring-fuchsia-500/40"
          />
        </div>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-black/40 border border-white/10 rounded-md pl-3.5 pr-9 py-2.5 text-sm text-gray-300 outline-none focus:border-fuchsia-500/60"
          >
            <option value="soonest">Sort: Soonest</option>
            <option value="price-asc">Sort: Price (low to high)</option>
            <option value="price-desc">Sort: Price (high to low)</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
          />
        </div>

        <button className="flex items-center gap-2 border border-white/10 rounded-md px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5">
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-10">
        {EVENT_TYPES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-md border transition ${
              category === c.value
                ? "bg-linear-to-r from-purple-600 to-fuchsia-500 border-transparent text-white"
                : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((t) => (
              <LazyCard key={t.id} ticket={t} />
            ))}
          </div>

          {/* Sentinel — entering view triggers the next page load */}
          {hasMore && <div ref={sentinelRef} className="h-px" />}

          {loadingMore && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Loading more
              tickets...
            </div>
          )}

          {!hasMore && (
            <div className="text-center py-10 text-xs font-mono uppercase tracking-wider text-gray-700">
              You've reached the end · {filtered.length} of {filtered.length}{" "}
              listings
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-lg">
          <Ticket size={28} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No tickets match your filters.</p>
        </div>
      )}
    </>
  );
}
