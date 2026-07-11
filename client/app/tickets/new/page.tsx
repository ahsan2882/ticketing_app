import CreateTicketForm from "@/components/create-ticket/create-ticket-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

export default async function CreateNewTicket() {
  const { currentUser } = await getCurrentUser();
  if (!currentUser) {
    redirect("/auth/signin?returnTo=/tickets/new");
  }
  return (
    <>
      <div className="text-2xl font-mono uppercase tracking-widest text-fuchsia-400 mb-2">
        Sell Tickets
      </div>
      <h1 className="text-4xl font-extrabold mb-2 text-white">
        List a new ticket
      </h1>
      <p className="text-gray-400 mb-10">
        Fill in the details below. Fields marked{" "}
        <span className="text-fuchsia-400">*</span> are required to publish your
        listing.
      </p>
      <CreateTicketForm />
    </>
  );
}
