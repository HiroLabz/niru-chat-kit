"use client";

import { useCallback, useState } from "react";

/** Why the last turn failed: the message shown beside Retry, and the backend's code and status. */
export function useStreamFailure() {
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const record = useCallback((message: string | null, code: string | null = null, status: number | null = null) => {
    setError(message);
    setErrorCode(code);
    setErrorStatus(status);
  }, []);

  const clear = useCallback(() => record(null), [record]);

  return { error, errorCode, errorStatus, record, clear };
}
