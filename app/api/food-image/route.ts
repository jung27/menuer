import { getDatabase } from "@/lib/mongodb";
import { createFoodImageCache } from "@/lib/food-image-cache";

const cachedImage = createFoodImageCache();

// <img src="/api/food-image?name=짜장면"> → 위키백과 대표 사진으로 이동.
// 한 번 찾은 결과(사진 주소, 없으면 null)는 DB food_images에 저장해 다음부터 위키백과에 다시 묻지 않음.
type Cached = { _id: string; url: string | null };

// 위키백과 대표 사진이 없거나 어색한 음식은 직접 고른 위키미디어 사진 파일 사용
const PICKED: Record<string, string> = {
  삼겹살: "Samgyeopsal-gui.jpg",
  치킨: "Korean fried chicken 3 banban.jpg",
  비빔국수: "Bibim-guksu.jpg",
  족발: "Korean.food-Jokbal-01.jpg",
  냉면: "Naengmyeon (cold noodles).jpg",
  볶음밥: "Bokkeum-bap.jpg",
  파스타: "Espaguetis carbonara.jpg",
  군만두: "Korean Chinese gun-mandu.jpg",
  토스트: "Gilgeori toast 1.jpg",
  냉채: "Korean cuisine-Gyeojachae-Shredded mixed vegetables with mustard sauce-01.jpg",
};

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim().slice(0, 50);
  if (!name) return new Response(null, { status: 400 });
  // Generated 4:3 photo served locally, independent of Wikimedia availability.
  if (name === "쌀국수") return redirect("/food-images/pho-ai.webp");
  if (PICKED[name]) {
    return redirect(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(PICKED[name])}?width=600`);
  }

  const url = await cachedImage(name, () => lookupImage(name));
  if (!url) return new Response(null, { status: 404 });
  return redirect(url);
}

async function lookupImage(name: string) {
  const images = await getDatabase()
    .then((db) => db.collection<Cached>("food_images"))
    .catch(() => null); // DB가 안 되면 저장 없이 매번 찾음
  let url = (await images?.findOne({ _id: name }).catch(() => null))?.url;

  if (url === undefined) {
    url = await findWikiImage(name);
    if (url !== undefined) await images?.updateOne({ _id: name }, { $set: { url } }, { upsert: true }).catch(() => {});
  }
  return url;
}

const redirect = (url: string) =>
  new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "public, max-age=86400" } });

// 찾음 → 주소, 사진 없음 → null, 요청 실패(횟수 제한 등) → undefined(저장 안 하고 다음에 다시 시도)
async function findWikiImage(name: string): Promise<string | null | undefined> {
  const api = new URL("https://ko.wikipedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", titles: name, redirects: "1", format: "json",
    prop: "pageimages", piprop: "thumbnail", pithumbsize: "600",
  }).toString();
  try {
    const res = await fetch(api, { headers: { "User-Agent": "menuer/1.0" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return undefined;
    const data = await res.json();
    const page = Object.values(data.query?.pages ?? {})[0] as { thumbnail?: { source: string } } | undefined;
    return page?.thumbnail?.source ?? null;
  } catch {
    return undefined;
  }
}
