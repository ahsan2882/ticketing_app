import type { HTMLInputTypeAttribute } from "react";

export interface BaseFormFieldProps {
  value: string;
  onChange: (val: string) => void;
  wrapperClassName?: string;
  onBlur?: () => void;
}

export interface FormFieldProps extends BaseFormFieldProps {
  label: string;
  name: string;
  id: string;
  placeholder: string;
  type?: HTMLInputTypeAttribute;
  isTextArea?: boolean;
  hasError?: boolean;
  icon?: React.ReactNode;
  autoComplete?: string;
  rightLabel?: React.ReactNode; // for "Forgot?" link
  inputClassName?: string;
  labelClassName?: string;
  required?: boolean;
  pattern?: string;
}

export interface DropdownFormFieldProps extends BaseFormFieldProps {
  label: string;
  name: string;
  id: string;
  placeholder: string;
  selectOptions: { label: string; value: string }[];
  hasError?: boolean;
  icon?: React.ReactNode;
  inputClassName?: string;
  labelClassName?: string;
  required?: boolean;
}

export interface RadioFormFieldProps extends BaseFormFieldProps {
  radioOptions: { label: string; value: string }[];
  legendText: string;
}
