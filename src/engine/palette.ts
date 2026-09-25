/**
 * Paleta única del castillo. Todo el arte (canvas y CSS) sale de aquí para que
 * las habitaciones compartan la misma luz y el mismo material.
 */
export const P = {
  // Cielo nocturno
  night0: '#07061a',
  night1: '#0d0b26',
  night2: '#151238',
  night3: '#1e1a4a',
  night4: '#2a255e',
  star: '#f2efff',
  starDim: '#8f95d6',
  moon: '#f4ecd2',
  moonShade: '#c7bd9c',

  // Montañas y niebla
  mount0: '#141332',
  mount1: '#1c1b42',
  mount2: '#262752',
  mount3: '#323566',
  fog: '#4b4f8c',

  // Piedra azul grisácea (de sombra a luz)
  stone0: '#131326',
  stone1: '#1b1c35',
  stone2: '#252845',
  stone3: '#313656',
  stone4: '#3f4769',
  stone5: '#525d82',
  stone6: '#6b789e',
  stone7: '#8b98bb',

  // Sombras violetas
  violet0: '#120c24',
  violet1: '#1f1538',
  violet2: '#2e1f4d',
  violet3: '#433066',

  // Madera oscura
  wood0: '#1e120e',
  wood1: '#2e1b13',
  wood2: '#43281a',
  wood3: '#5c3822',
  wood4: '#7a4c2c',
  wood5: '#9a6639',

  // Luz de antorcha
  fire0: '#fff6c9',
  fire1: '#ffd66b',
  fire2: '#ffa53d',
  fire3: '#eb6a2a',
  fire4: '#b23a22',
  fire5: '#6e2019',

  // Rojos de estandartes y tapices
  red0: '#3a0f1f',
  red1: '#5e1a2d',
  red2: '#8a2539',
  red3: '#b43b45',

  // Oro
  gold0: '#5a4016',
  gold1: '#8c6423',
  gold2: '#c29337',
  gold3: '#e8c565',
  gold4: '#fff0a6',

  // Verdes (alquimia, musgo)
  green0: '#142a22',
  green1: '#1f4230',
  green2: '#2f6440',
  green3: '#4e9148',
  green4: '#8ccf62',
  green5: '#d0f59a',

  // Magia turquesa
  teal0: '#133846',
  teal1: '#1e5e6e',
  teal2: '#2f94a0',
  teal3: '#68ddd3',
  teal4: '#c9fff4',

  // Azul (libros, vitrales)
  blue0: '#16204a',
  blue1: '#243a7a',
  blue2: '#3a62b0',
  blue3: '#6f9be0',

  // Pergamino
  parch0: '#f0e2b8',
  parch1: '#d9c08e',
  parch2: '#b3945f',
  parch3: '#7a6038',

  // Metal
  metal0: '#2c3047',
  metal1: '#474e6b',
  metal2: '#6d7797',
  metal3: '#a2abc8',
  metal4: '#dde3f5',

  // Fantasma
  ghost0: '#3d7fb0',
  ghost1: '#7fcff2',
  ghost2: '#c4f1ff',

  ink: '#0a0816',
  black: '#050410',
} as const;

export type PaletteKey = keyof typeof P;
