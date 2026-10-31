export default function FoodCardLayout({ children }: LayoutProps<"/food-card">) {
  return <div className="flex flex-1 flex-col bg-gray-100">{children}</div>;
}
