import { useState, useEffect } from 'react';
import { getTracks } from '@/lib/api';
import type { SponsorTrack } from '@/schemas/career';

/** Resolve a trackId string into a full SponsorTrack object. */
export function useTrack(trackId: string | null | undefined): SponsorTrack | null {
  const [track, setTrack] = useState<SponsorTrack | null>(null);

  useEffect(() => {
    if (!trackId) {
      setTrack(null);
      return;
    }
    getTracks()
      .then((tracks) => {
        const found = tracks.find((t) => t.id === trackId);
        setTrack(found ?? null);
      })
      .catch(() => setTrack(null));
  }, [trackId]);

  return track;
}
