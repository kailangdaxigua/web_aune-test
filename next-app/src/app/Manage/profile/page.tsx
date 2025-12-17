"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  created_at?: string | null;
};

type Step = "initial" | "enrolling" | "complete";

export default function AdminProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("initial");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState<string>("");

  const [existingFactors, setExistingFactors] = useState<TotpFactor[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const hasFactors = useMemo(() => existingFactors.length > 0, [existingFactors]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      setEmail(session?.user?.email || null);
      setUserId(session?.user?.id || null);

      await loadFactors();
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFactors() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setExistingFactors(((data?.totp || []) as any[]) as TotpFactor[]);
    } catch (err) {
      // ignore
    }
  }

  async function startEnrollment() {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Aune Audio Admin",
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setVerifyCode("");
      setStep("enrolling");
    } catch (err: any) {
      setErrorMessage(err?.message || "启用失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyEnrollment() {
    if (!verifyCode || verifyCode.length !== 6) {
      setErrorMessage("请输入6位验证码");
      return;
    }

    if (!factorId) {
      setErrorMessage("MFA 会话无效，请重新开始");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode.trim(),
      });
      if (verifyError) throw verifyError;

      if (userId) {
        await supabase
          .from("admin_users")
          .update({
            mfa_enabled: true,
            mfa_verified_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      setSuccessMessage("MFA 已成功启用！");
      setStep("complete");
      await loadFactors();
    } catch (err: any) {
      setErrorMessage(err?.message || "验证失败");
      setVerifyCode("");
    } finally {
      setIsLoading(false);
    }
  }

  async function removeFactor(id: string) {
    if (!window.confirm("确定要禁用双因素认证吗？这将降低账户安全性。")) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;

      if (userId) {
        await supabase
          .from("admin_users")
          .update({ mfa_enabled: false })
          .eq("id", userId);
      }

      setSuccessMessage("MFA 已禁用");
      setStep("initial");
      setQrCode("");
      setSecret("");
      setFactorId("");
      setVerifyCode("");
      await loadFactors();
    } catch (err: any) {
      setErrorMessage(err?.message || "禁用失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setSuccessMessage("密钥已复制到剪贴板");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch {
      setErrorMessage("复制失败");
    }
  }

  function handleVerifyInput(value: string) {
    const sanitized = value.replace(/\D/g, "").slice(0, 6);
    setVerifyCode(sanitized);
  }

  return (
    <div className="admin-profile max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">个人设置</h1>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-[#11111a] p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">账户信息</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">邮箱地址</label>
            <p className="text-white">{email || "-"}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">账户 ID</label>
            <p className="font-mono text-sm text-zinc-300">{userId || "-"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          双因素认证 (MFA)
        </h3>

        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {hasFactors && step === "initial" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">已启用的认证器：</p>

            {existingFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#0b0b12] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {factor.friendly_name || "Authenticator App"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      已验证 · {factor.created_at ? new Date(factor.created_at).toLocaleDateString("zh-CN") : "-"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeFactor(factor.id)}
                  disabled={isLoading}
                  className="rounded-lg px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  禁用
                </button>
              </div>
            ))}
          </div>
        )}

        {!hasFactors && step === "initial" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              启用双因素认证可以大大提高账户安全性。您需要使用 Google Authenticator 或其他兼容的 TOTP 应用。
            </p>

            <button
              onClick={startEnrollment}
              disabled={isLoading}
              className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-amber-500/30 transition-colors hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "设置中..." : "启用双因素认证"}
            </button>
          </div>
        )}

        {step === "enrolling" && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="mb-4 text-sm text-zinc-300">
                使用 Google Authenticator 扫描下方二维码：
              </p>

              <div className="inline-block rounded-xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="MFA QR Code" className="h-48 w-48" />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs text-zinc-500">或手动输入密钥：</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <code className="break-all rounded bg-zinc-900 px-3 py-2 font-mono text-sm text-amber-300">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    title="复制"
                    type="button"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-center text-sm text-zinc-300">
                输入应用中显示的6位验证码以完成设置：
              </p>
              <input
                value={verifyCode}
                onChange={(e) => handleVerifyInput(e.target.value)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-center font-mono text-xl tracking-[0.5em] text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                placeholder="000000"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("initial");
                  setQrCode("");
                  setSecret("");
                  setFactorId("");
                  setVerifyCode("");
                  setErrorMessage("");
                }}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                type="button"
              >
                取消
              </button>
              <button
                onClick={verifyEnrollment}
                disabled={isLoading || verifyCode.length !== 6}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
              >
                {isLoading ? "验证中..." : "完成设置"}
              </button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-white">双因素认证已启用</p>
            <p className="mt-1 text-sm text-zinc-400">您的账户现在更加安全了</p>

            <button
              onClick={() => setStep("initial")}
              className="mt-4 rounded-lg px-6 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              type="button"
            >
              返回
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
