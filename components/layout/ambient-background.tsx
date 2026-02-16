import { BackgroundStarfield } from "@/components/layout/background-starfield";

export function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-base" />
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-blob ambient-blob-c" />
      <div className="ambient-breath" />
      <BackgroundStarfield />
      <div className="ambient-noise" />
    </div>
  );
}
