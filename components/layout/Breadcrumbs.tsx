"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const pathSegments = pathname.split("/").filter((v) => v.length > 0);

  return (
    <nav aria-label="Breadcrumb" className="bg-gray-50 py-3 px-6 lg:px-12 border-b border-gray-100">
      <ol className="flex list-none p-0 text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
        <li className="flex items-center">
          <Link href="/" className="hover:text-[#1f3f66]">Home</Link>
          <span className="mx-2 text-gray-300">/</span>
        </li>
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
          const isLast = index === pathSegments.length - 1;
          const label = segment.replace(/-/g, " ");

          return (
            <li key={href} className="flex items-center">
              {isLast ? (
                <span className="text-[#f37021]">{label}</span>
              ) : (
                <>
                  <Link href={href} className="hover:text-[#1f3f66]">{label}</Link>
                  <span className="mx-2 text-gray-300">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}