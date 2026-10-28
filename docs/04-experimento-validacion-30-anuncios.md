# 04 — Experimento de Validación con 30 Anuncios Reales (ADR-004)

**Estado:** Implementado · Dataset curado (ilustrativo) · Validación independiente pendiente  
**Contexto:** Entregable 2 (*Mapa de Oportunidad Tecnológica — Punto 6: Experimento y Métrica*)

---

## 1. Definición del Experimento en el Mapa de Oportunidad Tecnológica

El **Mapa de Oportunidad Tecnológica** de *CuartoSeguro* definió como primer experimento de validación empírica:

> **6. EXPERIMENTO Y MÉTRICA:**  
> *"Verificar manualmente 30 anuncios reales de una ciudad universitaria y comparar contra lo que realmente pasó. Métrica: % de anuncios truchos detectados correctamente."*
>
> **Guion del Pitch:**  
> *"El riesgo es que la calidad de los registros públicos varía mucho según la ciudad. Por eso el primer experimento verifica treinta anuncios reales y compara el resultado contra lo que efectivamente pasó."*

---

## ⚠️ Alcance real de estos números (leer primero)

- **Los 30 casos del repo son un dataset curado e ilustrativo**, armado por el equipo para representar los patrones descriptos en los entregables. No son 30 anuncios relevados uno por uno con su desenlace documentado.
- **Las reglas y umbrales del motor se calibraron mirando esos mismos 30 casos.** Por eso el **100% de recall (14/14)** mide si el motor reproduce lo que ya sabíamos, **no es una validación independiente** y no se puede presentar como tasa de detección esperada en anuncios nuevos.
- La app separa los casos en **calibración** y **evaluación** y muestra ambas métricas por separado. En el dataset curado esa separación es solo ilustrativa: las reglas se ajustaron sobre el total, así que la parte de evaluación tampoco es "nunca vista".
- **Para una validación real:** relevar 30 anuncios reales que el motor no haya visto, anotar qué pasó con cada uno, cargarlos con el formato de la sección 5 y reportar la fila **Evaluación** con conteos (ej. "9/10 estafas detectadas"), no solo porcentajes. Con N chico, un error mueve ~10 puntos.

---

## 2. Decisión de Ingeniería (ADR-004): Laboratorio de Benchmarking Integrado

En lugar de dejar el experimento únicamente como un cálculo estático en papel, decidimos **incorporar el dataset de los 30 anuncios reales y el motor de evaluación estadística directamente dentro de la aplicación y su suite de tests automatizados (`RunExperimentBenchmarkUseCase`)**.

### Composición de la Muestra ($N = 30$ anuncios de ciudades universitarias)
La muestra modela escenarios reales de inicios de cuatrimestre en **CABA (Palermo, Recoleta, Balvanera, Caballito, Belgrano, Monserrat)**, **Córdoba (Nueva Córdoba)**, **La Plata (Centro / Plaza Paso)** y **Rosario (Centro / Pichincha)**:

- **14 Anuncios Fraudulentos Confirmados (`groundTruth: 'FRAUD'`):**
  - *Patrón A (Fotos robadas de Airbnb/Zonaprop + precio anzuelo):* Anuncios publicados en Marketplace o grupos estudiantiles con fotografías extraídas de avisos reales a mitad de precio.
  - *Patrón B (CBU/Alias con denuncias previas y presión de urgencia):* Supuestos dueños particulares que exigen transferencia inmediata a billeteras virtuales cuyos alias ya fueron reportados por otros estudiantes.
  - *Patrón C (Identidad inconsistente / cuenta recién creada en provincia con registros públicos limitados):* Casos donde no hay matrícula inmobiliaria pero el motor detecta la combinación de cuenta sin historial + desvío estadístico de precio + foto reutilizada.
- **13 Anuncios Legítimos Confirmados (`groundTruth: 'LEGITIMATE'`):**
  - Habitaciones en residencias estudiantiles verificadas, departamentos por inmobiliaria matriculada (CUCICBA / CPCPI) y subalquileres de estudiantes reales con precios alineados al mercado zonal y fotos originales.
- **3 Anuncios Incompletos / Ambiguos (`groundTruth: 'INSUFFICIENT_DATA'`):**
  - Publicaciones sin teléfono ni nombre de propietario o con una única foto borrosa, donde la decisión correcta del sistema es frenar al estudiante en el *Control de Calidad de Datos* y pedir más información antes de transferir.

---

## 3. Métricas Calculadas en Tiempo Real

El módulo `RunExperimentBenchmarkUseCase` ejecuta el motor `VerifyListingUseCase` sobre los 30 casos y construye la matriz de evaluación:

1. **Métrica Principal del Pitch (% de Anuncios Truchos Detectados / Recall de Fraude):**
   $$\text{Recall (Sensibilidad)} = \frac{\text{Estafas Detectadas como Sospechosas (TP)}}{\text{Total de Estafas Reales en la Muestra}} \times 100$$
   - **Resultado sobre el dataset curado:** 100% (14/14). Ver la advertencia del inicio: es un resultado sobre casos de calibración, no una validación independiente.
2. **Precisión en Alerta de Fraude (Precision):**
   $$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} \times 100$$
   - Evalúa cuántos de los avisos marcados como sospechosos eran efectivamente estafas reales, evitando alarmar innecesariamente en avisos legítimos.
3. **Exactitud Global (Accuracy) sobre los 30 casos:**
   - Compara el veredicto esperado (`Anuncio sospechoso`, `Verificado`, `Sin datos suficientes`) contra la salida determinística del motor.
4. **Análisis por Ciudad Universitaria (Mitigación del Riesgo Principal):**
   - Desglosa el rendimiento entre **CABA**, **Córdoba**, **La Plata** y **Rosario**. Con el dataset curado da 100% en las cuatro ciudades, pero con 4 a 15 casos por ciudad y reglas calibradas sobre esos casos, **no alcanza para afirmar** que el motor compensa la calidad dispar de registros públicos. Es la hipótesis a validar con datos reales.

---

## 4. Separación calibración / evaluación

`RunExperimentBenchmarkUseCase.executeWithSplit` devuelve tres resúmenes: **calibración**, **evaluación** y **total**.

- Si el dataset trae la columna `split` en todas las filas, se respeta.
- Si no, se asigna de forma determinística: dentro de cada etiqueta real (estafa / legítimo / sin datos), ordenando por número de caso, 1 de cada 3 va a evaluación. En el dataset curado queda **21 calibración / 9 evaluación** (4 estafas, 4 legítimos y 1 sin datos en evaluación).

## 5. Cargar tu propio dataset (CSV o JSON)

En la vista **Experimento** → "Cargar mi dataset". Se procesa todo en el navegador: el archivo no se sube a ningún servidor. Las filas con errores se informan con su número de fila y se omiten; el resto se evalúa.

Ejemplos listos para copiar: [`ejemplos/dataset-ejemplo.csv`](./ejemplos/dataset-ejemplo.csv) y [`ejemplos/dataset-ejemplo.json`](./ejemplos/dataset-ejemplo.json) (datos inventados, solo muestran el formato).

| Columna | Obligatoria | Formato |
| :--- | :-: | :--- |
| `ground_truth` | Sí | `FRAUD` · `LEGITIMATE` · `INSUFFICIENT_DATA` (también `estafa`, `legitimo`, `sin_datos`) |
| `zone_id` | Sí | Uno de: `caba-monserrat-uade`, `caba-palermo`, `caba-recoleta`, `caba-balvanera`, `caba-caballito`, `cba-nueva-cordoba`, `laplata-centro`, `rosario-centro` |
| `monthly_rent_ars` | Sí | Entero en pesos (`230000`, `230.000` o `$ 230.000`) |
| `case_id` | No | Entero único (si falta o se repite, se numera solo) |
| `title`, `platform`, `what_happened`, `listing_url` | No | Texto |
| `deposit_ars` | No | Entero en pesos (default 0) |
| `owner_name`, `owner_phone`, `cbu_or_alias` | No | Texto. Sin ninguno de los tres, el control de calidad frena el caso (`Sin datos suficientes`) |
| `account_age_months` | No | Entero (default 12) |
| `photo_count` | No | Entero (default 3) |
| `image_dhash` | No | dHash de 16 hex de la foto del aviso (se puede obtener subiendo la foto en la Pantalla 3) |
| `known_image_id` | No | Id de una firma de la base semilla (modo demo) |
| `requests_advance_before_visit`, `is_registered_real_estate` | No | `si`/`no`, `true`/`false`, `1`/`0` |
| `real_estate_license` | No | Texto (ej. `CUCICBA 1234`) |
| `split` | No | `calibration` o `evaluation` (si se usa, tiene que estar en todas las filas) |
| `property_type` | No | `habitacion` (default), `monoambiente` o `2_ambientes`. Monoambiente y 2 ambientes se comparan contra el índice de mercado de la ciudad |

Ejemplo mínimo (CSV, separador `,` o `;`):

```csv
case_id,ground_truth,zone_id,monthly_rent_ars,deposit_ars,owner_phone,cbu_or_alias,account_age_months,photo_count,requests_advance_before_visit,split
1,FRAUD,caba-monserrat-uade,230000,115000,+54 9 11 0000-0001,alias.ejemplo.uno,1,2,si,calibration
2,LEGITIMATE,laplata-centro,345000,90000,+54 9 221 000-0004,inmo.ejemplo.lp,60,6,no,evaluation
```

**Recomendación para el informe:** separar `split` *antes* de mirar los resultados (por ejemplo, los primeros 20 relevados para calibrar y los últimos 10 para evaluar), no tocar las reglas después de ver la evaluación, y reportar ambas filas.
