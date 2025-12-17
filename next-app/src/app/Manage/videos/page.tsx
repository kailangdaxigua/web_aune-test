"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const sourceTypes = [
  { value: "local", label: "本地上传" },
  { value: "external", label: "外部链接" },
] as const;

const platformOptions = [
  { value: "", label: "直接视频链接" },
  { value: "bilibili", label: "B站" },
  { value: "youtube", label: "YouTube" },
  { value: "youku", label: "优酷" },
] as const;

type HomeVideo = {
  id: number;
  title: string;
  description: string | null;
  source_type: "local" | "external" | string;
  video_url: string;
  external_platform: string | null;
  external_embed_code: string | null;
  poster_url: string | null;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  show_controls: boolean;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
};

function parseStorageUrl(url: string) {
  if (!url) return null;
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (match) {
      return {
        bucket: match[1],
        path: decodeURIComponent(match[2]),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteStorageFiles(urls: string[]) {
  const byBucket: Record<string, string[]> = {};
  for (const url of urls) {
    if (!url) continue;
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    if (!byBucket[parsed.bucket]) byBucket[parsed.bucket] = [];
    byBucket[parsed.bucket].push(parsed.path);
  }
  for (const [bucket, paths] of Object.entries(byBucket)) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function getSourceLabel(type: string) {
  return type === "local" ? "本地视频" : "外部链接";
}

export default function ManageVideosPage() {
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const posterInputRef = useRef<HTMLInputElement | null>(null);

  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    source_type: "external" as "local" | "external",
    video_url: "",
    external_platform: "",
    external_embed_code: "",
    poster_url: "",
    autoplay: true,
    muted: true,
    loop: true,
    show_controls: false,
    is_primary: false,
    is_active: true,
    sort_order: 0,
  });

  const primaryVideo = useMemo(() => videos.find((v) => v.is_primary), [videos]);

  async function fetchVideos() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("home_videos")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setVideos((data || []) as HomeVideo[]);
    } catch (err: any) {
      console.error("Failed to fetch videos:", err);
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, []);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      source_type: "external",
      video_url: "",
      external_platform: "",
      external_embed_code: "",
      poster_url: "",
      autoplay: true,
      muted: true,
      loop: true,
      show_controls: false,
      is_primary: videos.length === 0,
      is_active: true,
      sort_order: videos.length,
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function openEditModal(video: HomeVideo) {
    setEditingId(video.id);
    setForm({
      title: video.title || "",
      description: video.description || "",
      source_type: (video.source_type as any) || "external",
      video_url: video.video_url || "",
      external_platform: video.external_platform || "",
      external_embed_code: video.external_embed_code || "",
      poster_url: video.poster_url || "",
      autoplay: !!video.autoplay,
      muted: !!video.muted,
      loop: !!video.loop,
      show_controls: !!video.show_controls,
      is_primary: !!video.is_primary,
      is_active: !!video.is_active,
      sort_order: video.sort_order ?? 0,
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setErrorMessage("");
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const VIDEO_SIZE_LIMIT = 1024 * 1024 * 1024; // 1GB

    if (file.size > VIDEO_SIZE_LIMIT) {
      const currentSize = formatFileSize(file.size);
      const maxSize = formatFileSize(VIDEO_SIZE_LIMIT);
      setErrorMessage(
        `文件过大！当前文件: ${currentSize}，大小限制: ${maxSize}。请压缩视频后重试，或使用外部链接。`
      );
      e.target.value = "";
      return;
    }

    const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("不支持的视频格式：支持 MP4、WebM、OGG、MOV");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "mp4";
      const fileName = `home_video_${timestamp}.${ext}`;

      const { error } = await supabase.storage
        .from("videos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) {
        const errorMsg = error.message || (error as any).error || JSON.stringify(error);
        throw new Error(errorMsg);
      }

      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      setForm((prev) => ({
        ...prev,
        video_url: urlData.publicUrl,
        source_type: "local",
      }));
    } catch (err: any) {
      setErrorMessage("上传失败: " + (err?.message || "未知错误"));
    } finally {
      setIsUploading(false);
    }
  }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("请上传图片文件");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `video_poster_${timestamp}.${ext}`;

      const { error } = await supabase.storage
        .from("videos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, poster_url: urlData.publicUrl }));
    } catch (err: any) {
      setErrorMessage("上传失败: " + (err?.message || "未知错误"));
    } finally {
      setIsUploading(false);
    }
  }

  async function saveVideo() {
    if (!form.title.trim()) {
      setErrorMessage("请输入视频标题");
      return;
    }

    if (!form.video_url && !form.external_embed_code.trim()) {
      setErrorMessage("请上传视频或输入视频链接/嵌入代码");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        source_type: form.source_type,
        video_url: form.video_url,
        external_platform: form.external_platform || null,
        external_embed_code: form.external_embed_code.trim() || null,
        poster_url: form.poster_url || null,
        autoplay: form.autoplay,
        muted: form.muted,
        loop: form.loop,
        show_controls: form.show_controls,
        is_primary: form.is_primary,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };

      if (form.is_primary) {
        // 确保唯一主视频
        await supabase.from("home_videos").update({ is_primary: false }).neq("id", editingId || -1);
      }

      if (editingId) {
        const { error } = await supabase
          .from("home_videos")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_videos").insert(payload);
        if (error) throw error;
      }

      await fetchVideos();
      closeModal();
    } catch (err: any) {
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteVideo(video: HomeVideo) {
    if (!window.confirm(`确定要删除 "${video.title}" 吗？\n将同时删除存储中的视频和封面文件。`)) return;

    try {
      const { error } = await supabase
        .from("home_videos")
        .delete()
        .eq("id", video.id);
      if (error) throw error;

      const urls: string[] = [];
      if (video.source_type === "local" && video.video_url) {
        urls.push(video.video_url);
      }
      if (video.poster_url) {
        urls.push(video.poster_url);
      }

      try {
        if (urls.length) await deleteStorageFiles(urls);
      } catch (e) {
        console.warn("Failed to delete video files", e);
      }

      await fetchVideos();
    } catch (err: any) {
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    }
  }

  async function setPrimary(video: HomeVideo) {
    try {
      await supabase.from("home_videos").update({ is_primary: false }).neq("id", video.id);
      const { error } = await supabase
        .from("home_videos")
        .update({ is_primary: true })
        .eq("id", video.id);
      if (error) throw error;
      await fetchVideos();
    } catch (err: any) {
      setErrorMessage("操作失败: " + (err?.message || "未知错误"));
    }
  }

  async function toggleActive(video: HomeVideo) {
    const newValue = !video.is_active;
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, is_active: newValue } : v))
    );

    const { error } = await supabase
      .from("home_videos")
      .update({ is_active: newValue })
      .eq("id", video.id);

    if (error) {
      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, is_active: !newValue } : v))
      );
    }
  }

  return (
    <div className="video-manager">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">首页视频管理</h1>
          <p className="mt-1 text-sm text-zinc-400">
            管理首页展示的视频，支持本地上传或外部链接
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          添加视频
        </button>
      </div>

      {errorMessage && !showModal && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {primaryVideo && (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="aspect-video w-48 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {primaryVideo.poster_url ? (
                <img
                  src={primaryVideo.poster_url}
                  className="h-full w-full object-cover"
                  alt={primaryVideo.title}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-medium text-black">
                  首页主视频
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    primaryVideo.source_type === "local"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {getSourceLabel(primaryVideo.source_type)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{primaryVideo.title}</h3>
              {primaryVideo.description && (
                <p className="mt-1 text-sm text-zinc-400">{primaryVideo.description}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEditModal(primaryVideo)}
                  className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700"
                >
                  编辑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="h-8 w-8 animate-spin text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : videos.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">暂无首页视频</div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-white font-semibold">所有视频</h2>

          {videos.map((video) => (
            <div
              key={video.id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                video.is_primary
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-zinc-800 bg-[#11111a] hover:border-zinc-600"
              }`}
            >
              <div className="aspect-video w-32 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {video.poster_url ? (
                  <img src={video.poster_url} className="h-full w-full object-cover" alt={video.title} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg className="h-8 w-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-white">{video.title}</h3>
                  {video.is_primary && (
                    <span className="rounded bg-amber-500 px-2 py-0.5 text-xs text-black">主视频</span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      video.source_type === "local"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {getSourceLabel(video.source_type)}
                  </span>
                  {!video.is_active && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">已禁用</span>
                  )}
                </div>
                <p className="truncate text-sm text-zinc-400">{video.video_url}</p>
                <div className="mt-2 flex gap-2 text-xs text-zinc-500">
                  {video.autoplay && <span>自动播放</span>}
                  {video.muted && <span>静音</span>}
                  {video.loop && <span>循环</span>}
                  {video.show_controls && <span>控制条</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!video.is_primary && (
                  <button
                    onClick={() => setPrimary(video)}
                    className="rounded-lg p-2 text-amber-300 transition-colors hover:bg-amber-500/20"
                    title="设为主视频"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => toggleActive(video)}
                  className={`rounded-lg p-2 transition-colors ${
                    video.is_active
                      ? "text-green-400 hover:bg-green-500/20"
                      : "text-zinc-500 hover:bg-zinc-800"
                  }`}
                  title={video.is_active ? "禁用" : "启用"}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>

                <button
                  onClick={() => openEditModal(video)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  title="编辑"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => deleteVideo(video)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "编辑视频" : "添加视频"}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] space-y-6 overflow-y-auto p-6">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-200">视频标题 *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  placeholder="如：品牌宣传片"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">视频描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">视频来源</label>
                <div className="flex gap-6">
                  {sourceTypes.map((t) => (
                    <label key={t.value} className="flex cursor-pointer items-center gap-2 text-sm text-white">
                      <input
                        type="radio"
                        value={t.value}
                        checked={form.source_type === t.value}
                        onChange={() => setForm((p) => ({ ...p, source_type: t.value }))}
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {form.source_type === "local" ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-200">上传视频 *</label>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-sm transition-all ${
                        isUploading
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-zinc-700 bg-[#11111a] hover:border-zinc-500"
                      }`}
                    >
                      <p className="font-medium text-white">
                        {isUploading
                          ? "上传中..."
                          : form.video_url
                          ? "已上传，点击更换"
                          : "点击上传视频"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        支持 MP4、WebM、MOV，最大 1GB
                      </p>
                    </div>
                  </div>

                  {form.video_url && (
                    <div>
                      <label className="mb-2 block text-sm text-zinc-200">视频地址</label>
                      <input
                        value={form.video_url}
                        readOnly
                        className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-xs text-zinc-400"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-200">外部平台</label>
                    <select
                      value={form.external_platform}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, external_platform: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                    >
                      {platformOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!form.external_platform ? (
                    <div>
                      <label className="mb-2 block text-sm text-zinc-200">视频直链 *</label>
                      <input
                        value={form.video_url}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, video_url: e.target.value }))
                        }
                        type="url"
                        placeholder="https://example.com/video.mp4"
                        className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm text-zinc-200">嵌入代码 *</label>
                      <textarea
                        value={form.external_embed_code}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            external_embed_code: e.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="<iframe ...></iframe>"
                        className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 font-mono text-sm text-white outline-none focus:border-amber-500"
                      />
                      <p className="mt-1 text-xs text-zinc-500">
                        从 B站/YouTube 获取分享的嵌入代码
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-200">封面图（可选）</label>
                <div className="flex items-start gap-4">
                  <div className="aspect-video w-32 overflow-hidden rounded-lg bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.poster_url ? (
                      <img src={form.poster_url} className="h-full w-full object-cover" alt="poster" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        无封面
                      </div>
                    )}
                  </div>
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handlePosterUpload}
                  />
                  <button
                    type="button"
                    onClick={() => posterInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                    disabled={isUploading}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {form.poster_url ? "更换封面" : "上传封面"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  支持 JPEG、PNG、GIF、WebP 格式
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-[#11111a] p-4">
                <h3 className="mb-3 text-sm font-medium text-white">播放设置</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.autoplay}
                      onChange={(e) => setForm((p) => ({ ...p, autoplay: e.target.checked }))}
                    />
                    自动播放
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.muted}
                      onChange={(e) => setForm((p) => ({ ...p, muted: e.target.checked }))}
                    />
                    默认静音
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.loop}
                      onChange={(e) => setForm((p) => ({ ...p, loop: e.target.checked }))}
                    />
                    循环播放
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.show_controls}
                      onChange={(e) => setForm((p) => ({ ...p, show_controls: e.target.checked }))}
                    />
                    显示控制条
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  启用
                </label>
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={(e) => setForm((p) => ({ ...p, is_primary: e.target.checked }))}
                  />
                  设为首页主视频
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">排序值</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 p-6">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-white transition-colors hover:bg-zinc-700"
              >
                取消
              </button>
              <button
                onClick={saveVideo}
                disabled={isSaving || isUploading}
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
