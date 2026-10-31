import "server-only";
import { RECOMMENDATION_FOODS } from "./food-catalog";
import { customCardFoods } from "./custom-foods";

export async function foodCardCatalog(userId: string) {
  return [...RECOMMENDATION_FOODS, ...await customCardFoods(userId)];
}
