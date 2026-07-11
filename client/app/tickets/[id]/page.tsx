"use client";

import { EventType } from "@venuepass/common/client";
import {
  CalendarDays,
  ChevronRight,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequest } from "../../../hooks/use-request";
import type { Order } from "../../../models/order.model";
import type { TicketModel } from "../../../models/ticket.model";

const CATEGORY_STYLES = {
  [EventType.Concert]: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  [EventType.Sports]:
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  [EventType.Theatre]: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  [EventType.Comedy]: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  [EventType.Festival]: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  [EventType.Conference]:
    "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
};

export default function TicketDetails() {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketModel>();
  const [saved, setSaved] = useState(false);
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const { doRequest: fetchSingleTicket } = useRequest<TicketModel>({
    url: `/api/tickets/${ticketId}`,
    method: "get",
    onSuccess: (ticket) => {
      setTicket(ticket);
    },
  });
  useEffect(() => {
    const fetchTicket = async () => {
      await fetchSingleTicket();
    };
    fetchTicket();
  }, []);

  const { doRequest: createOrder } = useRequest<Order>({
    url: "/api/orders",
    method: "post",
    body: { ticketId },
    onSuccess: (order) => {
      if (!order) return;
      router.push(`/orders/${order.id}`);
      router.refresh();
    },
  });

  const createAndNavigateToOrder = async () => {
    await createOrder();
  };
  return (
    <>
      {!ticket && <p>Loading...</p>}
      {ticket && (
        <>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-mono uppercase tracking-wide">
            <span className="hover:text-white cursor-pointer">
              Browse Events
            </span>
            <ChevronRight size={12} />
            <span className="hover:text-white cursor-pointer">
              {ticket.category}
            </span>
            <ChevronRight size={12} />
            <span className="text-gray-300">{ticket.artist}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-10">
            <>
              <div className="rounded-xl overflow-hidden border border-white/10 mb-6 text-white">
                <div className="relative h-56 sm:h-72 bg-linear-to-br from-purple-700 via-fuchsia-600 to-purple-900 flex items-center justify-center">
                  {ticket.imageUrl ? (
                    <img
                      src={ticket.imageUrl}
                      alt={ticket.artist}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Ticket size={56} className="text-white/25" />
                  )}
                  <div className="absolute top-4 left-4">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider border rounded px-2 py-1 ${CATEGORY_STYLES[ticket.eventType]}`}
                    >
                      {ticket.category}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => setSaved((s) => !s)}
                      className="w-9 h-9 rounded-md bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-black/60"
                    >
                      <Heart
                        size={15}
                        className={
                          saved
                            ? "fill-fuchsia-400 text-fuchsia-400"
                            : "text-white"
                        }
                      />
                    </button>
                    <button className="w-9 h-9 rounded-md bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-black/60">
                      <Share2 size={15} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-fuchsia-400 mb-2">
                {ticket.eventType}
              </div>
              <h1 className="text-4xl font-extrabold mb-1 text-white">
                {ticket.artist}
              </h1>
              <p className="text-lg text-gray-400 mb-6">{ticket.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-white">
                <div className="rounded-lg border border-white/10 bg-[#0b0b0f] p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-gray-600 mb-2">
                    <CalendarDays size={12} /> Date
                  </div>
                  <div className="text-sm font-semibold">
                    {ticket.eventDate}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0b0b0f] p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-gray-600 mb-2">
                    <MapPin size={12} /> Venue
                  </div>
                  <div className="text-sm font-semibold">{ticket.venue}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {ticket.city}
                  </div>
                </div>
              </div>
              {ticket.description && (
                <div className="mb-8 text-white">
                  <h2 className="text-sm font-mono uppercase tracking-wider text-gray-500 mb-3">
                    About this event
                  </h2>
                  <p className="text-gray-300 leading-relaxed">
                    {ticket.description}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-white/10 bg-[#0b0b0f] p-5 mb-8 text-white">
                <h2 className="text-sm font-mono uppercase tracking-wider text-gray-500 mb-3">
                  Venue
                </h2>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-fuchsia-400" />
                  </div>
                  <div>
                    <div className="font-semibold">{ticket.venue}</div>
                  </div>
                </div>
              </div>
            </>
            <div className="lg:sticky lg:top-6 h-fit text-white">
              <div className="rounded-xl overflow-hidden border border-white/10">
                <div className="bg-linear-to-r from-purple-600 to-fuchsia-500 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/90">
                    <Ticket size={14} /> Get tickets
                  </div>
                </div>
                <div className="border-t border-dashed border-white/20" />

                <div className="bg-[#0b0b0f] p-6 space-y-6">
                  <div className="flex items-baseline justify-between ">
                    <span className="text-[11px] font-mono uppercase ">
                      Price
                    </span>
                    <span className="text-3xl font-extrabold">
                      ${ticket.price}
                    </span>
                  </div>
                  <p className="text-xs  -mt-4">
                    One ticket per order. Limit 1 per customer.
                  </p>

                  <div className="border-t border-dashed border-white/10 pt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="text-xl font-bold">${ticket.price}</span>
                  </div>

                  <button
                    className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-purple-600 to-fuchsia-500 hover:opacity-90 text-black transition rounded-md px-6 py-3.5 text-sm font-bold"
                    onClick={createAndNavigateToOrder}
                  >
                    Buy this ticket <ChevronRight size={16} />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                    <ShieldCheck size={13} className="text-emerald-400" /> 100%
                    buyer protection guaranteed
                  </div>
                </div>

                <div className="border-t border-dashed border-white/20" />
                <div className="bg-[#0b0b0f] px-6 py-4">
                  <div className="flex gap-0.75 justify-center opacity-40">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-0.5 ${i % 3 === 0 ? "h-5" : "h-3"} bg-white`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
