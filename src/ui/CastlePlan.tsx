import { MASSES, SPACE } from '../world/layout';
import type { Rect, RoomId } from '../world/types';

/** El mapa es el propio plano del corte: las salas están donde el recorrido las visita. */
export const ROOM_RECT: Record<RoomId, Rect> = {
  exterior: { x: -150, y: 330, w: 120, h: 70 },
  hall: SPACE.hall,
  library: SPACE.library,
  alchemy: SPACE.alchemy,
  armory: SPACE.armory,
  throne: SPACE.throne,
  treasure: SPACE.treasure,
  observatory: SPACE.observatory,
};

const PASSAGES: Rect[] = [SPACE.gate, SPACE.stair1, SPACE.stair2, SPACE.stair3, SPACE.shaft, SPACE.tower];

const VB = { x: -170, y: -700, w: 3570, h: 1330 };

interface Props {
  current: RoomId;
  visited: RoomId[];
  className?: string;
  title?: string;
  /** Parpadeo de la sala actual (se desactiva con movimiento reducido). */
  pulse?: boolean;
}

export function CastlePlan({ current, visited, className, title, pulse = true }: Props) {
  return (
    <svg className={className} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid meet" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* tierra */}
      <rect x={VB.x} y={416} width={VB.w} height={VB.y + VB.h - 416} fill="#1a1226" />
      {MASSES.map((m, i) => (
        <rect key={i} x={m.x} y={m.y} width={m.w} height={m.h} fill="#252845" />
      ))}
      {/* tejados */}
      <polygon points="640,16 872,-116 1104,16" fill="#1e1a4a" />
      <polygon points="2064,-128 2488,-298 2912,-128" fill="#1e1a4a" />
      <ellipse cx={3264} cy={-592} rx={112} ry={72} fill="#133846" />
      {PASSAGES.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill="#131326" />
      ))}
      {(Object.keys(ROOM_RECT) as RoomId[]).map((id) => {
        const r = ROOM_RECT[id];
        const isCurrent = id === current;
        const seen = visited.includes(id);
        return (
          <rect
            key={id}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={isCurrent ? '#e8c565' : seen ? '#6b789e' : '#131326'}
            stroke={isCurrent ? '#fff0a6' : seen ? '#8b98bb' : '#3f4769'}
            strokeWidth={isCurrent ? 26 : 12}
          >
            {isCurrent && pulse && <animate attributeName="opacity" values="1;0.55;1" dur="1.6s" repeatCount="indefinite" />}
          </rect>
        );
      })}
    </svg>
  );
}
