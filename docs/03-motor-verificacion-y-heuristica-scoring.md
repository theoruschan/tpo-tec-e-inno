# 03 — Motor de Verificación y Heurística de Scoring (ADR-003)

**Estado:** Aprobado  
**Contexto:** Entregable 2 (*Mapa de Oportunidad Tecnológica: "Data mining [búsqueda inversa de imágenes y anuncios duplicados] más BI [precio vs. promedio de zona]; no requiere IA compleja en el primer MVP"*) y Entregable 3 (*Customer Journey y Prototipo de 8 Pantallas*).

---

## 1. Principio de Diseño: IA / Heurística Explicable (White-Box Scoring)

El **Mapa de Oportunidad Tecnológica** establece explícitamente:
> *"La capacidad elegida es data mining más BI: no hace falta inteligencia artificial compleja para esta primera versión."*

Además, la **Pantalla 6** y la **Pantalla 7** del prototipo exigen mostrar:
- Un **Veredicto claro**: `Anuncio sospechoso` | `Verificado` | `Sin datos suficientes`.
- Un **Nivel de confianza** expresado en porcentaje (el `82%` del prototipo es una cifra ilustrativa; ver sección 4).
- Un **Motivo principal** legible por humanos (ej. *"Esta foto aparece en otro anuncio con un precio distinto"*).
- El **desglose individual** de cada alerta en la pantalla de detalles.

Por lo tanto, diseñamos un **Motor de Scoring Heurístico y Estadístico Explicable** dividido en un **Control de Calidad Previo (Paso 0)** y **Tres Pilares de Verificación (Pasos 1, 2 y 3)**.

---

## 2. Paso 0: Control Automático de Calidad de los Datos (Data Quality Gate)

Corresponde a la **Pantalla 4 ("Revisando lo que enviaste")**. Antes de emitir un juicio sobre la veracidad del aviso, el motor evalúa tres dimensiones de completitud:

1. **Link o captura legible (`isLinkOrCaptureValid`):**
   - Verifica que exista una URL válida de portal/red social (`zonaprop`, `argenprop`, `mercadolibre`, `facebook`, `instagram`, etc.) o una captura/descripción con longitud suficiente.
2. **Datos de contacto del propietario disponibles (`hasContactInfo`):**
   - Verifica que el estudiante haya provisto al menos un identificador trazable del locador o inmobiliaria: **Nombre completo / Razón social**, **Teléfono / WhatsApp** o **CBU / CVU / Alias bancario**.
   - **Regla bloqueante del prototipo:** Si no hay ningún dato de contacto/identidad, el sistema emite el mensaje exacto requerido:
     > *"No podemos verificar este anuncio sin datos de contacto del propietario. Pedile el nombre completo o el teléfono antes de continuar."*
3. **Fotos del anuncio suficientes para comparar (`hasSufficientPhotos`):**
   - Evalúa si el anuncio cuenta con al menos 2 fotografías o un hash/identificador de imagen para ejecutar la búsqueda inversa.

Si el usuario fuerza la evaluación sin datos mínimos, el veredicto resultante es **`Sin datos suficientes`**, recomendando **"Pedir más información"** antes de transferir dinero.

---

### Lectura automática de la captura (OCR)

Para no obligar al estudiante a tipear todo en la ventana de minutos (Hallazgo 2), la Pantalla 3 lee el texto de la captura que sube y propone completar el formulario.

- **Dónde corre:** en el navegador, con tesseract.js 6.0.1 (WebAssembly en un Web Worker) y el modelo de español `best_int` (~2 MB). Los archivos se sirven desde el propio sitio (`/ocr/tesseract-6.0.1/`, copiados por `scripts/copy-ocr-assets.mjs`): **la captura no sale del dispositivo** y no se llama a ningún servicio externo. Se descargan solo la primera vez que alguien sube una captura.
- **Arquitectura:** puerto `ImageTextReader` (dominio) → adaptador `TesseractImageTextReader` (infraestructura). El texto lo interpreta `ListingTextExtractor` (dominio puro, testeado): alquiler y seña según la palabra clave más cercana (ignora expensas y montos en dólares), CBU/CVU de 22 dígitos con **verificación de los dígitos de control del BCRA**, alias, teléfono (incluye links `wa.me`), nombre después de "titular/a nombre de/dueño", link del aviso, zona por palabras clave y frases de "seña antes de ver la propiedad".
- **El estudiante decide:** se muestran los datos detectados y solo se cargan al tocar "Completar el formulario con estos datos" (con "Deshacer"). La antigüedad de la cuenta y la cantidad de fotos no se pueden leer de una captura.
- **CSP:** requiere `'wasm-unsafe-eval'` (compilar WebAssembly; no habilita `eval` de JavaScript) y `data:` en `connect-src` (el motor carga su WebAssembly embebido desde un `data:` URL; no sale a la red).
- **Medido (27/10/2026):** sobre capturas sintéticas de chat y de aviso, la lectura tarda ~2 s y extrajo correctamente alquiler, seña, alias/CBU, teléfono, nombre, zona y el pedido de seña antes de ver. Una foto sin texto devuelve "No encontramos datos claros". **No está medido sobre capturas reales** de WhatsApp/Marketplace (fondos de color, emojis, texto chico): es lo próximo a validar.

## 3. Los 3 Pasos del Motor de Verificación (Pantalla 5)

### Paso 1 de 3: Data Mining de Imágenes y Anuncios Duplicados (`ImageMiningService`)
Simula y ejecuta la búsqueda inversa de fotografías y el cruce de texto/URL contra una base de anuncios indexados:

- **Coincidencia exacta de imagen en otro anuncio con distinto precio o ciudad (`DUPLICATE_PHOTO_DIFFERENT_LISTING`):**
  - *Impacto en riesgo:* **+45 puntos de riesgo** (Alerta Crítica).
  - *Motivo generado:* `"Esta foto aparece en otro anuncio con un precio distinto o en otra plataforma (ej. alquiler temporario / Airbnb / otro barrio)."`
- **Imagen de catálogo genérico o stock inmobiliario (`STOCK_OR_REUSED_PHOTO`):**
  - *Impacto en riesgo:* **+25 puntos de riesgo** (Alerta Media).
- **Escasez extrema de fotos (1 sola foto en un pedido de seña inmediata):**
  - *Impacto en riesgo:* **+15 puntos de riesgo**.
- **Fotos consistentes y sin duplicados sospechosos detectados:**
  - *Impacto en confianza positiva:* Evidencia de autenticidad visual.

#### Implementación real de la búsqueda inversa (huella perceptual dHash)

> **Alcance honesto:** la comparación se hace contra una **base semilla de 5 fotos conocidas** (`KNOWN_IMAGE_SIGNATURES` en `src/infrastructure/data/datasets.ts`). **No es una búsqueda en toda la web** ni en los portales en vivo; solo detecta la reutilización de fotos que ya están en esa base. La UI de la Pantalla 3 lo aclara junto al resultado.

- **Cálculo (en el navegador, la foto no sale del dispositivo):** `BrowserImageHasher` (infraestructura, implementa el puerto `ImageHasher` del dominio) decodifica la imagen con `createImageBitmap`, la dibuja en un canvas de 144×128, promedia bloques de 16×16 hasta una grilla 9×8 de luminancia y `computeDHashFromGrayscale` (dominio puro) genera 64 bits: cada bit indica si un bloque es más claro que su vecino derecho.
- **Comparación:** `hammingDistance` cuenta los bits distintos; `findClosestPerceptualMatch` devuelve la firma más cercana con distancia `≤ DEFAULT_DHASH_MATCH_THRESHOLD = 10` (configurable por constructor en `ImageMiningService`). La evidencia del hallazgo muestra la distancia, p. ej. `Distancia de Hamming: 3/64 (umbral ≤ 10)`.
- **Calibración del umbral (medido el 27/10/2026 sobre las 5 fotos semilla):** la misma foto recomprimida a 240 px / calidad 35 quedó a distancia **0–2**; fotos distintas entre sí, a **18–37**. El umbral 10 queda en el medio con margen para ambos lados.
- **Límites conocidos:** una captura de pantalla completa (con texto, botones y bordes alrededor de la foto) cambia la composición y puede no coincidir; conviene subir la foto o un recorte. Recortes fuertes, espejados o rotaciones tampoco se detectan con dHash. Dos fotos distintas con la misma composición dominante (p. ej. un gradiente de luz fuerte) pueden quedar más cerca de lo esperable.
- **Modo manual/demo:** el selector de firma conocida sigue disponible en el panel "Avanzado / demo" de la Pantalla 3; si se sube una foto, la huella automática tiene prioridad.
- **Tests:** `tests/perceptualHash.test.ts` usa fotos sintéticas generadas por código (PRNG con semilla, sin imágenes con derechos) para validar distancia de Hamming, tolerancia a brillo/ruido/redimensionado, umbral inclusivo y prioridad automática sobre manual.

---

### Paso 2 de 3: Business Intelligence (BI) de Precios por Zona (`ZonePriceBiService`)
Compara el alquiler mensual publicado ($P_{\text{anuncio}}$) y la seña solicitada ($S_{\text{anuncio}}$) contra las métricas históricas de la zona universitaria seleccionada ($\mu_{\text{zona}}$, $\sigma_{\text{zona}}$, rango intercuartil):

$$\text{Desvío Porcentual} = \frac{P_{\text{anuncio}} - \mu_{\text{zona}}}{\mu_{\text{zona}}} \times 100$$

$$\text{Ratio de Seña} = \frac{S_{\text{anuncio}}}{P_{\text{anuncio}}} \times 100$$

- **Precio "Demasiado bueno para ser real" ($\text{Desvío} \le -35\%$ respecto al promedio zonal):**
  - *Impacto en riesgo:* **+35 puntos de riesgo** (Alerta Crítica).
  - *Motivo generado:* `"El precio publicado está un X% por debajo del promedio de la zona, un patrón clásico de aviso anzuelo para captar señas rápidas."`
- **Precio moderadamente bajo ($-35\% < \text{Desvío} \le -22\%$):**
  - *Impacto en riesgo:* **+18 puntos de riesgo** (Alerta Preventiva).
- **Seña desproporcionada o exigida sin visita previa ($\text{Ratio de Seña} > 50\%$ del mes o presión de urgencia extrema):**
  - *Impacto en riesgo:* **+15 puntos de riesgo**.
- **Precio dentro de la banda normal de mercado ($|\text{Desvío}| < 22\%$):**
  - *Resultado BI:* Consistente con valores de mercado para estudiantes en esa zona universitaria.

---

#### Precio de referencia: de dónde sale (actualizado 27/10/2026)

El estudiante elige el **tipo de alojamiento** en la Pantalla 3, porque una habitación y un departamento entero no se pueden comparar contra el mismo precio:

| Tipo | Referencia | Real o estimada |
| :--- | :--- | :--- |
| Habitación (depto compartido, casa o residencia) | Valor por zona del dataset semilla | **Estimación del equipo.** No existe un índice público de precios de habitaciones; la UI lo dice. |
| Monoambiente | Zonaprop Index: CABA (sep 2026, $779.370) | **Real** (precio medio de oferta publicado). Córdoba, La Plata y Rosario: sin índice → no se compara. |
| 2 ambientes / 1 dormitorio | Zonaprop Index: CABA (sep 2026, $898.154), Córdoba (mar 2026, $619.061), GBA Sur como proxy de La Plata (sep 2026, $643.213) | **Real**, con las salvedades de abajo. Rosario: sin índice → no se compara. |

- **Salvedades:** son precios de **oferta** (avisos publicados), no de contratos firmados. Son el promedio de **toda la ciudad** (o de toda GBA Sur para La Plata), no del barrio; los motivos lo dicen ("…del promedio de CABA"). El índice no publica dispersión: la banda ±25 % y la desviación (15 %) son supuestos nuestros. El último reporte de Córdoba es de marzo 2026; si el dato tiene 4 meses o más, la app avisa que los precios actuales probablemente sean más altos.
- **Sin índice:** el hallazgo `bi-price-no-benchmark` (informativo, 0 puntos de riesgo) explica que el precio no se comparó; el resto de los chequeos (seña antes de visitar, fotos, directorio) sigue funcionando.
- **Datos y actualización:** `src/infrastructure/data/marketPrices.json` (fuente, período, URL del PDF y precios). `scripts/update_market_prices.py` busca reportes más nuevos, lee el PDF con pypdf y actualiza el JSON; la GitHub Action `update-market-prices.yml` lo corre el día 20 de cada mes (o a mano desde la pestaña Actions), valida con `tests/marketPrices.test.ts` y commitea. Si un PDF nuevo cambia de formato y no se puede leer, la Action falla en vez de guardar datos rotos.
- **Implementación:** `resolvePriceBenchmark` (aplicación) elige la referencia según tipo y ciudad; `ZonePriceBiService` (dominio) no cambió su lógica de umbrales.

### Paso 3 de 3: Identidad, Reportes Cruzados y Directorio de CBU/Alias (`IdentityCbuMatcher`)
Implementa la combinación de las **Alternativas 1, 6 y 11** de la Matriz de Priorización:

1. **Cruce contra el Directorio Colaborativo de CBU / CVU / Alias Fraudulentos (Alternativa 11):**
   - Normaliza el CBU (22 dígitos) o Alias ingresado y lo busca en la base colaborativa de cuentas denunciadas.
   - Si existe coincidencia (`CBU_BLACKLISTED`): **+60 puntos de riesgo** (Alerta Crítica determinante).
2. **Bot de Reportes Cruzados por Teléfono / Link / Anuncio (Alternativa 6):**
   - Verifica si el teléfono de contacto o la URL del anuncio acumula reportes previos de otros estudiantes en grupos de facultad o ciudades universitarias.
   - Si registra reportes previos (`CROSS_REPORTED_CONTACT`): **+45 puntos de riesgo**.
3. **Verificación de Identidad y Antigüedad de Cuenta / Registros Públicos (Alternativa 1):**
   - Cruza el nombre del propietario o matrícula de inmobiliaria (ej. CUCICBA / CPCPI / Colegio de Martilleros) y evalúa señales de cuenta recién creada sin historial o discrepancia entre el nombre del titular del CBU y el supuesto locador (`IDENTITY_MISMATCH` o `NEW_UNVERIFIED_ACCOUNT`): **+20 a +30 puntos de riesgo**.
   - Si pertenece a una inmobiliaria matriculada o titular verificado con coincidencia bancaria: reduce el riesgo y eleva la confianza del veredicto.

---

## 4. Cálculo del Veredicto, Nivel de Confianza y Recomendación

El motor acumula un `riskScore` acotado en $[0, 100]$ y un indicador de completitud de datos `completenessScore` en $[0, 100]$:

| Condición | Veredicto (`verdict`) | Nivel de Confianza (`confidenceLevel`) | Recomendación (`recommendation`) |
| :--- | :--- | :--- | :--- |
| Faltan datos esenciales (sin contacto o sin link/captura legible) y no hay alerta crítica | **`Sin datos suficientes`** | $\max(38\%, \min(58\%, \text{completenessScore}))$ | **Pedir más información** |
| `riskScore >= 40` o al menos 1 Alerta Crítica (Foto robada, CBU denunciado o Precio anzuelo extremo) | **`Anuncio sospechoso`** | $\min(98\%, \max(72\%, \text{round}(64 + \text{riskScore} \times 0.25)))$ → entre **72 %** y **89 %** (con `riskScore` acotado a 100) | **No transferir** |
| `24 <= riskScore < 40` sin alerta crítica, o fotos insuficientes (señales grises sin evidencia concluyente) | **`Sin datos suficientes`** | $62\%$ (fijo) | **Pedir más información** |
| `riskScore < 24` y datos de contacto/fotos completos | **`Verificado`** | $\min(96\%, \text{round}(78 + (24 - \text{riskScore}) \times 0.45 + \text{bono}))$, con bono de $8$ si declaró matrícula | **Transferir (con recaudos habituales)** |

> **Sobre el 82 % del Prototipo (Pantalla 6):** el prototipo de baja fidelidad del Entregable 3 muestra "Nivel de confianza: 82%" como **cifra de ejemplo de un mockup**, no como resultado de una fórmula. El caso prototipo implementado (foto duplicada + precio 45 % bajo + cuenta nueva + seña sin visita) suma un `riskScore` de 115, que se acota a 100, y da **89 %**. Se decidió (28/10/2026) **no retocar los coeficientes para clavar el 82 %**: el veredicto, el motivo principal (*"Esta foto aparece en otro anuncio con un precio distinto"*) y la recomendación sí coinciden con el prototipo; el número no.
>
> **Qué es y qué no es este porcentaje:** es un **índice del motor**, no una probabilidad calibrada de que el anuncio sea fraude (no se calibró contra casos reales independientes; ver docs/04). Además **se satura**: todo caso con `riskScore` ≥ 100 da el mismo 89 % (los 14 casos sospechosos del dataset curado dan exactamente 89 %), así que no distingue una alerta muy fuerte de una apenas por encima del umbral. La pantalla de resultado y el reporte lo aclaran. Mejora pendiente si hace falta discriminar: una fórmula que dependa de cuántas señales independientes coinciden (foto, precio, identidad, directorio) en vez de un puntaje acotado.
