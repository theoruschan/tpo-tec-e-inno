# 03 — Motor de Verificación y Heurística de Scoring (ADR-003)

**Estado:** Aprobado  
**Contexto:** Entregable 2 (*Mapa de Oportunidad Tecnológica: "Data mining [búsqueda inversa de imágenes y anuncios duplicados] más BI [precio vs. promedio de zona]; no requiere IA compleja en el primer MVP"*) y Entregable 3 (*Customer Journey y Prototipo de 8 Pantallas*).

---

## 1. Principio de Diseño: IA / Heurística Explicable (White-Box Scoring)

El **Mapa de Oportunidad Tecnológica** establece explícitamente:
> *"La capacidad elegida es data mining más BI: no hace falta inteligencia artificial compleja para esta primera versión."*

Además, la **Pantalla 6** y la **Pantalla 7** del prototipo exigen mostrar:
- Un **Veredicto claro**: `Anuncio sospechoso` | `Verificado` | `Sin datos suficientes`.
- Un **Nivel de confianza** expresado en porcentaje (ej. `82%`).
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
| Faltan datos esenciales (sin contacto o sin precio/imagen legible) | **`Sin datos suficientes`** | $35\% - 55\%$ (según datos presentes) | **Pedir más información** |
| `riskScore >= 40` o al menos 1 Alerta Crítica (Foto robada, CBU denunciado o Precio anzuelo extremo) | **`Anuncio sospechoso`** | $\min(98\%, 65\% + \lfloor \text{riskScore} \times 0.32 \rfloor)$ (ej. **82%** en caso típico de foto duplicada + precio bajo) | **No transferir** |
| `25 <= riskScore < 40` (señales grises sin evidencia concluyente) | **`Sin datos suficientes`** | $55\% - 68\%$ | **Pedir más información** |
| `riskScore < 25` y datos de contacto/fotos completos | **`Verificado`** | $\min(96\%, 78\% + \text{bono de validación registral})$ | **Transferir (con recaudos habituales)** |

> **Nota sobre el ejemplo del Prototipo (Pantalla 6):** Cuando un anuncio presenta una foto duplicada en otro aviso con distinto precio y un desvío de precio bajo el promedio zonal, la fórmula arroja exactamente un veredicto de **`Anuncio sospechoso`** con un nivel de confianza en el entorno del **`82%`** y el motivo principal: *"Esta foto aparece en otro anuncio con un precio distinto"*, respetando literalmente la especificación del Entregable 3.
