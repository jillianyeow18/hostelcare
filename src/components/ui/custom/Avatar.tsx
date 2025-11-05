import { Avatar as AvatarPrimitive, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  children?: React.ReactNode;
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
}

export function Avatar({ src, alt, fallback, className, children }: Props) {
  return (
    <AvatarPrimitive className={className}>
      {src ? (
        <AvatarImage src={src} alt={alt || ""} />
      ) : (
        <AvatarFallback>
          {children || fallback?.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      )}
    </AvatarPrimitive>
  );
}