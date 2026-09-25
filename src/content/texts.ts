import type { RoomId } from '../world/types';

/** Todo el texto narrativo del castillo, en un solo lugar. */

export const ROOMS: Record<RoomId, { name: string; line: string }> = {
  exterior: {
    name: 'El Castillo de los Ecos',
    line: 'Cae la noche sobre las montañas. Arriba, en la torre, alguien ha dejado una luz encendida.',
  },
  hall: {
    name: 'Gran Vestíbulo',
    line: 'Aquí dentro todo resuena dos veces. Las armaduras te miran como si fueras tú el intruso. Lo eres.',
  },
  library: {
    name: 'Biblioteca Encantada',
    line: 'Algunos libros duermen, otros vuelan. Tres de ellos brillan como si quisieran que los abrieras.',
  },
  alchemy: {
    name: 'Sala de Alquimia',
    line: 'Huele a azufre, a menta y a cejas chamuscadas. El caldero lleva siglos hirviendo sin que nadie lo avive.',
  },
  armory: {
    name: 'Armería',
    line: 'Cada espada tiene un nombre y cada escudo, una historia. El muñeco de paja las ha oído todas.',
  },
  throne: {
    name: 'Salón del Trono',
    line: 'Vitrales, estandartes y un trono vacío que nadie se atreve a ocupar. Todavía.',
  },
  treasure: {
    name: 'Tesoro y Pasadizo',
    line: 'Oro, reliquias y un cofre con tres engastes apagados. El castillo espera que los enciendas.',
  },
  observatory: {
    name: 'Torre del Observatorio',
    line: 'Lo más alto del castillo. Desde aquí Aldric buscaba su llave entre las estrellas.',
  },
};

export interface DialogContent {
  title: string;
  kicker?: string;
  body: string[];
  signature?: string;
}

export type Action =
  | { type: 'dialog'; dialog: DialogContent; clue?: string }
  | { type: 'speech'; lines: string[] }
  | { type: 'plaque'; title: string; text: string }
  | { type: 'secret'; lines: string[]; secret: string; after?: number }
  | { type: 'brew' }
  | { type: 'chest' }
  | { type: 'ending' };

export const ACTIONS: Record<string, Action> = {
  /* ------------------------------ exterior ------------------------------ */
  'ext.letter': {
    type: 'dialog',
    dialog: {
      kicker: 'Pergamino clavado en el poste',
      title: 'Se busca heredero',
      body: [
        'El castillo de los Ecos busca a alguien que lo herede. Se valorará la curiosidad, el valor y no tener alergia a los fantasmas.',
        'El antiguo rey dejó un tesoro y ninguna instrucción útil. Dicen que el castillo repite lo que oye, y que guarda lo que callas.',
        'La entrada es libre. La salida, probablemente también.',
      ],
      signature: 'El Mayordomo (difunto, pero puntual)',
    },
  },
  'ext.raven': {
    type: 'secret',
    lines: ['¡Cruac!', '¡Cruac, cruac! ¿No tienes nada mejor que hacer?', '¡Está bien! Toma, y déjame dormir.'],
    secret: 'pluma',
    after: 3,
  },
  'ext.window': {
    type: 'speech',
    lines: ['¡Son las tantas! ¡Aquí hay fantasmas que madrugan!', '¿Otra vez? Voy a llamar al mayordomo. Ah, no, que está muerto.'],
  },

  /* ------------------------------ vestíbulo ------------------------------ */
  'hall.inscription': {
    type: 'dialog',
    dialog: {
      kicker: 'Placa de bronce bajo el escudo',
      title: 'La inscripción',
      body: [
        '«Lo que aquí se dice, el castillo lo repite. Lo que aquí se calla, el castillo lo guarda.»',
        'Debajo, alguien añadió con letra torpe y prisa: «Tres ecos abren el cofre del rey. Búscalos antes que el polvo».',
      ],
    },
  },
  'hall.armor': {
    type: 'speech',
    lines: ['¡Eh! ¡Sin tocar, que me acaban de pulir!', 'Trescientos años de guardia y ni una siesta.', '¿Otra vez tú? Sigue recto, la biblioteca está a la derecha.'],
  },
  'hall.pot': {
    type: 'speech',
    lines: ['Clonc.', 'Es un yelmo de diseño. No preguntes.', 'Clonc, clonc. (Parece orgulloso.)'],
  },
  'hall.fire': {
    type: 'speech',
    lines: ['Las llamas chisporrotean y, por un instante, dibujan una torre.', 'El fuego te devuelve el saludo. Con chispas.'],
  },
  'hall.tapestry': {
    type: 'speech',
    lines: ['Detrás del tapiz solo hay pared… y una araña muy ofendida.', 'El cuervo bordado parece seguirte con la mirada.'],
  },

  /* ------------------------------ biblioteca ------------------------------ */
  'library.book1': {
    type: 'dialog',
    dialog: {
      kicker: 'Libro verde agua, estantería baja',
      title: 'Tratado de las ranas cantoras',
      body: [
        'Las ranas del foso cantaban en do mayor hasta que el rey pidió silencio para dormir.',
        'Desde entonces cantan en do menor, por respeto. El rey sigue sin dormir, pero ahora se pone triste.',
      ],
    },
  },
  'library.book2': {
    type: 'dialog',
    dialog: {
      kicker: 'Libro dorado, balcón',
      title: 'Crónica de Aldric el Distraído',
      body: [
        'Aldric levantó este castillo piedra a piedra y luego olvidó dónde había guardado la llave de su propio tesoro.',
        'Pasó sus últimos años en la torre, mirando las estrellas. Decía que la buscaba. Nadie le creyó, pero todos le dejaban la luz encendida.',
      ],
    },
  },
  'library.book3': {
    type: 'dialog',
    clue: 'leido',
    dialog: {
      kicker: 'Libro rojo que flota bajo la luna',
      title: 'Diario de la reina Isolda',
      body: [
        '«Aldric esconde su corazón donde duermen las monedas. No abrirá con llave, sino con ecos.»',
        '«Tres hacen falta: el que se lee, el que se hierve y el que se llora. Este es el primero; guárdalo bien.»',
      ],
    },
  },
  'library.portrait': {
    type: 'speech',
    lines: ['El rey Aldric te guiña un ojo. Los retratos no deberían hacer eso.', 'Sus ojos te siguen. Por toda la sala. Incluso detrás de la estantería.', 'En la placa del marco pone: «Aldric, rey, astrónomo, despistado».'],
  },
  'library.candle': { type: 'speech', lines: ['Fffff. (La vela se apaga… y vuelve a encenderse sola. Qué raro.)', 'La vela no se deja. Es una vela con carácter.'] },
  'library.globe': { type: 'speech', lines: ['El globo gira. Algunos continentes todavía no se han inventado.', 'Aquí pone «Aquí hay dragones». Y una flecha. Que apunta al castillo.'] },
  'library.sign': { type: 'speech', lines: ['«↓ ALQUIMIA. Prohibido lamer los frascos. Sí, otra vez.»'] },
  'library.cat': {
    type: 'secret',
    lines: ['Mrrr… (Bigotes abre un ojo y te concede su aprobación.)', 'Bigotes ronronea. Eres oficialmente de fiar.'],
    secret: 'gato',
    after: 1,
  },

  /* ------------------------------ alquimia ------------------------------ */
  'alchemy.brew': { type: 'brew' },
  'alchemy.shelf': {
    type: 'speech',
    lines: ['Clin, clin. Uno de los frascos te guiña un ojo. Mejor no preguntar.', 'Etiquetas: «Jarabe de dragón», «No beber», «En serio, no beber».'],
  },
  'alchemy.plant': {
    type: 'speech',
    lines: ['¡ÑAC! La planta te mira ofendida: esperaba algo con más proteínas.', 'La planta mastica el aire con resentimiento.'],
  },
  'alchemy.note': {
    type: 'speech',
    lines: ['«NUNCA mezclar polvo de estrella con raíz de mandrágora. Nunca. Firmado: el alquimista (sin cejas).»'],
  },
  'alchemy.brick': {
    type: 'secret',
    lines: ['El ladrillo cede. Detrás hay una receta enrollada: «Galletas del alquimista (sin azufre)».'],
    secret: 'ladrillo',
    after: 1,
  },

  /* ------------------------------ armería ------------------------------ */
  'armory.legend': {
    type: 'dialog',
    dialog: {
      kicker: 'Placa del pedestal',
      title: 'La armadura de Aldric',
      body: [
        'Forjada para la coronación con acero de una estrella caída. Aldric solo se la puso una vez: se atascó en la puerta y decidió gobernar en zapatillas.',
        'Dicen que saluda a quien de verdad quiere heredar el castillo. Acaba de saludarte.',
      ],
    },
  },
  'armory.sword': {
    type: 'plaque',
    title: 'Armero de espadas',
    text: 'Cinco hojas y ninguna gemela. La del pomo rojo se llama Pinchito; su dueño no tenía mucha imaginación.',
  },
  'armory.shield': {
    type: 'plaque',
    title: 'Pared de escudos',
    text: 'Blasones de las casas vecinas. El del dragón verde es de los primos lejanos, que vienen a cenar cada cien años.',
  },
  'armory.dummy': {
    type: 'speech',
    lines: ['¡Pof! El muñeco encaja el golpe con dignidad… y pierde un poco de paja.', '«¿Eso es todo?», parece decir su sonrisa pintada.', 'Alguien le cosió un corazón en la espalda. Qué detalle.'],
  },
  'armory.grindstone': {
    type: 'speech',
    lines: ['La piedra gira y lanza chispas. Por un momento, todas las espadas parecen más afiladas.', 'Chirría un poco. Nadie la engrasa desde el siglo pasado.'],
  },

  /* ------------------------------ salón del trono ------------------------------ */
  'throne.throne': {
    type: 'dialog',
    clue: 'llorado',
    dialog: {
      kicker: 'El trono vacío',
      title: 'El fantasma del rey',
      body: [
        'Un frío te sube por los brazos y sobre el trono aparece un rey translúcido con la corona torcida.',
        '«¿Otra persona que viene a heredar? Llevo siglos esperando a alguien que no venga solo por el oro. El tesoro está abajo, tras mi trono; el pasadizo se abrirá para ti.»',
        'Al nombrar a su reina, se le escapa una lágrima que cae tintineando sobre el suelo. Es un eco que se llora.',
      ],
    },
  },
  'throne.window': {
    type: 'speech',
    lines: ['La luna atraviesa el vitral y pinta el suelo de colores.', 'En el vitral, la corona brilla como si alguien la hubiera limpiado ayer.'],
  },
  'throne.banner': { type: 'speech', lines: ['El estandarte ondea sin que sople el viento. Aquí nada se queda quieto del todo.'] },
  'throne.jester': {
    type: 'speech',
    lines: ['¡Tilín, tilín! El bufón se fue hace siglos, pero el sombrero sigue de guardia.', '¡Tilín! Si escuchas bien, en el eco todavía se oye un chiste malo.'],
  },
  'shaft.skeleton': { type: 'speech', lines: ['El cartel dice: «Yo tampoco encontré la salida. Sigue bajando».'] },

  /* ------------------------------ tesoro ------------------------------ */
  'treasure.chest': { type: 'chest' },
  'treasure.coins': {
    type: 'speech',
    lines: ['Las monedas ruedan en todas direcciones. Ninguna lleva la cara de Aldric: todas llevan la del gato.', 'Hundes las manos en el oro. Está más frío de lo que esperabas.'],
  },
  'treasure.mimic': {
    type: 'speech',
    lines: ['¡No soy un cofre! …Vale, sí soy un cofre. Pero muerdo.', '¡GRRR! (Ha sido un gruñido bastante educado.)'],
  },
  'treasure.crown': {
    type: 'speech',
    lines: ['Pesa más de lo que parece. La responsabilidad, digo.', 'Por dentro tiene grabado: «Para quien escuche».'],
  },

  /* ------------------------------ observatorio ------------------------------ */
  'observatory.telescope': { type: 'ending' },
  'observatory.orrery': {
    type: 'speech',
    lines: ['Los planetas de latón giran más deprisa. Uno lleva gorro de dormir.', 'Según este planetario, la Tierra es plana los martes.'],
  },
  'observatory.chart': {
    type: 'speech',
    lines: ['Una constelación con forma de cuervo que sostiene una corona. Al lado, Aldric anotó: «¡Aquí estaba la llave!».'],
  },
  'observatory.cat': {
    type: 'speech',
    lines: ['Bigotes te espera en el alféizar. Nadie sabe cómo ha llegado antes que tú.', 'Mrrr. (Bigotes considera que ya has explorado bastante. O no.)'],
  },
};

export const CLUES: Record<string, { name: string; text: string }> = {
  leido: { name: 'El eco que se lee', text: 'Una página del diario de la reina: «Tres ecos abren el corazón del rey».' },
  hervido: { name: 'El eco que se hierve', text: 'Del caldero salió tu propio nombre, repetido dos veces en plata.' },
  llorado: { name: 'El eco que se llora', text: 'Una lágrima del rey fantasma, fría y brillante como el cristal.' },
};

export const SECRETS: Record<string, { name: string; text: string }> = {
  pluma: { name: 'Pluma de cuervo', text: 'Negra, con reflejos violeta. El cuervo te la dio para que lo dejaras en paz.' },
  gato: { name: 'La aprobación de Bigotes', text: 'El gato de la biblioteca te considera de fiar. No es poca cosa.' },
  ladrillo: { name: 'La receta escondida', text: 'Galletas del alquimista (sin azufre). Estaba detrás de un ladrillo suelto.' },
};

/* ------------------------------ alquimia ------------------------------ */

export const INGREDIENTS: { id: string; name: string; hint: string }[] = [
  { id: 'estrella', name: 'Polvo de estrella', hint: 'brilla y pica la nariz' },
  { id: 'mandragora', name: 'Raíz de mandrágora', hint: 'murmura cosas' },
  { id: 'triton', name: 'Ojo de tritón', hint: 'te está mirando' },
  { id: 'dragon', name: 'Escama de dragón', hint: 'todavía está caliente' },
  { id: 'seta', name: 'Seta luminosa', hint: 'huele a bosque de noche' },
];

export type BrewOutcome = 'eco' | 'chispas' | 'rana' | 'humo' | 'eructo';

export function brew(a: string, b: string): BrewOutcome {
  const pair = [a, b].sort().join('+');
  if (pair === 'estrella+mandragora') return 'eco';
  if (a === 'dragon' || b === 'dragon') return 'chispas';
  if (a === 'triton' || b === 'triton') return 'rana';
  if (a === 'seta' || b === 'seta') return 'humo';
  return 'eructo';
}

export const BREW_TEXT: Record<BrewOutcome, string> = {
  eco: 'El caldero se vuelve plateado y, desde el fondo, una voz repite tu nombre dos veces.',
  chispas: '¡FUUUM! Chispas de colores por todo el techo. El alquimista estaría orgulloso. O sin cejas.',
  rana: 'Una rana salta del caldero, te mira con desdén y se aleja croando en do menor.',
  humo: 'Humo violeta con olor a calcetín mágico. Mejor no respirar muy hondo.',
  eructo: 'El caldero eructa. Educadamente, eso sí.',
};

export const BREW_CLUE: DialogContent = {
  kicker: 'El caldero',
  title: 'Un eco que se hierve',
  body: [
    'El polvo de estrella y la mandrágora se funden en plata. Del vapor sale tu nombre, dos veces, con la voz del castillo.',
    'Ahora entiendes por qué la nota decía «nunca»: el alquimista no quería que nadie más encontrara este eco.',
  ],
};

/* ------------------------------ tesoro y final ------------------------------ */

export const CHEST_OPEN: DialogContent = {
  kicker: 'El cofre del rey',
  title: 'El corazón de Aldric',
  body: [
    'Los tres engastes se encienden y la tapa se abre sola. Dentro no hay oro: hay una pequeña caja de música dorada.',
    'Al abrirla suena una melodía que ya conoces; la has oído en cada sala, repetida por las paredes. El tesoro de Aldric eran los ecos del castillo, y ahora también son tuyos.',
  ],
};

export function chestLocked(found: number): DialogContent {
  const lit = found === 0 ? 'ninguno brilla' : found === 1 ? 'solo uno brilla' : 'solo dos brillan';
  return {
    kicker: 'El cofre del rey',
    title: 'Faltan ecos',
    body: [
      `El cofre tiene tres engastes y ${lit}. Una voz murmura desde dentro: «Vuelve cuando me hayas escuchado entero».`,
      'No importa: el pasadizo sigue hacia la torre. Desde el mapa podrás volver a cualquier sala visitada.',
    ],
  };
}

export function epilogue(clues: number, secrets: number): DialogContent {
  const all = clues === 3;
  return {
    kicker: 'Lo alto de la torre',
    title: 'Epílogo',
    body: [
      'Miras por el telescopio y las estrellas se ordenan despacio: un cuervo que sostiene una corona. Aldric nunca buscó una llave; buscaba a alguien que escuchara el castillo tanto como él.',
      `Has reunido ${clues} de 3 ecos y ${secrets} de 3 secretos. ${all ? 'El Castillo de los Ecos ya tiene heredero.' : 'Todavía hay cosas que el castillo no te ha contado.'}`,
    ],
    signature: all ? 'El Mayordomo, que por fin puede descansar' : 'El Mayordomo, que seguirá esperando',
  };
}

export const CLUE_ORDER = ['leido', 'hervido', 'llorado'];
export const SECRET_ORDER = ['pluma', 'gato', 'ladrillo'];
