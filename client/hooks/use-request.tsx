"use client";

import { RequestError } from "@/models/request-error.model";
import axios from "axios";
import { useState } from "react";

export function useRequest<TResponse = unknown>({
  url,
  method,
  body,
  onSuccess,
}: {
  url: string;
  method: "get" | "post";
  body?: Record<string, unknown>;
  onSuccess?: (res?: TResponse) => void;
}) {
  const [errors, setErrors] = useState<RequestError[] | null>(null);
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const doRequest = async () => {
    setErrors(null);
    setErrorFields([]);
    try {
      const response =
        method === "get"
          ? await axios.get<TResponse>(url)
          : await axios.post<TResponse>(url, body);
      if (onSuccess) {
        onSuccess(response.data);
      }
      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errors = (err.response?.data?.errors || []) as RequestError[];
        if (errors) {
          setErrors(errors);
          const fields = [
            ...new Set(
              errors
                .map((error) => error.field)
                .filter((field): field is string => !!field),
            ),
          ];
          setErrorFields(fields);
        }
      } else {
        console.error("Unexpected error:", err);
      }
    }
  };

  return { doRequest, errors, errorFields };
}
