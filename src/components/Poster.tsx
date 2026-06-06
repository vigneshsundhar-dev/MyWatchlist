import { Film } from "lucide-react";

export function Poster({ src, title }: Readonly<{ src?: string; title: string }>) {
  if (!src) {
    return (
      <div className="poster placeholder" aria-label={`${title} poster placeholder`}>
        <Film size={30} aria-hidden />
      </div>
    );
  }

  return <img className="poster" src={src} alt={`${title} poster`} loading="lazy" />;
}
