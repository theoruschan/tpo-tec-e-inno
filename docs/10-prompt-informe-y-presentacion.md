# 10 — Prompt para generar el informe y la presentación

Copiá todo lo que está debajo de la línea en una conversación nueva (con adjuntos opcionales: capturas de la app, `docs/entregables/`, `docs/04-experimento-validacion-30-anuncios.md`). Está escrito para que el resultado sea honesto con lo que el proyecto **sí** y **no** hace.

---

## PROMPT

Actuá como redactor técnico y diseñador de presentaciones. Con la información de abajo, generá **(A) un informe formal del proyecto** y **(B) una presentación (PPT) de 12 a 15 diapositivas** para la defensa oral. Escribí en español rioplatense formal, directo, sin exageraciones ni frases de marketing. No inventes datos, métricas ni resultados que no figuren acá: si falta algo, dejalo marcado como "[completar]". Respetá las salvedades de la sección 9: son parte del contenido, no un detalle opcional.

### 1. Contexto académico
- Trabajo práctico de **Tecnología e Innovación, UADE**. **Grupo 12**: Fernández, Lecuenis, Ruschanoff.
- Proyecto: **CuartoSeguro**, verificación preventiva de alquileres y subalquileres para estudiantes universitarios, antes de pagar una seña.
- Origen: un prototipo con datos simulados (8 pantallas, definido en el PDF 3 de entregables). Este trabajo lo llevó a una **aplicación web desplegada, usable y honesta sobre sus límites**.
- La matriz de priorización del TP evaluó alternativas con puntajes 17/20, 18/20 y 16/20 (alternativas 1, 6 y 11); la elegida es la que dio origen a CuartoSeguro. Está en la pantalla "Sobre el proyecto".

### 2. Problema y propuesta de valor
- Problema: estudiantes que se mudan a otra ciudad reciben avisos de alquiler falsos (fotos robadas, precios engañosos, pedido de seña por transferencia a cuentas de terceros).
- Propuesta: un chequeo **gratuito, en minutos**, que cruza tres señales: **la foto** (¿ya apareció en otro anuncio?), **el precio** (¿es coherente con la zona?) y **quién cobra** (¿el CBU/alias o la identidad fueron reportados?).
- Resultado: un **veredicto** (Anuncio sospechoso / Verificado / Sin datos suficientes), un **índice de confianza**, los **motivos explicados uno por uno**, una **recomendación** y un **reporte descargable/compartible** (por ejemplo, para un familiar que va a pagar).
- Principio de diseño: son **señales, no una garantía**. La app nunca dice que un anuncio es seguro, solo que no encontró alertas con las bases que tiene.

### 3. Flujo de usuario (8 pantallas del prototipo, textos del PDF conservados)
1. Inicio ("Verificá un alquiler antes de pagar.") · 2. Instrucciones · 3. Carga del anuncio ("Pegá el link o la captura.") · 4. Control de calidad de los datos · 5. Procesamiento · 6. Veredicto · 7. Detalles ("Por qué marcamos este anuncio.") · 8. Reporte ("Resumen de la verificación.").
Vistas auxiliares: historial de verificaciones, directorio colaborativo de CBU/alias, laboratorio del experimento (30 anuncios), sobre el proyecto, condiciones del piloto y panel admin oculto.

### 4. Qué se implementó (por fases, todo desplegado)
- **Fase 0, base y calidad:** TypeScript estricto, ESLint, Vitest, CI en GitHub Actions (typecheck + lint + test + build en cada push), Node 20, pnpm fijado.
- **Fase 1, despliegue:** Vercel con auto-deploy desde `main`; cabeceras de seguridad y CSP estricta (`vercel.json`); mismas cabeceras en el preview local.
- **Fase 2, búsqueda de imágenes real:** hash perceptual **dHash de 64 bits** calculado en el navegador y comparado por distancia de Hamming (umbral 10). La foto **no sale del dispositivo**: solo se envía el hash.
- **Fase 3, directorio compartido:** base **Supabase (Postgres + RLS)**; escrituras mediante funciones RPC `SECURITY DEFINER`; los datos sensibles se guardan como **HMAC con sal secreta** (no en claro). Moderación previa: los reportes entran como pendientes. Hay un directorio inicial de 25 reportes aprobados (datos de semilla).
- **Fase 4, reporte real:** PDF generado en el navegador (jsPDF, carga diferida) y **Web Share API** con respaldo de copiar al portapapeles.
- **Fase 5, honestidad del experimento:** dataset propio de 30 anuncios con importación **CSV/JSON**, separación **calibración / evaluación** para no medir sobre los mismos datos con los que se ajustó, y rotulado explícito de que el dataset es curado e ilustrativo.
- **Fase 6, calidad final:** tests de interfaz, accesibilidad, carga diferida por pantalla (code splitting), Lighthouse.
- **Ampliaciones posteriores:**
  - **OCR de capturas** (tesseract.js autoalojado, corre en el navegador): extrae precio, zona, CBU/alias (con verificación del dígito del CBU) y nombre de una captura.
  - **Índice colaborativo de fotos** (`photo_sightings`): si la misma foto aparece en anuncios distintos de la comunidad, se alerta.
  - **Precios reales:** referencia por zona y **tipo de alojamiento** (habitación / departamento) a partir del *Zonaprop Index*, con un script y una GitHub Action mensual que actualiza `marketPrices.json`.
  - **Índice de confianza aclarado:** la UI dice "Índice del motor, no una probabilidad". El 82 % del PDF original se mantiene como ejemplo ilustrativo; la fórmula no se tocó.
  - **Piloto cerrado:** aviso de "versión piloto", página de condiciones, formulario de feedback y **panel admin oculto** (`/#admin`) con login por email y contraseña (Supabase Auth), autorización verificada **en el servidor** y registro de auditoría; moderación de reportes y **baja de entradas publicadas**.
  - **Acción de mantenimiento** que consulta Supabase dos veces por semana para evitar la pausa por inactividad del plan gratuito.
  - **Rediseño visual "sello / documento"** en dos pasadas (ver sección 6).

### 5. Arquitectura y stack
- **Front:** React 19, Vite 6, Tailwind 4, TypeScript estricto. **Pruebas:** Vitest 3 + Testing Library; **201 tests** en 15 archivos, todos en verde.
- **Clean Architecture:** `domain` (entidades, servicios, puertos; sin React ni navegador, regla de ESLint lo impide), `application` (casos de uso: verificar anuncio, resolver precio de referencia, construir reporte, parsear y correr el experimento), `infrastructure` (adaptadores: Supabase, hasher de imágenes, OCR, PDF, datos) y `presentation` (pantallas y componentes).
- **Backend:** Supabase (Postgres, RLS, RPC, Auth); sin servidor propio. Acceso por `fetch` a PostgREST, sin SDK.
- **Despliegue:** Vercel + GitHub (repo `tpo tec e inno`); CI y dos Actions programadas (precios mensual, keep-alive lunes y jueves).
- **Seguridad:** CSP sin scripts externos, sal del HMAC fuera del repositorio, ningún token en el código, admin autorizado en servidor, aviso de consentimiento corregido para decir "hash (código irreversible)" y no "cifrado".
- **Motor de scoring (resumen):** suma puntos de riesgo por hallazgos (foto duplicada, precio fuera de zona, CBU/identidad reportados, antigüedad de cuenta, cantidad de fotos, etc.) y los traduce a veredicto e índice. Sospechoso: `min(98, max(72, round(64 + riesgo·0,25)))`. Verificado: `min(96, round(78 + (24−riesgo)·0,45 + bono))`. Gris: 62. Sin datos: entre 38 y 58 según completitud.

### 6. Diseño visual (idea rectora)
"**CuartoSeguro emite un documento con un sello.**" Papel crema con grano sutil, tinta oscura, un único acento rojo de sello. Tipografías autoalojadas: Fraunces (títulos), IBM Plex Sans (texto), IBM Plex Mono (etiquetas y datos). El veredicto es un **sello** de borde doble que se estampa al aparecer (respeta `prefers-reduced-motion`). Esquinas casi cuadradas y sombras planas.
- 1.ª pasada: portada pensada para el estudiante (habla de su situación, no de funciones), barra superior con logo de sello, Pantalla 6.
- 2.ª pasada: formulario como **ficha con 4 secciones numeradas**, detalles como **registro numerado de motivos** con gravedad, reporte como **certificado** con el mismo sello.
- Motivo del rediseño: el usuario lo consideró "muy estándar"; se buscó una identidad propia y coherente con el entregable (el reporte).

### 7. Resultados medidos (reportar tal cual)
- **Accesibilidad:** axe-core, **0 violaciones** en las 14 vistas (verificado en local con la misma build; en producción la CSP impide inyectar axe).
- **Móvil:** sin desborde horizontal a 375 px en las pantallas revisadas.
- **Lighthouse móvil (home, producción, 3 corridas tras el primer rediseño):** Performance **98 / 97 / 97**, Accesibilidad 100, Buenas prácticas 100, SEO 100. FCP 1,5–1,8 s; LCP 2,0–2,5 s; TBT 20–40 ms; CLS ≤ 0,014. No se volvió a medir tras la segunda pasada: marcarlo como "[completar si se re-mide]".
- **Pruebas:** 201 tests en verde; CI en verde en los commits anteriores (el último commit, de la segunda pasada, no se pudo confirmar desde la herramienta local: revisar en GitHub Actions antes de afirmarlo).
- **Experimento de 30 anuncios:** existe el laboratorio y el mecanismo calibración/evaluación; **las cifras de precisión del dataset actual no son evidencia de desempeño real** (ver sección 9). No inventar métricas: si se quiere un número, correr el laboratorio y citarlo con su rótulo.

### 8. Enlaces y artefactos
- App: https://tpo-tec-e-inno.vercel.app/ (el panel admin existe pero no se difunde ni se enlaza desde la interfaz).
- Repositorio en GitHub: `tpo tec e inno` (rama `main`).
- Documentación en `docs/00` a `docs/10` (visión, decisiones, arquitectura, motor, experimento, calidad y seguridad, directorio Supabase, prompt de continuación, piloto y admin, diseño visual) y ejemplos de dataset en `docs/ejemplos/`.

### 9. Salvedades obligatorias (incluirlas en el informe y en una diapositiva)
1. Las bases de fotos y de CBU/alias son **acotadas**: un resultado "Verificado" **no garantiza** que el anuncio sea real; significa que no se encontraron alertas.
2. El **índice de confianza** es un índice del motor, **no una probabilidad calibrada**.
3. El dataset de 30 anuncios es **curado e ilustrativo**: no demuestra desempeño sobre anuncios reales. Para una validación real hacen falta anuncios reales etiquetados.
4. La lectura de capturas (OCR) **no fue probada con capturas reales de portales** a escala; hoy está probada con casos controlados.
5. El **precio de referencia** viene de un índice público de departamentos; para **habitaciones** no hay referencia propia todavía (decisión pendiente: API de un portal o medianas de la comunidad).
6. Es un **piloto cerrado**, con las condiciones publicadas. Falta una **revisión legal** del tratamiento de datos (Ley 25.326 / AAIP).
7. No hay aún canal de **soporte humano** definido, ni login para reportar, ni límite de reportes por IP (hay que agregarlo con una Edge Function).
8. La contraseña inicial del admin es débil y debe cambiarse antes de difundir el piloto.

### 10. Trabajo futuro (priorizado)
Probar el OCR con capturas reales; definir referencia de precios para habitaciones; ampliar el índice de fotos con más fuentes; login y límite de reportes; revisión legal; validar con 30 anuncios reales del grupo; canal de soporte humano; bot de WhatsApp (más adelante).

### 11. Estructura pedida
**(A) Informe** (8 a 12 páginas): 1) Resumen ejecutivo (media página); 2) Problema y objetivo; 3) Solución y flujo de usuario; 4) Arquitectura y decisiones técnicas (con un diagrama de capas); 5) Motor de verificación; 6) Privacidad y seguridad; 7) Diseño; 8) Verificación y resultados; 9) Limitaciones y riesgos; 10) Trabajo futuro; 11) Conclusiones; Anexo: tabla de fases y de tecnologías.

**(B) Presentación** (12 a 15 diapositivas, una idea por diapositiva, poco texto, frase-título que afirme algo): 1 Portada · 2 El problema · 3 La propuesta (foto, precio, quién cobra) · 4 Demo del flujo en 8 pantallas (capturas) · 5 El veredicto como sello · 6 Cómo decide el motor · 7 Privacidad: la foto no sale del dispositivo y los datos van con hash · 8 Arquitectura en capas · 9 Directorio colaborativo y panel de moderación · 10 Calidad: tests, CI, accesibilidad, Lighthouse · 11 Diseño "sello / documento" · 12 Qué NO hace todavía (salvedades) · 13 Próximos pasos · 14 Conclusiones y preguntas. Agregá notas del orador de 2 a 4 oraciones por diapositiva.

Tono: técnico pero claro para un jurado académico; cada afirmación de desempeño debe poder rastrearse a la sección 7; ante la duda, preferí decir menos.
