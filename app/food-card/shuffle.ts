// Fisher–Yates: 원본을 바꾸지 않고 각 카드를 한 번씩 포함하는 순열을 만듭니다.
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
