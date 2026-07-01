"use client";

import type { ComponentProps } from "react";
import {
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
  useController,
} from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props<T extends FieldValues, N extends FieldPath<T>> = UseControllerProps<T, N> & {
  label: string;
  description?: string;
  inputProps?: ComponentProps<typeof Input>;
};

export function TextField<T extends FieldValues, N extends FieldPath<T>>({
  label,
  description,
  inputProps,
  ...controller
}: Props<T, N>) {
  const { field, fieldState } = useController(controller);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Input
          {...inputProps}
          {...field}
          value={field.value ?? ""}
          aria-invalid={!!fieldState.error}
        />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
    </FormItem>
  );
}
