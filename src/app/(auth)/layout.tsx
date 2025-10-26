
import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/30">
        <div className="absolute inset-0 flex items-center justify-center -z-10">
            <Logo className="w-1/2 h-auto opacity-5" />
        </div>
        {children}
    </div>
  );
}
