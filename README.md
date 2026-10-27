# CuartoSeguro — Verificación Preventiva de Alquileres Estudiantiles

> **Universidad Argentina de la Empresa (UADE)**  
> **Materia:** Tecnología e Innovación / Tendencias Tecnológicas  
> **Docente:** Daniel Alejandro Remondegui  
> **Grupo 12:** Matías Fernández, Tomás Matías Lecuenis, Theo Ruschanoff  

---

## 1. Descripción del Proyecto

**CuartoSeguro** resuelve el problema crítico que enfrentan los estudiantes universitarios que se mudan por primera vez a otra ciudad para cursar y buscan cuarto o subalquiler a distancia sin experiencia previa: **las estafas con señas por adelantado sin ver la propiedad, anuncios duplicados con fotos robadas y supuestos propietarios inexistentes**.

El proyecto articula e implementa en software funcional los tres entregables previos de la cursada:
1. **[1_IDEAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf](./docs/entregables/1_IDEAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf):** Evaluación de la hipótesis de invención (**29/35 puntos** en la matriz de evaluación).
2. **[2_TECNOLOGIAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf](./docs/entregables/2_TECNOLOGIAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf):** Mapa de Oportunidad Tecnológica (**Data Mining** para búsqueda inversa de imágenes y anuncios duplicados + **Business Intelligence (BI)** para precios vs. promedio de zona, más el **Experimento de validación con 30 anuncios reales**).
3. **[3_CustomerJourney_G12_Fernandez,Lecuenis,Ruschanoff.pdf](./docs/entregables/3_CustomerJourney_G12_Fernandez,Lecuenis,Ruschanoff.pdf):** Aplicación de Design Thinking y UX (combinación de las alternativas **1: Motor de verificación automática**, **6: Bot de reportes cruzados** y **11: Directorio de CBU o alias fraudulentos**, junto con el prototipo de **8 pantallas**).

---

## 2. Documentación de Decisiones (Markdowns / ADRs)

Todas las decisiones de producto, experiencia de usuario, arquitectura limpia, motor de scoring y validación estadística están documentadas en la carpeta [`docs/`](./docs/):

- 📄 **[`docs/00-indice-y-vision-general.md`](./docs/00-indice-y-vision-general.md):** Índice general, trazabilidad entre los 3 PDFs y síntesis ejecutiva.
- 📄 **[`docs/01-decisiones-producto-y-alcance-mvp.md`](./docs/01-decisiones-producto-y-alcance-mvp.md):** Decisiones basadas en los 3 hallazgos de investigación UX, matriz de priorización (Alternativas 1 + 6 + 11) y alcance de las 8 pantallas.
- 📄 **[`docs/02-arquitectura-y-stack-tecnologico.md`](./docs/02-arquitectura-y-stack-tecnologico.md):** ADR-001 (Clean Architecture / separación Dominio, Aplicación, Infraestructura y Presentación) y ADR-002 (Stack TypeScript + React 19 + Vite + Tailwind CSS + Vitest).
- 📄 **[`docs/03-motor-verificacion-y-heuristica-scoring.md`](./docs/03-motor-verificacion-y-heuristica-scoring.md):** ADR-003 (Diseño del motor heurístico explicable: Control de Calidad en Paso 0, Búsqueda Inversa en Paso 1, BI de Precios Zonales en Paso 2 y Directorio CBU/Identidad en Paso 3).
- 📄 **[`docs/04-experimento-validacion-30-anuncios.md`](./docs/04-experimento-validacion-30-anuncios.md):** ADR-004 (Diseño y métricas del experimento sobre 30 anuncios reales de CABA, Córdoba, La Plata y Rosario).
- 📄 **[`docs/05-buenas-practicas-calidad-y-seguridad.md`](./docs/05-buenas-practicas-calidad-y-seguridad.md):** ADR-005 (Principios SOLID, Clean Code, privacidad de datos públicos, accesibilidad web y testing automatizado).

---

## 3. Arquitectura del Proyecto

```text
tendencias-tecnologicas/
├── docs/                                         # Documentos de decisiones (Markdown / ADRs)
├── src/
│   ├── domain/                                   # Capa de Dominio pura (sin dependencias de UI)
│   │   ├── entities/types.ts                     # Entidades y contratos tipados estrictos
│   │   └── services/
│   │       ├── DataQualityValidator.ts           # Pantalla 4: Control de calidad de los datos
│   │       ├── ImageMiningService.ts             # Paso 1: Búsqueda inversa y fotos duplicadas
│   │       ├── ZonePriceBiService.ts             # Paso 2: Analítica BI de precios por zona
│   │       └── IdentityCbuMatcher.ts             # Paso 3: Registros públicos, reportes y CBU
│   ├── application/                              # Casos de Uso orquestados
│   │   ├── VerifyListingUseCase.ts               # Ejecuta la verificación completa y emite veredicto
│   │   ├── ReportFraudListingUseCase.ts          # Agrega reportes confirmados al directorio CBU
│   │   └── RunExperimentBenchmarkUseCase.ts      # Evalúa los 30 anuncios reales del experimento
│   ├── infrastructure/                           # Datasets e infraestructura de persistencia
│   │   ├── data/
│   │   │   ├── datasets.ts                       # Zonas universitarias, imágenes y directorio CBU
│   │   │   └── experiment30Listings.ts           # Muestra de 30 anuncios reales (14 estafas, 13 reales, 3 incompletos)
│   │   └── storage/LocalRepository.ts            # Persistencia local de historial y reportes
│   └── presentation/                             # Interfaz de usuario (8 pantallas + vistas BI)
│       ├── components/                           # Navbar, Gráfico BI, Modal nativo <dialog>
│       └── screens/                              # Pantallas 1 a 8 + Historial, Directorio y Experimento
└── tests/
    └── verificationEngine.test.ts                # Suite de pruebas unitarias e integrales (Vitest)
```

---

## 4. Ejecución Rápida y Comandos

### Requisitos previos
- Node.js 20+ y `pnpm` (o `npm`).

### Instalación y puesta en marcha
```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo interactivo
pnpm dev

# Ejecutar suite de tests automatizados (Vitest)
pnpm test

# Verificar tipado estricto TypeScript y compilar para producción
pnpm build
```
