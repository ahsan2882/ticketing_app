"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import { redirect, useParams, useRouter } from "next/navigation";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import StripeCheckout, { type Token } from "react-stripe-checkout";
import { useRequest } from "../../../hooks/use-request";
import { formatTime, getSecondsRemaining } from "../../../lib/utils/utils";
import type { Order } from "../../../models/order.model";
import type { RequestError } from "../../../models/request-error.model";
import { useCurrentUser } from "../../../providers/current-user-context-provider";

function OrderSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14 animate-pulse">
      <div className="flex flex-col items-center mb-10">
        <div className="h-6 w-40 bg-white/10 rounded-full mb-4" />
        <div className="h-8 w-64 bg-white/10 rounded mb-2" />
        <div className="h-4 w-80 bg-white/10 rounded" />
      </div>
      <div className="flex justify-center mb-10">
        <div className="w-36 h-36 rounded-full border-8 border-white/10" />
      </div>
      <div className="rounded-xl border border-white/10 overflow-hidden mb-8">
        <div className="h-11 bg-white/5" />
        <div className="bg-[#0b0b0f] p-6 space-y-4">
          <div className="h-5 w-1/2 bg-white/10 rounded" />
          <div className="h-3 w-1/3 bg-white/10 rounded" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
      </div>
      <div className="h-12 bg-white/10 rounded-md" />
    </div>
  );
}

const StripeCheckoutButton = StripeCheckout as unknown as ComponentType<
  ComponentProps<typeof StripeCheckout> & { children?: ReactNode }
>;

export default function CreatedOrder() {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const [order, setOrder] = useState<Order>();
  const [secondsLeft, setSecondsLeft] = useState<number>();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState<RequestError[] | null>(
    null,
  );
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const totalWindowRef = useRef<number>(null);
  const intervalRef = useRef<NodeJS.Timeout>(undefined);
  const { doRequest: fetchSingleOrder, errors } = useRequest<Order>({
    url: `/api/orders/${orderId}`,
    method: "get",
    onSuccess: (order) => {
      if (!order) return;
      setOrder(order);
      const remainingSeconds = getSecondsRemaining(order.expiresAt);
      setSecondsLeft(remainingSeconds);
      totalWindowRef.current = remainingSeconds;
    },
  });
  useEffect(() => {
    const fetchOrder = async () => {
      await fetchSingleOrder();
    };
    fetchOrder();
  }, []);
  const { doRequest: cancelOrder } = useRequest<Order>({
    url: `/api/orders/${orderId}`,
    method: "delete",
    onSuccess: () => {
      setOrder(undefined);
      router.push("/orders");
      router.refresh();
    },
  });

  const { doRequest: submitPayment } = useRequest<{
    id: string;
  }>({
    url: "/api/payments",
    method: "post",
    body: { orderId: order?.id ?? "" },
    onSuccess: (response) => {
      // router.push(`/orders/${orderId}/confirmation`);
      console.log({ response });
    },
  });

  const handleToken = async (token: Token) => {
    console.log({ token });
    if (!order || isPaying) return;
    setIsPaying(true);
    setPaymentErrors(null);
    try {
      await submitPayment();
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (!order) return;
    intervalRef.current = setInterval(() => {
      const remaining = getSecondsRemaining(order.expiresAt);
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(intervalRef.current);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [order]);
  if (currentUser === null) {
    return redirect(`/auth/signin?returnTo=/orders/${orderId}`);
  }
  const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY as string;
  if (errors) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Couldn't load your order</h1>
        {errors.map((err, i) => {
          return <p key={i}>{err.message}</p>;
        })}
        <button
          onClick={() => fetchSingleOrder()}
          className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-purple-600 to-fuchsia-500 hover:opacity-90 transition rounded-md px-6 py-3.5 text-sm font-bold"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!order || secondsLeft === undefined) {
    return <OrderSkeleton />;
  }
  const expired = secondsLeft === 0;
  const critical = secondsLeft > 0 && secondsLeft <= 60;
  const progress = secondsLeft / (totalWindowRef.current || 1);

  const ringColor = expired
    ? "stroke-red-500"
    : critical
      ? "stroke-amber-400"
      : "stroke-fuchsia-500";
  const textColor = expired
    ? "text-red-400"
    : critical
      ? "text-amber-400"
      : "text-white";
  const circumference = 2 * Math.PI * 54;
  return (
    <>
      <div className="text-center mb-10">
        {!expired ? (
          <>
            <div className="inline-flex items-center gap-2 border border-fuchsia-500/30 bg-fuchsia-500/10 rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-fuchsia-300 mb-4">
              <CheckCircle2 size={13} /> Order created
            </div>
            <h1 className="text-3xl font-extrabold mb-2 text-white">
              Complete your payment
            </h1>
            <p className="text-gray-400">
              Your seat is reserved. Finish checkout before the timer runs out.
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 border border-red-500/30 bg-red-500/10 rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-red-300 mb-4">
              <AlertTriangle size={13} /> Reservation expired
            </div>
            <h1 className="text-3xl font-extrabold mb-2 text-white">
              Your hold has released
            </h1>
            <p className="text-white">
              This seat has gone back on sale. You can try again from the event
              page.
            </p>
          </>
        )}
      </div>

      <div className="flex justify-center mb-10">
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="8"
              className="stroke-white/10"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={`${ringColor} transition-all duration-1000 ease-linear`}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-2xl font-mono font-bold tabular-nums ${textColor}`}
            >
              {expired ? "00:00" : formatTime(secondsLeft)}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-600 mt-1">
              {expired ? "Expired" : "Remaining"}
            </span>
          </div>
        </div>
      </div>

      {!expired && critical && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 mb-8 -mt-4">
          <AlertTriangle size={12} /> Less than a minute left — complete payment
          now to keep your seat.
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-white/10 mb-8">
        <div className="bg-linear-to-r from-purple-600 to-fuchsia-500 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/90">
            <Ticket size={14} /> Order summary
          </div>
          <span className="text-xs font-mono text-white/80">#{order.id}</span>
        </div>
        <div className="border-t border-dashed border-white/20" />

        <div className="bg-[#0b0b0f] p-6 space-y-5 text-white">
          <div>
            <h2 className="text-lg font-bold leading-snug">
              {order.ticket.title}
            </h2>
          </div>

          {/* <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-400">
              <MapPin size={13} className="text-gray-600" />
              {order.ticket.venue}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <CalendarDays size={13} className="text-gray-600" />
              {new Date(order.ticket.eventDate).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            {order.ticket.seat && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Armchair size={13} className="text-gray-600" />
                Seat {order.ticket.seat}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock size={13} className="text-gray-600" />
              {new Date(order.expiresAt).toLocaleTimeString()}
            </div>
          </div> */}

          <div className="border-t border-dashed border-white/10 pt-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">Total due</span>
            <span className="text-xl font-bold">${order.ticket.price}</span>
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

      {!expired ? (
        <div className="space-y-3">
          <StripeCheckoutButton
            stripeKey={STRIPE_KEY}
            token={handleToken}
            amount={Math.round(order.ticket.price * 100)}
            currency="usd"
            name="VenuePass"
            description={order.ticket.title}
            panelLabel="Pay"
            email={currentUser!.email}
          >
            <button
              disabled={isPaying}
              className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-purple-600 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-md px-6 py-3.5 text-sm font-bold"
            >
              {isPaying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  Proceed to payment <ChevronRight size={16} />
                </>
              )}
            </button>
          </StripeCheckoutButton>
          <button
            className="w-full flex items-center justify-center gap-2 border border-white/10 hover:bg-white/5 transition rounded-md px-6 py-3 text-sm text-gray-400"
            onClick={cancelOrder}
          >
            <X size={14} /> Cancel order
          </button>
        </div>
      ) : (
        <button
          onClick={() => router.push(`/tickets/${order.ticket.id}`)}
          className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-purple-600 to-fuchsia-500 hover:opacity-90 transition rounded-md px-6 py-3.5 text-sm font-bold"
        >
          Back to event <ChevronRight size={16} />
        </button>
      )}

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 mt-6">
        <ShieldCheck size={13} className="text-emerald-400" /> 100% buyer
        protection guaranteed
      </div>
    </>
  );
}
