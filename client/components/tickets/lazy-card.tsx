"use client";

import { useInView } from "../../hooks/use-in-view";
import type { TicketModel } from "../../models/ticket.model";
import CardSkeleton from "./card-skeleton";
import TicketCard from "./ticket-card";

export default function LazyCard({ ticket }: { ticket: TicketModel }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref}>
      {inView ? <TicketCard ticket={ticket} /> : <CardSkeleton />}
    </div>
  );
}
