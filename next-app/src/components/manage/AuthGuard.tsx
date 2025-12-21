"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace("/Auth/SignIn?redirect=" + encodeURIComponent(pathname));
      } else {
        setChecking(false);
      }
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        router.replace("/Auth/SignIn?redirect=" + encodeURIComponent(pathname));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-sm text-zinc-500">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400">
            AUNE ADMIN
          </p>
        </div>
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
        <div className="mb-3 h-0.5 w-40 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full w-1/2 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-zinc-900" />
        </div>
        <p className="text-xs tracking-wide text-zinc-500">
          正在进入管理后台，请稍候...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
