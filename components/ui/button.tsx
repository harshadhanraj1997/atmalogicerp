
import * as React from "react";

import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-all",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
