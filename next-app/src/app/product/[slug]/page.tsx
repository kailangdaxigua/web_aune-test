import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  model?: string | null;
  slug: string;
  short_description?: string | null;
  category?: any;
  features_header_image?: string | null;
  features_html?: string | null;
  specs_header_image?: string | null;
  specs_html?: string | null;
  gallery_images?: string[] | null;
};

type Download = {
  id: number;
  title: string;
  version?: string | null;
  file_size?: number | null;
  file_url: string;
  download_count?: number | null;
};

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function getProductData(slug: string) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      `*,
       category:categories(id, name, slug)`
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single<Product>();

  if (productError || !product) {
    return null;
  }

  const [{ data: downloads }, { data: galleryBlocks }] = await Promise.all([
    supabase
      .from("downloads")
      .select("*")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }) as any,
    supabase
      .from("product_media_blocks")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order") as any,
  ]);

  return {
    product,
    downloads: (downloads || []) as Download[],
    mediaBlocks: galleryBlocks || [],
  };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const slug = params.slug;

  const data = await getProductData(slug);
  if (!data) {
    return {
      title: "产品未找到 - AUNE Audio",
    };
  }

  const { product } = data;
  const baseTitle = product.model
    ? `${product.name} ${product.model}`
    : product.name;

  const description =
    product.short_description ||
    `${product.name} - AUNE Audio 高保真音频设备。`;

  const ogImage =
    product.features_header_image || product.specs_header_image || null;

  return {
    title: `${baseTitle} - 产品详情`,
    description,
    openGraph: {
      title: `${baseTitle} - 产品详情`,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "article",
    },
  };
}

export default async function ProductDetailPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug;

  const data = await getProductData(slug);

  if (!data) {
    notFound();
  }

  const { product, downloads } = data;

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero / basic info */}
        <section className="mb-16">
          <p className="mb-2 text-sm text-amber-400">
            {product.category?.name}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
            {product.name}
          </h1>
          {product.model && (
            <p className="mt-2 text-sm text-zinc-400">{product.model}</p>
          )}
          {product.short_description && (
            <p className="mt-6 max-w-2xl text-base text-zinc-300">
              {product.short_description}
            </p>
          )}
        </section>

        {/* Features */}
        <section className="mb-16">
          {product.features_header_image && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.features_header_image}
                alt={`${product.name} 功能`}
                className="h-auto w-full"
              />
            </div>
          )}
          <h2 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
            产品功能
          </h2>
          <div
            className="prose prose-invert max-w-none text-zinc-200"
            dangerouslySetInnerHTML={{
              __html:
                product.features_html ||
                "<p style='text-align:center;color:#9ca3af'>暂无功能介绍</p>",
            }}
          />
        </section>

        {/* Specs */}
        <section className="mb-16">
          {product.specs_header_image && (
            <div className="mb-8 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.specs_header_image}
                alt={`${product.name} 规格`}
                className="h-auto w-full"
              />
            </div>
          )}
          <h2 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
            技术规格
          </h2>
          <div
            className="prose prose-invert max-w-none text-zinc-200"
            dangerouslySetInnerHTML={{
              __html:
                product.specs_html ||
                "<p style='text-align:center;color:#9ca3af'>暂无技术规格</p>",
            }}
          />
        </section>

        {/* Related downloads */}
        <section className="mb-16">
          <h2 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
            相关下载
          </h2>

          {downloads.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/60 py-12 text-center text-zinc-400">
              暂无相关下载
            </div>
          ) : (
            <div className="space-y-4">
              {downloads.map((download) => (
                <div
                  key={download.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                >
                  <div>
                    <h3 className="text-base font-medium text-white">
                      {download.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                      {download.version ? `v${download.version} · ` : ""}
                      {formatSize(download.file_size)}
                      {" · "}
                      {download.download_count || 0} 次下载
                    </p>
                  </div>
                  <a
                    href={download.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4-4 4m0 0-4-4m4 4V4"
                      />
                    </svg>
                    下载文件
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gallery */}
        {product.gallery_images && product.gallery_images.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
              产品图库
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {product.gallery_images.map((image, idx) => (
                <div key={idx} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={`${product.name} - 图片 ${idx + 1}`}
                    className="aspect-square h-auto w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

