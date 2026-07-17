import Image from "next/image";

export function IsbLogo({
  variant = "navy",
  className,
  height = 28,
}: {
  variant?: "navy" | "white";
  className?: string;
  height?: number;
}) {
  const width = Math.round((height * 116) / 48);
  return (
    <Image
      src={variant === "white" ? "/isb-logo-white.svg" : "/isb-logo.svg"}
      alt="Indian School of Business"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
