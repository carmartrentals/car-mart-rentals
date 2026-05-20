import Image from "next/image";

/**
 * Car Mart Rentals logo — metallic chrome, transparent PNG (public/logo.png).
 * Pass a height via className (e.g. "h-11 w-auto"); the width scales to ratio.
 */
export function BrandLogo({
  className = "h-11 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Car Mart Rentals"
      width={711}
      height={324}
      priority={priority}
      className={className}
    />
  );
}
