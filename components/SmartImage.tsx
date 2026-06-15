import Image from "next/image";

type SmartImageProps = {
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  src: string;
};

export function SmartImage({ alt, className, priority = false, sizes = "100vw", src }: SmartImageProps) {
  const local = src.startsWith("/");

  return (
    <span className={`smart-image ${className ?? ""}`}>
      {local ? (
        <Image alt={alt} fill priority={priority} sizes={sizes} src={src} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={alt} src={src} />
      )}
    </span>
  );
}
