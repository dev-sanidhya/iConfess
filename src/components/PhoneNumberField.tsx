"use client";

import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PhoneNumberFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
  prefixClassName?: string;
  inputClassName?: string;
  prefix?: string;
};

export default function PhoneNumberField({
  value,
  onChange,
  containerClassName,
  prefixClassName,
  inputClassName,
  prefix = "+91",
  ...props
}: PhoneNumberFieldProps) {
  return (
    <div className={cn("flex items-stretch gap-2 min-w-0 w-full", containerClassName)}>
      <span
        className={cn(
          "flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-xl border px-3 text-sm whitespace-nowrap",
          prefixClassName
        )}
      >
        {prefix}
      </span>
      <input
        {...props}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className={cn(
          "min-w-0 flex-1 w-0 rounded-xl border px-4 py-2.5 text-sm",
          inputClassName
        )}
      />
    </div>
  );
}
