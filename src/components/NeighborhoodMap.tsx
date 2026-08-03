import { Home as HomeIcon } from "lucide-react";

const ZOOM = 15;
const TILE = 256;

function lngToX(lng: number, z: number) {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToY(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
  );
}

interface NeighborhoodMapProps {
  lat: number;
  lng: number;
  radiusKm: number;
  caption: string;
}

/**
 * Lightweight OpenStreetMap tile map. No JS map library, so it is SSR-safe
 * and renders a real map of the neighbor's saved address / current location.
 */
export function NeighborhoodMap({ lat, lng, radiusKm, caption }: NeighborhoodMapProps) {
  const fx = lngToX(lng, ZOOM);
  const fy = latToY(lat, ZOOM);
  const tx = Math.floor(fx);
  const ty = Math.floor(fy);
  // Offset of the exact point inside its own tile.
  const ox = (fx - tx) * TILE;
  const oy = (fy - ty) * TILE;

  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, ZOOM);
  const radiusPx = Math.max(18, Math.min(120, (radiusKm * 1000) / metersPerPixel));

  const range = [-1, 0, 1];

  return (
    <div className="relative h-44 overflow-hidden rounded-2xl bg-secondary">
      <div className="absolute left-1/2 top-1/2">
        {range.map((dy) =>
          range.map((dx) => (
            <img
              key={`${dx}-${dy}`}
              src={`https://tile.openstreetmap.org/${ZOOM}/${tx + dx}/${ty + dy}.png`}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              aria-hidden
              className="absolute max-w-none select-none"
              style={{ left: dx * TILE - ox, top: dy * TILE - oy }}
            />
          )),
        )}
      </div>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/70 bg-primary/15"
        style={{ width: radiusPx * 2, height: radiusPx * 2 }}
        aria-hidden
      />

      <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-float">
        <HomeIcon className="size-5 text-primary-foreground" strokeWidth={2.4} />
      </span>

      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card/90 px-3 py-1 text-[11px] font-semibold text-primary-deep">
        {caption}
      </p>
      <span className="absolute bottom-0 right-0 rounded-tl bg-card/80 px-1 text-[8px] text-muted-foreground">
        © OpenStreetMap
      </span>
    </div>
  );
}
