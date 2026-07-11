import type { FormFieldProps } from "@/models/form-field.model";

export default function FormField({
  label,
  name,
  id,
  type,
  placeholder,
  autoComplete,
  value,
  onChange,
  hasError,
  icon,
  rightLabel,
  inputClassName = "",
  wrapperClassName = "",
  labelClassName = "",
  required = false,
  isTextArea = false,
  onBlur = undefined,
  pattern = undefined,
}: FormFieldProps) {
  return (
    <fieldset className="space-y-1.5 border-none p-0 m-0">
      <label
        htmlFor={id}
        className={`block text-sm font-mono font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 ${labelClassName}`}
      >
        {isTextArea && icon && (
          <span className="absolute left-3.5 text-zinc-600 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none shrink-0">
            {icon}
          </span>
        )}
        {required && <span className="text-fuchsia-400">*</span>}
        {label}
        {!!rightLabel && rightLabel}
      </label>

      <span
        className={`relative group flex items-center bg-zinc-800/60 border focus-within:bg-zinc-800 focus-within:ring-1 focus-within:ring-violet-500/40 transition-all duration-200 rounded-none ${hasError ? "border-red-500" : "border-zinc-700 focus-within:border-violet-500"} ${wrapperClassName}`}
      >
        {!isTextArea && icon && (
          <span className="absolute left-3.5 text-zinc-600 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none shrink-0">
            {icon}
          </span>
        )}
        {isTextArea ? (
          <textarea
            id={id}
            name={name}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-transparent text-zinc-100 placeholder-zinc-600 px-4 py-3 text-sm focus:outline-none ${inputClassName}`}
          ></textarea>
        ) : (
          <input
            id={id}
            name={name}
            required={required}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            pattern={pattern}
            className={`w-full bg-transparent text-zinc-100 placeholder-zinc-600 pl-10 pr-4 py-3 text-sm focus:outline-none ${inputClassName}`}
          />
        )}
      </span>
    </fieldset>
  );
}
