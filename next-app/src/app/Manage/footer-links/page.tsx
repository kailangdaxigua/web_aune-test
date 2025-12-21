"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const groups = [
  { value: "purchase_channels", label: "购买渠道" },
  { value: "about_aune", label: "关于aune" },
  { value: "service_support", label: "服务支持" },
  { value: "official_platforms", label: "官方平台" },
] as const;

type GroupValue = (typeof groups)[number]["value"];

const iconOptions = [
  { value: "", label: "无图标" },
  { value: "icon-weibo", label: "微博" },
  { value: "icon-wechat", label: "微信" },
  { value: "icon-tieba", label: "贴吧" },
  { value: "icon-qq", label: "QQ" },
] as const;

type PageRef = {
  id: number;
  title: string;
  slug: string;
};

type FooterLink = {
  id: number;
  link_group: GroupValue | string;
  label: string;
  url: string | null;
  page_id: number | null;
  is_external: boolean;
  icon_class: string | null;
  sort_order: number;
  is_active: boolean;
  page?: PageRef | null;
};

export default function ManageFooterLinksPage() {
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [pages, setPages] = useState<PageRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState<GroupValue>("purchase_channels");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<FooterLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    link_group: "purchase_channels" as GroupValue,
    label: "",
    url: "",
    page_id: "",
    is_external: false,
    icon_class: "",
    sort_order: 0,
    is_active: true,
  });

  async function fetchLinks() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("footer_links")
        .select("*, page:pages(id, title, slug)")
        .order("sort_order");

      if (error) throw error;
      setLinks((data || []) as unknown as FooterLink[]);
    } catch (err: any) {
      console.error("Failed to fetch links:", err);
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPages() {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("id, title, slug")
        .eq("is_published", true)
        .order("title");

      if (error) throw error;
      setPages((data || []) as PageRef[]);
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    }
  }

  useEffect(() => {
    fetchLinks();
    fetchPages();
  }, []);

  const groupedLinks = useMemo(() => {
    return links
      .filter((l) => l.link_group === activeGroup)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [links, activeGroup]);

  const currentGroupLabel = useMemo(() => {
    return groups.find((g) => g.value === activeGroup)?.label || "";
  }, [activeGroup]);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      link_group: activeGroup,
      label: "",
      url: "",
      page_id: "",
      is_external: false,
      icon_class: "",
      sort_order: groupedLinks.length,
      is_active: true,
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function openEditModal(link: FooterLink) {
    setEditingId(link.id);
    setForm({
      link_group: (link.link_group as GroupValue) || "purchase_channels",
      label: link.label || "",
      url: link.url || "",
      page_id: link.page_id ? String(link.page_id) : "",
      is_external: !!link.is_external,
      icon_class: link.icon_class || "",
      sort_order: link.sort_order ?? 0,
      is_active: !!link.is_active,
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setErrorMessage("");
  }

  async function saveLink() {
    if (!form.label.trim()) {
      setErrorMessage("请输入链接名称");
      return;
    }

    if (!form.page_id && !form.url.trim()) {
      setErrorMessage("请选择关联页面或输入链接地址");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        link_group: form.link_group,
        label: form.label.trim(),
        url: form.url.trim() || null,
        page_id: form.page_id ? Number(form.page_id) : null,
        is_external: form.is_external,
        icon_class: form.icon_class || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("footer_links")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("footer_links").insert(payload);
        if (error) throw error;
      }

      await fetchLinks();
      closeModal();
    } catch (err: any) {
      console.error("Failed to save link:", err);
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  function deleteLink(link: FooterLink) {
    setDeleteTarget(link);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("footer_links")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      await fetchLinks();
    } catch (err: any) {
      console.error("Failed to delete link:", err);
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function toggleActive(link: FooterLink) {
    const newValue = !link.is_active;
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, is_active: newValue } : l))
    );

    const { error } = await supabase
      .from("footer_links")
      .update({ is_active: newValue })
      .eq("id", link.id);

    if (error) {
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, is_active: !newValue } : l))
      );
    }
  }

  async function swapOrder(fromIndex: number, toIndex: number) {
    const items = [...groupedLinks];
    const fromItem = items[fromIndex];
    const toItem = items[toIndex];
    if (!fromItem || !toItem) return;

    try {
      await Promise.all([
        supabase
          .from("footer_links")
          .update({ sort_order: toIndex })
          .eq("id", fromItem.id),
        supabase
          .from("footer_links")
          .update({ sort_order: fromIndex })
          .eq("id", toItem.id),
      ]);
      await fetchLinks();
    } catch (err: any) {
      console.error("Failed to swap order:", err);
      setErrorMessage("排序失败: " + (err?.message || "未知错误"));
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    await swapOrder(index, index - 1);
  }

  async function moveDown(index: number) {
    if (index === groupedLinks.length - 1) return;
    await swapOrder(index, index + 1);
  }

  function resolvedUrl(link: FooterLink) {
    if (link.page_id && link.page) return `/page/${link.page.slug}`;
    return link.url || "#";
  }

  return (
    <div className="footer-link-manager">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">页脚链接管理</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          添加链接
        </button>
      </div>

      {errorMessage && !showModal && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {groups.map((group) => (
          <button
            key={group.value}
            onClick={() => setActiveGroup(group.value)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeGroup === group.value
                ? "bg-amber-500 text-black"
                : "bg-[#11111a] text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">加载中...</div>
        ) : groupedLinks.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            {currentGroupLabel}暂无链接
            <button
              onClick={openCreateModal}
              className="mt-3 block w-full text-sm text-amber-300 hover:text-amber-200"
            >
              添加第一个链接
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {groupedLinks.map((link, index) => (
              <div
                key={link.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-[#0b0b12] p-4"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    title="上移"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === groupedLinks.length - 1}
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    title="下移"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{link.label}</span>
                    {link.is_external && (
                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                        外部链接
                      </span>
                    )}
                    {link.page && (
                      <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                        关联页面
                      </span>
                    )}
                    {!link.is_active && (
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                        已禁用
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-400">
                    {resolvedUrl(link)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(link)}
                    className={`rounded-lg p-2 transition-colors ${
                      link.is_active
                        ? "text-green-400 hover:bg-green-500/20"
                        : "text-zinc-500 hover:bg-zinc-800"
                    }`}
                    title={link.is_active ? "禁用" : "启用"}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => openEditModal(link)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    title="编辑"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => deleteLink(link)}
                    className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20"
                    title="删除"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "编辑链接" : "添加链接"}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-200">所属分组</label>
                <select
                  value={form.link_group}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, link_group: e.target.value as GroupValue }))
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                >
                  {groups.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">链接名称 *</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                  placeholder="如：天猫旗舰店"
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">链接类型</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="radio"
                      checked={!form.is_external}
                      onChange={() => setForm((p) => ({ ...p, is_external: false }))}
                    />
                    内部链接/页面
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="radio"
                      checked={form.is_external}
                      onChange={() => setForm((p) => ({ ...p, is_external: true }))}
                    />
                    外部链接
                  </label>
                </div>
              </div>

              {!form.is_external && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">关联页面</label>
                  <select
                    value={form.page_id}
                    onChange={(e) => setForm((p) => ({ ...p, page_id: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="">不关联页面</option>
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title} (/page/{page.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  {form.is_external ? "外部链接地址 *" : "内部路径（可选）"}
                </label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder={form.is_external ? "https://..." : "/downloads"}
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              {form.link_group === "official_platforms" && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">图标</label>
                  <select
                    value={form.icon_class}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, icon_class: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon.value} value={icon.value}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                />
                <span className="text-sm text-white">启用显示</span>
              </label>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 p-6">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-white transition-colors hover:bg-zinc-700"
              >
                取消
              </button>
              <button
                onClick={saveLink}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
