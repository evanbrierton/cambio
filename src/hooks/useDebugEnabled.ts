"use client";

import { useSearchParams } from "next/navigation";
import { hasDebugQueryParam } from "@/lib/debug";

export function useDebugEnabled(): boolean {
  const searchParams = useSearchParams();
  return hasDebugQueryParam(searchParams);
}
