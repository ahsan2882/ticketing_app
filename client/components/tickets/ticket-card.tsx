import { EventType } from "@venuepass/common/client";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { CATEGORY_STYLES, type TicketModel } from "../../models/ticket.model";

export default function TicketCard({ ticket }: { ticket: TicketModel }) {
  const style =
    CATEGORY_STYLES[ticket.eventType] ?? CATEGORY_STYLES[EventType.Conference];
  return (
    <Link href={`/tickets/${ticket.id}`}>
      <div
        className={`group rounded-lg border border-white/10 border-l-4 ${style.border} bg-[#0b0b0f] overflow-hidden hover:border-white/20 transition`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider border rounded px-2 py-1 ${style.chip}`}
            >
              {ticket.category}
            </span>
            <ArrowUpRight
              size={16}
              className="text-gray-600 group-hover:text-white transition"
            />
          </div>

          <h3 className="text-lg font-bold leading-snug mb-0.5">
            {ticket.artist}
          </h3>
          <p className="text-sm text-gray-500 mb-4">{ticket.title}</p>

          <div className="space-y-1.5 text-xs text-gray-400 mb-5">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-gray-600" />
              {ticket.venue} · {ticket.city}
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="text-gray-600" />
              {ticket.eventDate}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-dashed border-white/10">
            <div>
              <div className="text-[10px] font-mono uppercase text-gray-600">
                From
              </div>
              <div className="text-lg font-bold">${ticket.price}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
