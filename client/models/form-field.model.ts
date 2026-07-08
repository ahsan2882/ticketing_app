import type { HTMLInputTypeAttribute } from "react";

export interface FormFieldProps {
  label: string;
  name: string;
  id: string;
  type: HTMLInputTypeAttribute;
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  icon: React.ReactNode;
  rightLabel?: React.ReactNode; // for "Forgot?" link
  inputClassName?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}
