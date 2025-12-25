"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const presetCategories = ["使用指南", "技术支持", "售后服务", "故障排查", "购买咨询", "其他"] as const;

type Faq = {
  id: number;
  question: string;
  answer_html: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
};

function stripHtml(html?: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

function getAnswerPreview(html?: string | null) {
  const text = stripHtml(html);
  return text.length > 100 ? text.substring(0, 100) + "..." : text;
}

export default function ManageFaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    question: "",
    answer_html: "",
    category: "",
    sort_order: 0,
    is_active: true,
    is_featured: false,
  });

  async function loadFaqs() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      setFaqs((data || []) as Faq[]);
    } catch (err: any) {
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFaqs();
  }, []);

  const categories = useMemo(() => {
    const cats = faqs.map((f) => f.category).filter(Boolean) as string[];
    const set = new Set<string>([...presetCategories, ...cats]);
    return Array.from(set);
  }, [faqs]);

  const filteredFaqs = useMemo(() => {
    if (filterCategory === "all") return faqs;
    return faqs.filter((f) => f.category === filterCategory);
  }, [faqs, filterCategory]);

  function openNewForm() {
    setEditingId(null);
    setForm({
      question: "",
      answer_html: "",
      category: "",
      sort_order: faqs.length,
      is_active: true,
      is_featured: false,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(faq: Faq) {
    setEditingId(faq.id);
    setForm({
      question: faq.question || "",
      answer_html: faq.answer_html || "",
      category: faq.category || "",
      sort_order: faq.sort_order ?? 0,
      is_active: faq.is_active,
      is_featured: faq.is_featured,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setErrorMessage("");
  }

  async function saveFaq() {
    if (!form.question.trim()) {
      setErrorMessage("请输入问题");
      return;
    }

    if (!form.answer_html.trim()) {
      setErrorMessage("请输入答案");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        question: form.question,
        answer_html: form.answer_html,
        category: form.category || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        is_featured: form.is_featured,
      };

      if (editingId) {
        const { error } = await supabase
          .from("faqs")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        setSuccessMessage("更新成功");
      } else {
        const { error } = await supabase.from("faqs").insert(payload);
        if (error) throw error;
        setSuccessMessage("创建成功");
      }

      await loadFaqs();
      closeForm();
    } catch (err: any) {
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  function deleteFaq(faq: Faq) {
    setDeleteTarget(faq);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("faqs").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      await loadFaqs();
      setSuccessMessage("删除成功");
    } catch (err: any) {
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function toggleActive(faq: Faq) {
    const newValue = !faq.is_active;

    setFaqs((prev) =>
      prev.map((f) => (f.id === faq.id ? { ...f, is_active: newValue } : f))
    );

    const { error } = await supabase
      .from("faqs")
      .update({ is_active: newValue })
      .eq("id", faq.id);

    if (error) {
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === faq.id ? { ...f, is_active: !newValue } : f
        )
      );
    }
  }

  async function toggleFeatured(faq: Faq) {
    const newValue = !faq.is_featured;

    setFaqs((prev) =>
      prev.map((f) => (f.id === faq.id ? { ...f, is_featured: newValue } : f))
    );

    const { error } = await supabase
      .from("faqs")
      .update({ is_featured: newValue })
      .eq("id", faq.id);

    if (error) {
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === faq.id ? { ...f, is_featured: !newValue } : f
        )
      );
    }
  }

  async function updateSortOrder(faq: Faq, direction: "up" | "down") {
    const currentIndex = faqs.findIndex((f) => f.id === faq.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const targetFaq = faqs[targetIndex];

    try {
      await Promise.all([
        supabase
          .from("faqs")
          .update({ sort_order: targetFaq.sort_order })
          .eq("id", faq.id),
        supabase
          .from("faqs")
          .update({ sort_order: faq.sort_order })
          .eq("id", targetFaq.id),
      ]);
      await loadFaqs();
    } catch (err: any) {
      setErrorMessage("调整排序失败: " + (err?.message || "未知错误"));
    }
  }

  return (
    <div className="faq-manager">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">FAQ 管理</h1>
          <p className="mt-1 text-sm text-zinc-400">管理常见问题与答案</p>
        </div>

        <button
          onClick={openNewForm}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v12m6-6H6"
            />
          </svg>
          添加问答
        </button>
      </div>

      {successMessage && !showForm && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {errorMessage && !showForm && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部分类</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">加载中...</div>
        ) : filteredFaqs.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">暂无 FAQ</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">问题</th>
                <th className="px-4 py-3 text-left font-medium">分类</th>
                <th className="px-4 py-3 text-left font-medium">答案预览</th>
                <th className="px-4 py-3 text-left font-medium">排序</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredFaqs.map((faq) => (
                <tr key={faq.id} className="transition-colors hover:bg-[#181824]">
                  <td className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{faq.question}</p>
                      {faq.is_featured && (
                        <span className="mt-1 inline-block rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                          推荐
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-zinc-300">{faq.category || "-"}</td>
                  <td className="px-4 py-4 text-zinc-400">
                    <span className="line-clamp-2">{getAnswerPreview(faq.answer_html)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="w-10 text-xs">{faq.sort_order}</span>
                      <button
                        onClick={() => updateSortOrder(faq, "up")}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="上移"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => updateSortOrder(faq, "down")}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="下移"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(faq)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        faq.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {faq.is_active ? "启用" : "禁用"}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleFeatured(faq)}
                        className={`rounded p-2 transition-colors ${
                          faq.is_featured
                            ? "text-amber-300 hover:bg-amber-500/20"
                            : "text-zinc-500 hover:bg-zinc-700/60"
                        }`}
                        title="推荐"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditForm(faq)}
                        className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="编辑"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteFaq(faq)}
                        className="rounded p-2 text-red-400 transition-colors hover:bg-red-500/20"
                        title="删除"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "编辑 FAQ" : "添加 FAQ"}
              </h2>
              <button
                onClick={closeForm}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-200">问题 *</label>
                <input
                  value={form.question}
                  onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">分类</label>
                  <input
                    list="faq-categories"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    placeholder="可选/可自定义"
                  />
                  <datalist id="faq-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">排序值</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">答案 *</label>
                <textarea
                  value={form.answer_html}
                  onChange={(e) => setForm((p) => ({ ...p, answer_html: e.target.value }))}
                  rows={10}
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-500"
                  placeholder="支持 HTML（后续可替换为富文本编辑器）"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  启用
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                    checked={form.is_featured}
                    onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))}
                  />
                  推荐
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-lg border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveFaq}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="bg-card text-muted-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除问答
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-2 text-sm">
              <p>确定要删除这条问答吗？</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {deleteTarget.question}
              </p>
            </div>
          )}
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              disabled={deleting}
              className="bg-white text-black hover:bg-zinc-100"
              onClick={() => {
                if (!deleting) setDeleteTarget(null);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={deleting}
              className="bg-white text-red-600 hover:bg-red-50"
              onClick={confirmDelete}
            >
              {deleting ? "正在删除..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
