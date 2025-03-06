import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}
      >
        홈
      </Link>
      <Link
        href="/refrigerators"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/refrigerators" ? "text-primary" : "text-muted-foreground"
        )}
      >
        냉장고
      </Link>
      <Link
        href="/recipes"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/recipes" ? "text-primary" : "text-muted-foreground"
        )}
      >
        레시피
      </Link>
      <Link
        href="/recipes/shared"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/recipes/shared" ? "text-primary" : "text-muted-foreground"
        )}
      >
        공유 레시피
      </Link>
    </nav>
  );
} 