import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Image
        src="/assets/logo.png" // 👈 replace this with the actual filename (e.g. /A_logo_for_R.K._Njogu_&_Co._Advocates_is_displayed.png)
        alt="R.K. Njogu & Co. Advocates Logo"
        width={200} // adjust size as needed
        height={90}
        priority
      />
    </div>
  );
}
