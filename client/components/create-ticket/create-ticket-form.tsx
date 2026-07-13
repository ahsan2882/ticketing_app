"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type SyntheticEvent } from "react";
import { useRequest } from "../../hooks/use-request";
import { EVENT_TYPES, TICKET_CATEGORIES } from "../../models/ticket.model";
import DropdownFormField from "../ui/dropdown-form-field";
import FormField from "../ui/form-field";
import CalendarIcon from "../ui/icons/calendar-svg";
import DollarIcon from "../ui/icons/dollar-svg";
import HashIcon from "../ui/icons/hash-svg";
import ImageIcon from "../ui/icons/image-svg";
import LocationIcon from "../ui/icons/location-svg";
import MusicIcon from "../ui/icons/music-svg";
import SeatIcon from "../ui/icons/seat-svg";
import TagIcon from "../ui/icons/tag-svg";
import TicketIcon from "../ui/icons/ticket-svg";

const SEATS_VS_QUANTITY = [
  { value: "quantity", label: "Quantity" },
  { value: "seats", label: "Seats" },
];

export default function CreateTicketForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [price, setPrice] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [seats, setSeats] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [allocationMode, setAllocationMode] = useState(
    SEATS_VS_QUANTITY[0].value,
  );

  const handlePriceChange = (value: string | number): void => {
    const nextValue = String(value);
    const allowedPattern = /^(?:\d+(?:\.\d{0,2})?)?$/;

    if (allowedPattern.test(nextValue)) {
      setPrice(nextValue);
    }
  };

  const { doRequest, errors, errorFields } = useRequest({
    url: "/api/tickets",
    method: "post",
    body: {
      title,
      price: Number(price),
      artist,
      venue,
      city,
      eventDate: eventDate ? new Date(`${eventDate}`).toISOString() : "",
      eventType,
      category,
      ...(description && { description }),
      ...(imageUrl && { imageUrl }),
      ...(seats && { seats: seats.split(",") }),
      ...(quantity && { quantity }),
    },
    onSuccess: (res) => {
      router.push("/tickets");
      router.refresh();
    },
  });

  const onFormSubmitHandler = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    await doRequest();
  };

  const switchAllocationMode = (mode: string) => {
    setAllocationMode(mode);
  };

  const sanitizePrice = () => {
    const value = parseFloat(price);
    if (isNaN(value)) {
      setPrice("");
    } else if (value <= 0) {
      setPrice("");
    } else {
      setPrice(value.toFixed(2));
    }
  };

  useEffect(() => {
    if (allocationMode === "seats") {
      setQuantity("");
    }
    if (allocationMode === "quantity") {
      setSeats("");
    }
  }, [allocationMode]);
  return (
    <>
      <form className="pt-7 pb-6 space-y-5" onSubmit={onFormSubmitHandler}>
        <div className="rounded-xl border border-white/10">
          <div className="bg-linear-to-r from-purple-600 to-fuchsia-500 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/90">
              <TicketIcon customClass="w-5 h-5 text-white" /> New listing
            </div>
            <TagIcon customClass="w-5 h-5 text-white" />
          </div>
          <div className="px-6 pt-6">
            {errors &&
              errors.map((err, i) => {
                return (
                  <div key={i} className="text-red-500 w-full">
                    {err.message}
                  </div>
                );
              })}
          </div>
          <div className="bg-[#0b0b0f] p-6 sm:p-8 space-y-6">
            <FormField
              label="Title"
              name="title"
              id="title"
              type="text"
              placeholder="Enter ticket title"
              icon={<TagIcon customClass="w-3 h-3 text-gray-500" />}
              labelClassName="flex items-center mt-2"
              inputClassName="tracking-widest"
              value={title}
              onChange={setTitle}
              required={true}
              hasError={errorFields.includes("title")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
              <FormField
                label="Artist"
                name="artist"
                id="artist"
                type="text"
                placeholder="Mufti Tariq Masood"
                icon={<MusicIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center mt-2"
                inputClassName="tracking-widest"
                value={artist}
                onChange={setArtist}
                required={true}
                hasError={errorFields.includes("artist")}
              />
              <FormField
                label="Price"
                name="price"
                id="price"
                type="text"
                placeholder="2000"
                icon={<DollarIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center mt-2"
                inputClassName="tracking-widest"
                value={price}
                onChange={handlePriceChange}
                required={true}
                onBlur={sanitizePrice}
                pattern="^\d+(?:\.\d{2})?$"
                hasError={errorFields.includes("price")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                label="Venue"
                name="venue"
                id="venue"
                type="text"
                placeholder="Venue Name"
                icon={<LocationIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center mt-2"
                inputClassName="tracking-widest"
                value={venue}
                onChange={setVenue}
                required={true}
                hasError={errorFields.includes("venue")}
              />
              <FormField
                label="City"
                name="city"
                id="city"
                type="text"
                placeholder="Karachi"
                icon={<LocationIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center mt-2"
                inputClassName="tracking-widest"
                value={city}
                onChange={setCity}
                required={true}
                hasError={errorFields.includes("city")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                label="Event Date"
                name="eventDate"
                id="eventDate"
                type="date"
                placeholder="11/21/2027"
                icon={<CalendarIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center mt-2"
                inputClassName="tracking-widest"
                value={eventDate}
                onChange={setEventDate}
                required={true}
                hasError={errorFields.includes("eventDate")}
              />
              <DropdownFormField
                label="Event Type"
                name="eventType"
                id="eventType"
                placeholder="Select Event Type"
                icon={<TicketIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center mt-2"
                inputClassName="tracking-widest"
                value={eventType}
                onChange={setEventType}
                selectOptions={EVENT_TYPES}
                required={true}
                hasError={errorFields.includes("eventType")}
              />
            </div>
            <DropdownFormField
              label="Category"
              name="category"
              id="category"
              placeholder="Select category"
              icon={<TagIcon customClass="w-3 h-3 text-gray-500" />}
              labelClassName="flex items-center mt-2"
              inputClassName="tracking-widest"
              value={category}
              onChange={setCategory}
              selectOptions={TICKET_CATEGORIES}
              required={true}
              hasError={errorFields.includes("category")}
            />
            <div className="border-t border-white/10 pt-6 mt-6">
              <div className="text-md font-mono uppercase tracking-wider text-gray-600 mb-5">
                Optional details
              </div>
              <FormField
                isTextArea={true}
                label="Details"
                name="details"
                id="details"
                placeholder="Add extra details buyers should know about this ticket..."
                labelClassName="flex items-center justify-between"
                inputClassName="tracking-widest resize-y"
                value={description}
                onChange={setDescription}
                hasError={errorFields.includes("description")}
              />
              <FormField
                label="Image URL"
                name="imageUrl"
                id="ImageUrl"
                placeholder="https://..."
                icon={<ImageIcon customClass="w-3 h-3 text-gray-500" />}
                labelClassName="flex items-center justify-between mt-2"
                inputClassName="tracking-widest"
                value={imageUrl}
                onChange={setImageUrl}
                hasError={errorFields.includes("imageUrl")}
              />
              <label className="flex items-center gap-1.5 text-md font-mono uppercase tracking-wider text-gray-500 my-2">
                Allocation
              </label>
              <div className="inline-flex rounded-md border border-white/10 bg-black/40 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => switchAllocationMode("quantity")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium transition ${
                    allocationMode === "quantity"
                      ? "bg-linear-to-r from-purple-600 to-fuchsia-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <HashIcon customClass="w-3 h-3 text-gray-500" /> Quantity
                </button>
                <button
                  type="button"
                  onClick={() => switchAllocationMode("seats")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium transition ${
                    allocationMode === "seats"
                      ? "bg-linear-to-r from-purple-600 to-fuchsia-500 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <SeatIcon customClass="w-3 h-3 text-gray-500" />
                  Specific seats
                </button>
              </div>
              {allocationMode === SEATS_VS_QUANTITY[0].value ? (
                <>
                  <FormField
                    label="Quantity"
                    name="quantity"
                    id="quantity"
                    placeholder="2"
                    type="text"
                    icon={<HashIcon customClass="w-3 h-3 text-gray-500" />}
                    labelClassName="flex items-center justify-between mt-2"
                    inputClassName="tracking-widest"
                    value={quantity}
                    onChange={setQuantity}
                    hasError={errorFields.includes("quantity")}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Number of identical tickets available, no specific seats
                    assigned.
                  </p>
                </>
              ) : (
                <>
                  <FormField
                    label="Seats"
                    name="seats"
                    id="seats"
                    type="text"
                    placeholder="Sec A Row 12 Seat 4, Sec A Row 12 Seat 5"
                    icon={<SeatIcon customClass="w-3 h-3 text-gray-500" />}
                    labelClassName="flex items-center justify-between mt-2"
                    inputClassName="tracking-widest"
                    value={seats}
                    onChange={setSeats}
                    hasError={errorFields.includes("seats")}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Comma-separated list of specific seats for this listing.
                  </p>
                </>
              )}
            </div>
            <div className="border-t border-white/10 mt-6">
              <div className="bg-[#0b0b0f] px-6 sm:px-8 pt-6 flex items-center justify-between">
                <span className="text-xs text-gray-600 font-mono">
                  VENUEPASS™ · SELLER LISTING
                </span>
                <button
                  type="submit"
                  className="flex items-center text-white gap-2 bg-linear-to-r from-purple-600 to-fuchsia-500 hover:opacity-90 transition rounded-md px-6 py-3 text-sm font-bold"
                >
                  Publish listing <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
