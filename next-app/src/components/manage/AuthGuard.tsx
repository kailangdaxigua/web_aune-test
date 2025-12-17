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
      <div className="flex min-h-[50vh] items-center justify-center bg-[#050509] text-sm text-zinc-400">
        正在验证登录状态...
      </div>
    );
  }

  return <>{children}</>;
}
