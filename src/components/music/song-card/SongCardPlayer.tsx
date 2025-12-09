/**
 * SongCard YouTube Player Component
 * Sprint CAT-AUDIT-P2 - Refatoração SongCard
 */

interface SongCardPlayerProps {
  videoId: string;
  show: boolean;
}

export function SongCardPlayer({ videoId, show }: SongCardPlayerProps) {
  if (!show || !videoId) return null;

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black animate-fade-in">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        className="w-full h-full"
      />
    </div>
  );
}
