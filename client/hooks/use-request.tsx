"use client";

import axios, { AxiosResponse } from "axios";
import { useState } from "react";
import { RequestError } from "@/models/request-error.model";

export function useRequest({
  url,
  method,
  body,
  onSuccess,
}: {
  url: string;
  method: "get" | "post";
  body?: Record<string, any>;
  onSuccess?: (res?: any) => void;
}) {
  const [errors, setErrors] = useState<any>(null);
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const doRequest = async () => {
    setErrors(null);
    setErrorFields([]);
    try {
      let response: AxiosResponse<any, any, {}>;
      if (method === "get") {
        response = await axios[method](url);
      } else {
        if (body) {
          response = await axios[method](url, body);
        } else {
          response = await axios[method](url);
        }
      }
      if (onSuccess) {
        onSuccess(response.data);
      }
      return response.data;
    } catch (err: any) {
      const errors = err.response.data.errors as RequestError[];
      setErrors(
        <>
          {errors.map((err, i) => {
            return (
              <div key={i} className="text-red-500 w-full">
                {err.message}
              </div>
            );
          })}
        </>,
      );
      const fields = [
        ...new Set(
          errors
            .map((error) => error.field)
            .filter((field): field is string => !!field),
        ),
      ];
      setErrorFields(fields);
    }
  };

  return { doRequest, errors, errorFields };
}
