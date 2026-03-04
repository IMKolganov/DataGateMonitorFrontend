
// button.tsx
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 bg-[#238636] text-white rounded-md hover:bg-[#2ea043] transition-all border border-[#2ea043] focus:ring-2 focus:ring-offset-2 focus:ring-[#00d4ff] ${className}`}
      {...props}
    />
  );
}