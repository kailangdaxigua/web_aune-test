"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const mfaInputRef = useRef<HTMLInputElement | null>(null);

  const currentStep = useMemo(
    () => (mfaRequired ? "mfa" : "credentials"),
    [mfaRequired]
  );

  useEffect(() => {
    let cancelled = false;

    async function maybeRedirectIfAuthed() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;
        if (!session?.user) return;

        // Admin check (align with Vue useAuth.checkAdminStatus)
        const { data: adminUser, error } = await supabase
          .from("admin_users")
          .select("id")
          .eq("id", session.user.id)
          .eq("is_active", true)
          .single();

        if (cancelled) return;

        if (error || !adminUser) {
          await supabase.auth.signOut();
          return;
        }

        router.replace("/Manage");
      } catch {
        // ignore
      }
    }

    maybeRedirectIfAuthed();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function checkAdminOrSignOut(): Promise<
    | { ok: true; userId: string }
    | { ok: false; message: string }
  > {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) {
      return { ok: false, message: "未登录" };
    }

    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", userId)
      .eq("is_active", true)
      .single();

    if (error || !adminUser) {
      await supabase.auth.signOut();
      return { ok: false, message: "非管理员账户，无权访问后台" };
    }

    return { ok: true, userId };
  }

  async function updateLastLogin(userId: string) {
    await supabase
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || "登录失败");
      setLoading(false);
      return;
    }

    try {
      // Check if MFA required (align with Vue useAuth.signIn)
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (factorsError) {
        throw factorsError;
      }

      const totpFactor = factors?.totp?.[0];
      if (totpFactor?.id) {
        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

        if (challengeError) {
          throw challengeError;
        }

        setMfaFactorId(totpFactor.id);
        setMfaChallengeId(challengeData.id);
        setMfaRequired(true);

        setTimeout(() => {
          mfaInputRef.current?.focus();
        }, 100);
        return;
      }

      // No MFA required, admin check + last_login
      const adminCheck = await checkAdminOrSignOut();
      if (!adminCheck.ok) {
        setError(adminCheck.message);
        return;
      }

      const adminUserId = adminCheck.userId;
      await updateLastLogin(adminUserId);
      router.replace("/Manage");
    } catch (err: any) {
      setError(err?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e?: FormEvent) {
    e?.preventDefault();

    if (!mfaCode || mfaCode.length !== 6) {
      setError("请输入6位验证码");
      return;
    }

    if (!mfaFactorId || !mfaChallengeId) {
      setError("MFA 验证会话无效");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode.trim(),
      });

      if (verifyError) {
        setMfaCode("");
        setError(verifyError.message || "MFA 验证失败");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        setError("登录状态异常，请重新登录");
        return;
      }

      // Update mfa_verified_at
      await supabase
        .from("admin_users")
        .update({ mfa_verified_at: new Date().toISOString() })
        .eq("id", userId);

      const adminCheck = await checkAdminOrSignOut();
      if (!adminCheck.ok) {
        setError(adminCheck.message);
        return;
      }

      await updateLastLogin(userId);

      setMfaRequired(false);
      setMfaFactorId(null);
      setMfaChallengeId(null);
      router.replace("/Manage");
    } catch (err: any) {
      setError(err?.message || "MFA 验证失败");
    } finally {
      setLoading(false);
    }
  }

  async function goBackToCredentials() {
    await supabase.auth.signOut();
    setMfaRequired(false);
    setMfaFactorId(null);
    setMfaChallengeId(null);
    setMfaCode("");
    setError(null);
  }

  function handleMfaInput(value: string) {
    const sanitized = value.replace(/\D/g, "").slice(0, 6);
    setMfaCode(sanitized);
    if (sanitized.length === 6) {
      void handleMfaSubmit();
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050509] px-4">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-black to-zinc-950" />
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wide text-white">
            AUNE<span className="text-amber-500">.</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">管理后台登录</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {currentStep === "credentials" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  placeholder="admin@auneaudio.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-amber-500/30 transition-colors hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "登录中..." : "登录"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                  <svg
                    className="h-8 w-8 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-white">双因素认证</h2>
                <p className="text-sm text-zinc-400">
                  请输入 Google Authenticator 中显示的6位验证码
                </p>
              </div>

              <div>
                <input
                  ref={mfaInputRef}
                  value={mfaCode}
                  onChange={(e) => handleMfaInput(e.target.value)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-4 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-amber-500/30 transition-colors hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "验证中..." : "验证"}
              </button>

              <button
                type="button"
                onClick={goBackToCredentials}
                className="w-full text-center text-sm text-zinc-400 transition-colors hover:text-white"
              >
                ← 返回登录
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Aune Audio. All rights reserved.
        </p>
      </div>
    </div>
  );
}
