# 01 — Decisiones de Producto, UX y Alcance del MVP

**Estado:** Aprobado  
**Contexto:** Entregables 1 (Ideas), 2 (Mapa de Oportunidad Tecnológica) y 3 (Design Thinking y Customer Journey)  

---

## 1. Fundamentación en Evidencia (Los 3 Hallazgos)

El diseño funcional de **CuartoSeguro** no parte de supuestos arbitrarios, sino de tres hallazgos empíricos relevados durante la etapa de Design Thinking:

### Hallazgo 1: El estudiante ya intenta verificar, pero de forma artesanal y caótica
- **Observación:** Antes de transferir una seña, el estudiante busca el nombre en Google, pide una videollamada o compara fotos a ojo. No tiene protocolo ni herramientas integradas.
- **Decisión de Producto (DP-01):** No obligar al estudiante a aprender una metodología compleja; **sistematizar en un único flujo guiado** todas las verificaciones que hoy intenta hacer a mano (fotos, precio, teléfono, CBU/alias y reportes previos).

### Hallazgo 2: La decisión de transferir la seña ocurre en una ventana de minutos
- **Observación:** Los estafadores ejercen presión psicológica de urgencia (*"hay tres interesados más, si me transferís la seña ahora te lo reservo"*). La decisión ocurre dentro de la misma conversación de WhatsApp o Marketplace.
- **Decisión de Producto (DP-02):** El tiempo de respuesta del sistema debe ser **inmediato (< 2 minutos en total, idealmente segundos en el MVP interactivo)**, mostrando el avance paso a paso en pantalla para reducir la ansiedad y evitando procesos asincrónicos de días (como trámites registrales manuales o visitas presenciales diferidas).

### Hallazgo 3: Las fotos robadas y los precios anzuelo son patrones repetidos
- **Observación:** Los avisos fraudulentos reutilizan fotografías de departamentos reales publicados en otros portales/ciudades (Airbnb, Zonaprop, Booking) y fijan alquileres entre un **30% y 55% por debajo del promedio de la zona** para atraer víctimas rápidas.
- **Decisión de Producto (DP-03):** Construir una base comparativa de anuncios, hashes de imágenes, promedios estadísticos por zona universitaria y reportes cruzados entre estudiantes, lo que permite detectar el fraude **incluso cuando los registros públicos oficiales son incompletos o dispares según la provincia**.

---

## 2. Decisión de Priorización: Por qué combinamos las Alternativas 1, 6 y 11

En el Entregable 3 se evaluaron **14 alternativas** bajo 4 criterios (Deseabilidad, Factibilidad, Viabilidad y Diferenciación, escala 1 a 5, máximo 20 puntos):

| # | Alternativa | Deseabilidad | Factibilidad | Viabilidad | Diferenciación | Total | Decisión en el MVP |
| :-: | :--- | :-: | :-: | :-: | :-: | :-: | :--- |
| **6** | **Bot / Sistema de reportes cruzados** | 5 | 4 | 5 | 4 | **18** | **Incluido en MVP (Core)** |
| **1** | **Motor de verificación automática (fotos, precio, identidad)** | 5 | 3 | 5 | 4 | **17** | **Incluido en MVP (Core)** |
| **11** | **Directorio colaborativo de CBU o alias fraudulentos** | 5 | 4 | 3 | 4 | **16** | **Incluido en MVP (Core)** |
| 7 | Sistema de reputación entre estudiantes | 4 | 4 | 4 | 3 | 15 | Integrado parcialmente en reportes |
| 14 | Verificación catastral automática | 4 | 2 | 4 | 5 | 15 | Postergado a Fase 2 (requiere convenios provinciales) |
| 2 | Red de verificación en persona | 4 | 3 | 3 | 3 | 13 | Postergado (no resuelve la ventana de minutos) |
| 5 | Checklist descargable | 3 | 5 | 4 | 1 | 13 | Absorbido dentro del reporte descargable |
| 9 | Alianza con la universidad | 4 | 2 | 3 | 4 | 13 | Canal de distribución (B2B2C: gratis para estudiantes) |
| 10 | Seguro contra estafa de seña | 3 | 3 | 3 | 4 | 13 | Descartado en MVP por costo actuarial y riesgo moral |
| 8 | Video-verificación en vivo | 3 | 2 | 2 | 4 | 11 | Descartado en MVP por fricción operativa |
| 3 | Escrow notarial | 3 | 2 | 2 | 3 | 10 | Descartado por alta fricción legal y costo |

### Justificación de la Combinación Ganadora (1 + 6 + 11)
1. **Cobertura Técnica + Comunitaria:** El motor automático (1) detecta anomalías objetivas (foto reutilizada en otro aviso, precio irreal para la zona, cuenta nueva sin historial), mientras que el cruce de reportes (6) y el directorio de CBU/alias (11) capturan el aprendizaje colectivo de la comunidad estudiantil en tiempo real.
2. **Mitigación del Riesgo Principal (Mapa Tecnológico):** El Mapa de Oportunidad Tecnológica identificó como riesgo principal la *"calidad dispar de los registros públicos según la ciudad"*. Al complementar la validación de identidad con **Data Mining de fotos/anuncios, BI de precios zonales y directorio colaborativo de CBU/alias**, el sistema sigue siendo altamente efectivo aunque una provincia no tenga API catastral abierta.
3. **Modelo de Adopción ("Gratis para estudiantes"):** La aplicación no le cobra al estudiante en su momento de vulnerabilidad; plantea un esquema institucional (convenios con universidades, centros de estudiantes y portales) y ofrece un **reporte PDF/imprimible** pensado para compartir con la familia (quienes suelen transferir el dinero de la seña).

---

## 3. Especificación de las 8 Pantallas del Prototipo Funcional

El software desarrollado en este repositorio implementa fielmente las **8 pantallas** definidas en el entregable de Design Thinking y UX, además de agregar vistas de consulta del **Directorio CBU/Reportes** y del **Experimento de 30 Anuncios Reales**:

### Pantalla 1: Inicio
- **Título:** *"Verificá un alquiler antes de pagar."*
- **Elementos clave:**
  - Botón primario: **"Nueva verificación"**.
  - Botón secundario: **"Ver verificaciones anteriores"** (historial persistido localmente con verificaciones precargadas y nuevas).
  - Aviso destacado: **"Gratis para estudiantes"** (aclarando que la app no cobra al usuario final).
  - Acceso rápido a casos de ejemplo y al laboratorio de los 30 anuncios del experimento.

### Pantalla 2: Instrucciones
- **Título:** *"Antes de pegar el link."*
- **Indicaciones claras:**
  1. Copiar el link del anuncio (*Zonaprop, Argenprop, Facebook Marketplace, MercadoLibre o grupo de la facultad*).
  2. Si no hay link público, se puede cargar una captura de pantalla del anuncio o completar los datos clave.
  3. **Aclaración ética y preventiva:** *"La verificación no reemplaza ver la propiedad en persona."*
- **Acciones:** Botón **"Entendido"** (avanza a Pantalla 3) y botón **"Ver ejemplo"** (carga un caso real preconfigurado para probar el flujo en un clic).

### Pantalla 3: Carga del anuncio
- **Título:** *"Pegá el link o la captura."*
- **Campos del formulario:**
  - Campo para pegar el link del anuncio o adjuntar captura de pantalla (con simulación de extracción OCR/metadatos o selección de ejemplos reales).
  - Selección de **Ciudad y zona universitaria** del alquiler (ej. CABA - Palermo, Recoleta, Balvanera, Caballito, Belgrano; Córdoba - Nueva Córdoba; La Plata - Centro; Rosario - Centro).
  - **Precio mensual publicado** y **Monto de la seña solicitada** (en ARS).
  - **Datos del propietario / anunciante** (Nombre completo o inmobiliaria, teléfono/WhatsApp, CBU/CVU o Alias bancario, antigüedad percibida del perfil, cantidad de fotos).
  - **Casilla obligatoria:** *"Confirmo autorización para procesar los datos públicos del anuncio con fines de verificación preventiva."*

### Pantalla 4: Control de calidad de los datos (Data Quality Gate)
- **Título:** *"Revisando lo que enviaste."*
- **Chequeos automáticos:**
  - `Link o captura`: Legible / No legible.
  - `Datos de contacto del propietario`: Disponibles / Faltantes.
  - `Fotos del anuncio`: Suficientes para comparar / Insuficientes.
- **Regla de negocio bloqueante:** Si faltan los datos de contacto del propietario, el sistema muestra la alerta exacta especificada en el diseño UX:
  > *"No podemos verificar este anuncio sin datos de contacto del propietario. Pedile el nombre completo o el teléfono antes de continuar."*
  Permitiendo editar los datos o aún así emitir un veredicto de `"Sin datos suficientes"`.

### Pantalla 5: Procesamiento transparente
- **Título:** *"Estamos verificando este anuncio."*
- **Mensaje:** *"Puede demorar hasta 2 minutos. El progreso se muestra en pantalla en vez de dejar la espera en silencio."*
- **Pasos animados e informativos en tiempo real:**
  - **Paso 1 de 3:** Comparando fotos con otros anuncios (búsqueda inversa de imagen y detección de duplicados).
  - **Paso 2 de 3:** Revisando el precio contra el promedio de la zona (análisis BI de desvío de precio y seña).
  - **Paso 3 de 3:** Cruzando la identidad del propietario, reportes comunitarios y directorio de CBU/alias.

### Pantalla 6: Resultado (Veredicto)
- **Título:** *"Veredicto de la verificación."*
- **Contenido principal:**
  - **Veredicto:** `Anuncio sospechoso` (Rojo) | `Verificado` (Verde) | `Sin datos suficientes` (Ámbar).
  - **Nivel de confianza:** Porcentaje calculado por el motor (ej. `82%`).
  - **Motivo principal destacado:** Ej. *"Esta foto aparece en otro anuncio con un precio distinto"* o *"El CBU/Alias informado registra denuncias previas de estafa"*.
  - Acciones: Botón **"Ver detalles"** (va a Pantalla 7) y acceso directo a **"Ver reporte descargable"** (Pantalla 8).

### Pantalla 7: Detalles y Acción Comunitaria
- **Título:** *"Por qué marcamos este anuncio."*
- **Funcionalidades:**
  - Desglose explicativo de **cada motivo de alerta o validación por separado** (Imagen, Precio vs. Promedio de Zona con gráfico comparativo BI, Identidad/Antigüedad, Directorio CBU/Alias y Reportes cruzados).
  - **Reportar el anuncio como estafa confirmada** (agrega el CBU/Alias/Link al directorio colaborativo en vivo).
  - **Pedir una segunda verificación** si el estudiante consigue más información del propietario (vuelve a la edición conservando el contexto).
  - **Contactar soporte humano ante dudas** (modal interactivo de asistencia con especialistas/centro de estudiantes).

### Pantalla 8: Reporte Final y Descarga / Compartir
- **Título:** *"Resumen de la verificación."*
- **Contenido estructurado para decisores (el estudiante y su familia):**
  - Fecha, hora, ID de verificación y anuncio verificado (link o captura).
  - Veredicto final y nivel de confianza (%).
  - Lista completa de motivos detectados y comparación de precios de la zona.
  - **Recomendación clara:** `No transferir`, `Transferir con recaudos habituales` o `Pedir más información antes de señar`.
- **Acciones:** **Descargar PDF / Imprimir reporte** (con hoja de estilos `@media print` dedicada y exportación limpia) y **Compartir resumen** (copia formateada para WhatsApp / enlace familiar).
