import { Package } from "lucide-react";
import { usePhotoUrl } from "@/lib/photos";

export function ListingPhoto({
  path,
  alt,
  className = "",
}: {
  path?: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = usePhotoUrl(path);
  if (!url) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-secondary ${className}`}
      >
        <Package className="size-6 text-primary/60" strokeWidth={2} />
      </span>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}

export function Avatar({
  path,
  alt,
  className = "size-10 rounded-full object-cover",
}: {
  path?: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = usePhotoUrl(path);
  if (!url) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-primary-soft text-[13px] font-bold text-primary-deep ${className}`}
      >
        {alt.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
