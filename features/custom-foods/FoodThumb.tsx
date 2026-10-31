import Image from "next/image";
import type { CustomFoodDraft } from "./model";

export default function FoodThumb({ food }: { food: CustomFoodDraft }) {
  if (!food.image) return null;
  return <span className="ac-food-thumb">
    <Image src={food.image} alt={`${food.name} 그림`} fill unoptimized sizes="96px" />
  </span>;
}
