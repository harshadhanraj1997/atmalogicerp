import * as React from "react";

import { cn } from "@/lib/utils";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-full rounded-lg border-l-4 p-4 bg-red-100 text-red-700 border-red-500",
      className
    )}
    {...props}
  />
));
Alert.displayName = "Alert";

export { Alert };
