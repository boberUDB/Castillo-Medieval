import { memo } from 'react';

/**
 * Iconos de pixel art definidos como cuadrícula de caracteres, igual que los
 * sprites del lienzo. Se renderizan como SVG con bordes nítidos.
 */
const ICONS = {
  castle: {
    rows: [
      'a.a.a..a.a.a',
      'aaaaa..aaaaa',
      '.aba....aba.',
      '.abaa.aaaba.',
      '.abbbbbbbba.',
      '.abbbaabbba.',
      '.abbacca.ba.',
      '.abbaccabba.',
      '.aaaaaaaaaa.',
    ],
    colors: { a: '#0a0816', b: '#8b98bb', c: '#ffa53d' },
  },
  bag: {
    rows: [
      '....aaaa....',
      '...ac..ca...',
      '..aaaaaaaa..',
      '.abbbbbbbba.',
      '.abddddddba.',
      '.abbbccbbba.',
      '.abbbccbbba.',
      '.abbbbbbbba.',
      '.abbbbbbbba.',
      '..aaaaaaaa..',
    ],
    colors: { a: '#0a0816', b: '#9a6639', c: '#e8c565', d: '#5c3822' },
  },
  soundOn: {
    rows: [
      '.....a......',
      '....aa....a.',
      'aaaaba..a..a',
      'abbbba...a.a',
      'abbbba...a.a',
      'aaaaba..a..a',
      '....aa....a.',
      '.....a......',
    ],
    colors: { a: '#f0e2b8', b: '#8b98bb' },
  },
  soundOff: {
    rows: [
      '.....a......',
      '....aa......',
      'aaaaba.c...c',
      'abbbba..c.c.',
      'abbbba...c..',
      'aaaaba..c.c.',
      '....aa.c...c',
      '.....a......',
    ],
    colors: { a: '#8b98bb', b: '#525d82', c: '#b43b45' },
  },
  gear: {
    rows: [
      '....aaaa....',
      '.aa.abba.aa.',
      '.abaabbaaba.',
      '..abbbbbba..',
      'aabbaaaabbaa',
      'abbba..abbba',
      'abbba..abbba',
      'aabbaaaabbaa',
      '..abbbbbba..',
      '.abaabbaaba.',
      '.aa.abba.aa.',
      '....aaaa....',
    ],
    colors: { a: '#0a0816', b: '#a2abc8' },
  },
  feather: {
    rows: ['.......aa', '......aba', '.....aba.', '....abba.', '...abba..', '..abba...', '.abba....', '.aa......', 'a........'],
    colors: { a: '#0a0816', b: '#433066' },
  },
  cat: {
    rows: ['a...a....', 'aa.aa....', 'abbba....', 'acbcaaaa.', 'abbbbbbba', '.abbbbbba', '.aa.aa.aa'],
    colors: { a: '#0a0816', b: '#6b789e', c: '#8ccf62' },
  },
  brick: {
    rows: ['aaaaaaaaaa', 'abbbbbbbba', 'abccbbbbba', 'abbbbbbcba', 'aaaaaaaaaa'],
    colors: { a: '#0a0816', b: '#8a2539', c: '#b43b45' },
  },
  page: {
    rows: ['aaaaaaa.', 'abbbbbaa', 'abccccba', 'abbbbbba', 'abcccbba', 'abbbbbba', 'abccccba', 'aaaaaaaa'],
    colors: { a: '#3a2616', b: '#f0e2b8', c: '#7a6038' },
  },
  flask: {
    rows: ['..aaa..', '..aba..', '..aba..', '.abbba.', 'abcccba', 'acccdca', 'accccca', '.aaaaa.'],
    colors: { a: '#0a0816', b: '#c9fff4', c: '#4e9148', d: '#d0f59a' },
  },
  tear: {
    rows: ['...a...', '..aba..', '..aba..', '.abbba.', 'abbcbba', 'abbbbba', '.abbba.', '..aaa..'],
    colors: { a: '#0a0816', b: '#7fcff2', c: '#c4f1ff' },
  },
  unknown: {
    rows: ['.aaaa.', 'a....a', '....a.', '...a..', '...a..', '......', '...a..'],
    colors: { a: '#7a6038' },
  },
  arrow: {
    rows: ['..aaa..', '..aaa..', '..aaa..', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'],
    colors: { a: '#d9c08e' },
  },
} as const;

export type IconName = keyof typeof ICONS;

export const PixelIcon = memo(function PixelIcon({ name, size = 24 }: { name: IconName; size?: number }) {
  const icon = ICONS[name];
  const w = Math.max(...icon.rows.map((r) => r.length));
  const h = icon.rows.length;
  const rects: { x: number; y: number; c: string }[] = [];
  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as keyof typeof icon.colors;
      const c = icon.colors[ch];
      if (c) rects.push({ x, y, c });
    }
  });
  return (
    <svg
      width={size}
      height={Math.round((size * h) / w)}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={1} height={1} fill={r.c} />
      ))}
    </svg>
  );
});
