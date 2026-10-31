import Image from "next/image";
import type { CustomFoodDraft } from "./model";

export default function FoodThumb({ food }: { food: CustomFoodDraft }) {
  return <span className="ac-food-thumb">{food.image
    ? <Image src={food.image} alt={`${food.name} 그림`} fill unoptimized sizes="96px" />
    : <span className="ac-food-symbol" style={{ background: food.physics.baseColor, borderColor: food.physics.crackColor }} aria-label="음식 색상" />}</span>;
}
