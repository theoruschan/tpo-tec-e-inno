# 09 — Sistema visual "sello / documento" (ADR-009)

**Estado:** Implementado (28/10/2026)

## Decisión

La app tenía un aspecto de plantilla genérica (violeta, tarjetas redondeadas, íconos de librería). Se rediseñó con una idea única: **CuartoSeguro emite un documento con un sello**. Encaja con lo que el producto entrega (el "certificado preventivo" del PDF) y no se parece a ninguna app estándar.

- **Papel y tinta:** fondo crema con un grano muy sutil, texto en tinta casi negra, botones primarios negros. Un único acento: el **rojo de sello**.
- **Tipografía (autoalojada, sin CDN):** *Fraunces* (serif con carácter) para títulos, *IBM Plex Sans* para texto y *IBM Plex Mono* para etiquetas, contadores y datos tipo ficha. Pesan ~90 kB y se descargan solo los subconjuntos que hacen falta.
- **El veredicto es un sello** (`VerdictStamp`): borde doble, leve rotación, tinta que se estampa al aparecer (se desactiva con `prefers-reduced-motion`). El texto sigue siendo texto real: un lector de pantalla lee "Anuncio sospechoso" como siempre.
- **Esquinas casi cuadradas y sombras planas:** la jerarquía la dan los bordes, como en un formulario.
- **Portada pensada para el estudiante:** conserva los textos exactos del prototipo del PDF 3 (título, los dos botones, "Gratis para estudiantes"), pero habla de la situación ("Te piden una seña…") y explica qué se revisa (la foto, el precio, quién cobra). La matriz de priorización del TP (alternativas 1, 6 y 11 con sus puntajes) pasó a **Sobre el proyecto**.
- **Marca:** sello circular con tilde roja (logo, favicon, ícono del celular e imagen para compartir el link).

## Cómo está hecho (para poder cambiarlo)

Todo el tema vive en [`src/index.css`](../src/index.css), en un bloque `@theme` de Tailwind 4. En vez de reescribir cada pantalla, se **redefinieron las escalas que ya usaba toda la app**: `slate` (neutros) pasó a papel/tinta cálidos e `indigo` (color de marca) pasó a tinta; también los radios (`--radius-*`) y las sombras (`--shadow-*`). Cambiar la identidad de nuevo es cambiar ese bloque. Piezas propias: `VerdictStamp`, la clase `.stamp`, `Navbar` y las pantallas 1 y 6 (más `AboutView`).

## Restricciones que condicionan el diseño

- **CSP de producción:** `font-src 'self' data:` y `style-src 'self' 'unsafe-inline'` → las tipografías se empaquetan con `@fontsource` (no se puede usar Google Fonts) y el grano de papel es un SVG embebido (`img-src` permite `data:`).
- **Accesibilidad:** axe-core en 0 violaciones en las 14 vistas (incluidas las nuevas). Los neutros se calibraron para contraste AA sobre el crema; el rojo y el verde de veredicto son versiones más apagadas de los semánticos.
- **Celular:** la cabecera deja de ser fija y los enlaces van en una fila deslizable (ocupaba ~260 px antes del contenido); la ficha del veredicto recorta el desborde horizontal de la animación del sello.

## Límites conocidos

- El rediseño específico llegó a la portada, la barra superior y el resultado; el resto de las pantallas (formulario, detalles, reporte, directorio, laboratorio, historial) heredan el tema por las escalas de color, los radios y las sombras, pero conservan su estructura anterior. Son candidatas a un segundo pase.
- La animación del sello no se pudo ver "en vivo" en las pruebas automatizadas (la pestaña de prueba pausa las animaciones en segundo plano): se verificó su estado inicial y final y que no genera desborde, no el movimiento.
- El PDF descargable (jsPDF) usa solo el encabezado en tinta; su maquetación sigue siendo la de la Fase 4 (Helvetica, sin Fraunces).
