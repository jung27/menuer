// 개발 서버 재시작/빌드 실패 등으로 빈 응답이나 HTML이 와도 파싱 오류를 노출하지 않습니다.
export async function readApiResponse(response: Response) {
  try {
    const data = await response.json();
    if (!data || typeof data !== "object") throw new Error("Invalid response");
    return data;
  } catch {
    throw new Error(`서버에서 올바른 응답을 받지 못했어요. 잠시 후 다시 시도해주세요. (HTTP ${response.status})`);
  }
}
