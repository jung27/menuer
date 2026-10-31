import { getDatabase } from "@/lib/mongodb";

// <img src="/api/food-image?name=짜장면"> → 위키백과 대표 사진으로 이동.
// 한 번 찾은 결과(사진 주소, 없으면 null)는 DB food_images에 저장해 다음부터 위키백과에 다시 묻지 않음.
type Cached = { _id: string; url: string | null };

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim().slice(0, 50);
  if (!name) return new Response(null, { status: 400 });

  const images = await getDatabase()
    .then((db) => db.collection<Cached>("food_images"))
    .catch(() => null); // DB가 안 되면 저장 없이 매번 찾음
  let url = (await images?.findOne({ _id: name }).catch(() => null))?.url;

  if (url === undefined) {
    url = await findWikiImage(name);
    if (url !== undefined) await images?.updateOne({ _id: name }, { $set: { url } }, { upsert: true }).catch(() => {});
  }
  if (!url) return new Response(null, { status: 404 });
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "public, max-age=86400" } });
}

// 찾음 → 주소, 사진 없음 → null, 요청 실패(횟수 제한 등) → undefined(저장 안 하고 다음에 다시 시도)
async function findWikiImage(name: string): Promise<string | null | undefined> {
  const api = new URL("https://ko.wikipedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", titles: name, redirects: "1", format: "json",
    prop: "pageimages", piprop: "thumbnail", pithumbsize: "600",
  }).toString();
  try {
    const res = await fetch(api, { headers: { "User-Agent": "menuer/1.0" } });
    if (!res.ok) return undefined;
    const data = await res.json();
    const page = Object.values(data.query?.pages ?? {})[0] as { thumbnail?: { source: string } } | undefined;
    return page?.thumbnail?.source ?? null;
  } catch {
    return undefined;
  }
}
