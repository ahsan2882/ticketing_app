"use client";

import type { DropdownFormFieldProps } from "@/models/form-field.model";

export default function DropdownFormField({
  label,
  name,
  id,
  placeholder,
  value,
  onChange,
  hasError,
  icon,
  inputClassName = "",
  wrapperClassName = "",
  labelClassName = "",
  selectOptions = [],
  required = false,
}: DropdownFormFieldProps) {
  return (
    <fieldset className="space-y-1.5 border-none p-0 m-0">
      <label
        htmlFor={id}
        className={`block text-sm font-mono font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 ${labelClassName}`}
      >
        {required && <span className="text-fuchsia-400">*</span>}
        {label}
      </label>

      <span
        className={`relative group flex items-center bg-zinc-800/60 border focus-within:bg-zinc-800 focus-within:ring-1 focus-within:ring-violet-500/40 transition-all duration-200 rounded-none ${hasError ? "border-red-500" : "border-zinc-700 focus-within:border-violet-500"} ${wrapperClassName}`}
      >
        {icon && (
          <span className="absolute left-3.5 text-zinc-600 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none shrink-0">
            {icon}
          </span>
        )}
        <select
          name={name}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-invalid={hasError}
          className={`w-full appearance-none bg-transparent text-zinc-100 placeholder-zinc-600 ${icon ? "pl-10" : "pl-4"} pr-4 py-3 text-sm focus:outline-none ${inputClassName}`}
        >
          <option value="" disabled className="bg-black text-white">
            {placeholder}
          </option>
          {selectOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-black text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </fieldset>
  );
}
