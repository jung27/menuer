"use client";

import { useRef, useState } from "react";

export type ShareStatus = "idle" | "copied" | "failed";
export type ShareFeedback = {
  status: ShareStatus;
  begin: () => (status: Exclude<ShareStatus, "idle">) => void;
};

export default function useShareFeedbackGroup() {
  const request = useRef<{ token: symbol; scope: string } | null>(null);
  const [result, setResult] = useState<{ key: string; scope: string; status: ShareStatus } | null>(null);

  function forButton(key: string, scope: string): ShareFeedback {
    return {
      status: result?.key === key ? result.status : "idle",
      begin() {
        const token = Symbol();
        request.current = { token, scope };
        setResult(null);
        return status => {
          // A later click or closing this date invalidates an unfinished copy.
          if (request.current?.token === token) setResult({ key, scope, status });
        };
      },
    };
  }

  function reset(scope: string) {
    if (request.current?.scope === scope) request.current = null;
    setResult(current => current?.scope === scope ? null : current);
  }

  return { forButton, reset };
}
