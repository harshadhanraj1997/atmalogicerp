import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility function to merge class names.
 * Uses clsx for conditional class merging and tailwind-merge for conflict resolution.
 */
export function cn(...inputs: (string | undefined | boolean)[]) {
  return twMerge(clsx(inputs));
}
