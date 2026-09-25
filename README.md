# El Castillo de los Ecos

Una exploración nocturna en pixel art de un castillo medieval, recorrida con el scroll. La cámara cruza el puente levadizo, atraviesa el portón y sigue por puertas, escaleras y pasadizos reales hasta lo alto de la torre del observatorio. Por el camino hay tres ecos que abren el cofre del rey y tres secretos opcionales.

## Cómo ejecutarlo

Requiere Node 20 o superior y pnpm.

```bash
pnpm install
pnpm dev        # servidor de desarrollo en http://localhost:5173
pnpm build      # comprobación de tipos + build de producción en dist/
pnpm preview    # sirve dist/ para probar el build
pnpm lint       # ESLint
```

## El recorrido

| Sala | Interacción principal | Otros elementos que reaccionan | Secreto |
| --- | --- | --- | --- |
| Exterior y puente levadizo | Pergamino clavado en el poste | Ventana iluminada, cuervo | La pluma del cuervo (tócalo tres veces) |
| Gran vestíbulo | Inscripción bajo el escudo | Armadura, armadura con olla, fuego, tapiz | |
| Biblioteca encantada | Tres libros; el diario da el **primer eco** | Retrato cuyos ojos te siguen, vela, globo, cartel | El gato Bigotes |
| Sala de alquimia | Caldero: elige dos ingredientes (una mezcla da el **segundo eco**) | Frascos, planta carnívora, nota | Un ladrillo que sobresale |
| Patio (pasaje al aire libre) | | Luciérnagas y farol | |
| Armería | Armadura legendaria que saluda | Armero, escudos (placas descriptivas), muñeco, piedra de afilar | |
| Salón del trono | El trono vacío invoca al fantasma del rey (**tercer eco**) | Vitral, estandarte, sombrero de bufón | |
| Pasadizo secreto | Se abre al acercarse la cámara | El esqueleto y su cartel | |
| Tesoro | Cofre del rey: se abre con los tres ecos | Monedas, cofre que muerde, corona | |
| Torre del observatorio | Telescopio: epílogo y opción de volver a explorar | Planetario, cartas celestes, Bigotes (otra vez) | |

Se puede llegar al final sin encontrar ninguna pista: el cofre explica cuántos ecos faltan y el camino sigue.

## Estructura

```
src/
  engine/          motor de dibujo, sin React
    engine.ts      bucle, scroll → cámara, capas, luz, hotspots HTML
    lighting.ts    oscuridad por sala y luces con tramado Bayer
    pixel.ts       primitivas de píxel, sillería, madera, sprites de caracteres
    palette.ts     la paleta única (el CSS usa los mismos valores)
    viewport.ts    escalado entero de la resolución de arte
  world/           el castillo
    layout.ts      plano del corte: salas, muros, huecos de paso
    timeline.ts    línea de tiempo del scroll (tramos ext, dwell, move)
    tour.ts        recorrido completo y recorrido de movimiento reducido
    exterior.ts    exterior 2.5D con proyección por profundidad
    shell.ts       mampostería, tierra, almenas y tejados (teselas perezosas)
    sky.ts         cielo, estrellas, luna, cordilleras y niebla
    props.ts       decorado reutilizable (antorchas, estanterías, armaduras...)
    rooms/         una sala (o grupo de pasajes) por archivo
  content/texts.ts todo el texto narrativo y las acciones de cada objeto
  state/store.ts   progreso persistente (localStorage) con useSyncExternalStore
  audio/ambient.ts sonido ambiental sintetizado con Web Audio
  ui/              interfaz React: HUD, cartela, diálogos, mapa, inventario
```

## Cómo personalizarlo

- **Textos:** todo está en `src/content/texts.ts`. Cada objeto interactivo tiene un `id` (por ejemplo `hall.armor`) y una acción: diálogo, frase, placa, secreto, caldero, cofre o epílogo.
- **Paleta:** `src/engine/palette.ts` para el arte y las variables de `:root` en `src/styles/global.css` para la interfaz.
- **Ritmo del scroll:** en `src/world/tour.ts`, `len` es la duración de cada tramo en pantallas de scroll. `from` y `to` indican el recorrido de la cámara dentro de una sala (0..1 en cada eje).
- **Una sala nueva:** se añade su rectángulo en `layout.ts` (y en `MASSES`/`OPENINGS` si abre muros), se crea un `SpaceDef` en `world/rooms/` con `bake`, `draw`, `lights` y `hotspots`, se registra en `SPACES` y se le da un tramo en `tourSegments()`.
- **Tamaño del píxel:** `TARGET_LANDSCAPE` y `TARGET_PORTRAIT` en `viewport.ts` fijan cuántos píxeles de arte se ven en vertical.

## Decisiones técnicas

- **Vite + React + TypeScript, sin librería de animación.** La cámara es una función pura del progreso del scroll: con GSAP o ScrollTrigger habría dos sistemas controlando la misma animación. React solo maneja la interfaz (diálogos, inventario, mapa), y el lienzo se dibuja fuera de React.
- **Canvas 2D propio en lugar de PixiJS o WebGL.** La escena se dibuja a unos 360×225 píxeles de arte, y a esa resolución Canvas 2D va sobrado: en las pruebas mantuvo la tasa de refresco completa (144 Hz). Así no hay 400 kB de dependencias ni un contexto WebGL que pueda fallar.
- **Escalado entero.** Cada píxel de arte ocupa un número entero de píxeles físicos (también con densidades de 1.25 o 3), con `image-rendering: pixelated`. El tamaño de píxel es constante y nunca se ve borroso.
- **Un solo mundo continuo.** El castillo es un corte transversal: todas las salas comparten coordenadas, así que ir hacia delante o hacia atrás con el scroll es literalmente mover la cámara por el mismo plano. El mapa se genera a partir de ese mismo plano.
- **Exterior en 2.5D sin ampliaciones borrosas.** Cada capa tiene una profundidad y se vuelve a rasterizar a su escala en cada cambio de cámara. Al acercarse, las piezas crecen, pero el píxel sigue siendo del mismo tamaño.
- **Arte procedural y sprites de caracteres.** Todo el arte está dibujado en código: no hay imágenes externas ni licencias de terceros. Las texturas usan hash deterministas por coordenada de mundo, de modo que no se ven costuras entre lienzos.
- **Luz tramada.** Cada sala tiene su oscuridad ambiente y se "revela" al entrar la cámara. Las luces perforan esa oscuridad con discos cuantizados a cuatro niveles y matriz Bayer, como el pixel art hecho a mano.
- **Carga progresiva.** Las salas y las teselas de mampostería se hornean la primera vez que se acercan a la cámara, dos teselas por fotograma como máximo.
- **Scroll nativo.** La rueda, el teclado y el táctil no se secuestran; el progreso solo se suaviza (desactivado en movimiento reducido).
- **Accesibilidad.** Cada objeto interactivo es un `<button>` real colocado sobre el lienzo, que se oculta cuando sale de cuadro. Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco. El texto de cada sala está en HTML con `aria-live`. Hay un enlace para saltar al contenido.
- **Movimiento reducido.** Respeta `prefers-reduced-motion`, y además se puede activar a mano en Ajustes. Da un recorrido alternativo más corto: sin zoom de entrada, sin inercia, con cortes suaves entre salas y la cámara pegada al scroll.
- **Rendimiento adaptativo.** Si durante unos dos segundos no se sostienen 40 fps, la calidad baja sola: píxeles más grandes y sin brillo aditivo. También se puede elegir en Ajustes.
- **Sonido.** Ambiente sintetizado con Web Audio (viento, fuego y un acorde por sala), sin archivos externos. Está apagado al empezar y tiene un botón visible.

## Recursos y licencias

- Tipografías (vía `@fontsource`, empaquetadas en el build): *Jacquarda Bastarda 9* para los títulos, *Pixelify Sans* para la interfaz y *Alegreya* para los textos. Las tres tienen licencia SIL Open Font License 1.1.
- Arte y sonido: creados en código para este proyecto.
