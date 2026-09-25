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
  alchemy: { name: 'Sala de Alquimia', line: '' },
  armory: { name: 'Armería', line: '' },
  throne: { name: 'Salón del Trono', line: '' },
  treasure: { name: 'Tesoro y Pasadizo', line: '' },
  observatory: { name: 'Torre del Observatorio', line: '' },
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
  | { type: 'secret'; lines: string[]; secret: string; after?: number };

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
};

export const CLUES: Record<string, { name: string; text: string }> = {
  leido: { name: 'El eco que se lee', text: 'Una página del diario de la reina: «Tres ecos abren el corazón del rey».' },
  hervido: { name: 'El eco que se hierve', text: 'Aún por descubrir.' },
  llorado: { name: 'El eco que se llora', text: 'Aún por descubrir.' },
};

export const SECRETS: Record<string, { name: string; text: string }> = {
  pluma: { name: 'Pluma de cuervo', text: 'Negra, con reflejos violeta. El cuervo te la dio para que lo dejaras en paz.' },
  gato: { name: 'La aprobación de Bigotes', text: 'El gato de la biblioteca te considera de fiar. No es poca cosa.' },
  ladrillo: { name: 'El ladrillo suelto', text: 'Aún por descubrir.' },
};

export const CLUE_ORDER = ['leido', 'hervido', 'llorado'];
export const SECRET_ORDER = ['pluma', 'gato', 'ladrillo'];
