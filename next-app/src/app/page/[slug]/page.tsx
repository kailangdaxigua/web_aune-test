import { notFound } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type CmsPage = {
  id: number;
  slug: string;
  title: string;
  content_html?: string | null;
  is_published: boolean;
  meta_title?: string | null;
};

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

async function getPageBySlug(slug: string): Promise<CmsPage | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single<CmsPage>();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function GenericPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug;

  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  // 荣誉墙页面：使用单独布局，仅展示图片
  if (slug === "honors") {
    return (
      <div className="static-page min-h-screen bg-[#050509] pt-20 text-white">
        <section className="flex w-full justify-center px-4 py-10">
          <div className="w-[70vw] max-w-5xl">
            <div className="mb-6 border-b border-zinc-700 pb-2">
              <p className="text-left text-3xl font-semibold tracking-wide">
                品牌荣誉
              </p>
            </div>
            <Image
              src="/honor.jpg"
              alt="荣誉墙"
              width={1600}
              height={4000}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="static-page min-h-screen bg-[#050509] pt-20 text-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0b0b11] to-[#050509] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              {page.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-[#050509] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div
            className="prose prose-lg prose-invert max-w-none text-zinc-200"
            dangerouslySetInnerHTML={{
              __html:
                page.content_html ||
                "<p style='text-align:center;color:#9ca3af'>暂无内容</p>",
            }}
          />
        </div>
      </section>
    </div>
  );
}

