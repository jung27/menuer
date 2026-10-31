import { AuthError, authFailure, authResponse, readAuthBody, requireUser, setAvatar } from "@/lib/auth";

// PUT {"image": "data:image/webp;base64,..."} → 프로필 사진 저장, {"image": null} → 삭제
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    if (Number(request.headers.get("content-length")) > 200000) throw new AuthError(413, "IMAGE_TOO_LARGE", "사진 크기를 줄여주세요.");
    const body = await readAuthBody(request);
    return authResponse({ avatar: await setAvatar(user.id, body.image) });
  } catch (error) {
    return authFailure(error);
  }
}
