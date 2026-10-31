import Link from "next/link";

export default function FoodCardLayout({ children }: LayoutProps<"/food-card">) {
  return (
    <div className="flex flex-1 flex-col bg-gray-100">
      <header className="mx-auto flex w-full max-w-md justify-end px-4 pt-4">
        <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow">
          홈
        </Link>
      </header>
      {children}
    </div>
  );
}
