# 02 — Decisiones de Arquitectura y Stack Tecnológico (ADR-001 y ADR-002)

**Estado:** Aprobado  
**Fecha:** Octubre 2026  
**Autores:** Grupo 12 (Fernández, Lecuenis, Ruschanoff)

---

## ADR-001: Arquitectura Limpia y Modular (Clean Architecture en el Cliente/Full-Stack)

### Contexto
El requerimiento del trabajo práctico pide desarrollar la solución de **CuartoSeguro** implementando **buenas prácticas de desarrollo de software**. En muchos prototipos universitarios o MVPs iniciales, la lógica de negocio (el motor de scoring, las reglas de validación de calidad de datos, el cálculo estadístico de precios por zona y la detección de fotos duplicadas) suele mezclarse directamente dentro de los componentes de interfaz gráfica (UI). Eso impide testear unitariamente el motor de verificación, dificulta auditar por qué un anuncio fue marcado como sospechoso y acopla la lógica al framework visual.

### Decisión
Adoptamos los principios de **Clean Architecture / Arquitectura Hexagonal (Ports & Adapters)** estructurando el código fuente en capas concéntricas con inversión de dependencias e independencia de interfaz:

```text
tendencias-tecnologicas/
├── docs/                                  # ADRs y decisiones de producto, arquitectura y validación
├── src/
│   ├── domain/                            # CAPA DE DOMINIO (Pura, sin dependencias de React ni navegador)
│   │   ├── entities/                      # Entidades de negocio (ListingInput, VerificationResult,ZoneBenchmark, FraudReport)
│   │   ├── services/                      # Servicios de dominio puros (DataQualityValidator, ImageMiningService, ZonePriceBiService, IdentityCbuMatcher)
│   │   └── repositories/                  # Contratos/Interfaces de repositorios (ports)
│   ├── application/                       # CAPA DE APLICACIÓN (Casos de uso orquestados)
│   │   ├── VerifyListingUseCase.ts        # Orquesta los 3 pasos de verificación + control de calidad
│   │   ├── RunExperimentBenchmarkUseCase.ts # Ejecuta la validación contra los 30 anuncios reales y calcula métricas BI
│   │   └── ReportFraudListingUseCase.ts   # Registra nuevos reportes comunitarios y CBU/alias denunciados
│   ├── infrastructure/                    # CAPA DE INFRAESTRUCTURA (Adaptadores y datasets)
│   │   ├── data/                          # Datasets curados: precios por zona universitaria, hashes de imágenes conocidas, directorio CBU, 30 anuncios reales
│   │   └── storage/                       # Persistencia en LocalStorage con fallback en memoria e inicialización determinística
│   └── presentation/                      # CAPA DE PRESENTACIÓN (UI React + Tailwind CSS)
│       ├── components/                    # Componentes reutilizables y accesibles (Navbar, StepProgress, PriceComparisonChart, SupportModal)
│       └── screens/                       # Las 8 pantallas del flujo UX + vistas de Directorio CBU y Laboratorio de 30 Anuncios
└── tests/                                 # Suite de pruebas automatizadas (Vitest)
```

### Consecuencias Positivas
- **Testabilidad del 100% de las reglas de negocio:** Los servicios de `domain/` y los casos de uso de `application/` son funciones y clases TypeScript puras, verificables con tests unitarios rápidos en milisegundos sin requerir un navegador.
- **Trazabilidad con los Entregables:** Cada módulo del dominio mapea 1:1 con los componentes definidos en los PDFs (`ImageMiningService` ↔ búsqueda inversa; `ZonePriceBiService` ↔ BI precio vs. zona; `IdentityCbuMatcher` ↔ registros públicos + directorio CBU/reportes).
- **Escalabilidad hacia Fase 2:** Cuando se incorporen integraciones externas reales (por ejemplo, API de Registro de la Propiedad Inmueble para la *Alternativa 14: Verificación catastral automática* o API de visión artificial en la nube), solo se reemplaza el adaptador en `src/infrastructure/` sin tocar el dominio ni las 8 pantallas.

---

## ADR-002: Elección del Stack Tecnológico

### Contexto
Necesitamos construir un MVP completo, autocontenido, tipado, rápido de ejecutar y verificar localmente, con soporte nativo para visualización de datos (BI), impresión/exportación de reportes PDF y pruebas automatizadas.

### Opciones Evaluadas
1. **Opción A (Elegida): TypeScript 5 + React 19 + Vite 6 + Tailwind CSS + Vitest**
2. **Opción B: Python (Flask/FastAPI) con plantillas Jinja2 tradicionales**
3. **Opción C: HTML/JS vanilla sin sistema de tipos ni empaquetador**

### Decisión y Justificación
Se selecciona la **Opción A (TypeScript + React 19 + Vite + Tailwind CSS + Vitest)** por las siguientes razones:

1. **Seguridad de Tipos Estricta (`strict: true`):** El motor de verificación maneja múltiples señales (veredictos ternarios, porcentajes de confianza, Z-scores de precios, estados de calidad de datos). TypeScript garantiza en tiempo de compilación que ningún estado inválido llegue a la vista o al reporte descargable.
2. **Respuesta en Ventana de Minutos (Hallazgo 2 UX):** Una SPA reactiva con persistencia local e indexación en memoria entrega feedback instantáneo en el Control de Calidad de Datos (Pantalla 4) y permite visualizar paso a paso el procesamiento (Pantalla 5) sin recargas de página.
3. **Capacidad de Impresión / Exportación PDF Nativa (Pantalla 8):** Mediante hojas de estilo `@media print` optimizadas y componentes declarativos, el reporte de la Pantalla 8 se exporta como un documento PDF limpio de una página listo para enviar por WhatsApp a los padres o familiares que realizan la transferencia.
4. **Ecosistema de Testing Moderno (Vitest):** Permite validar de forma automatizada tanto los casos individuales como el **Experimento completo de 30 anuncios reales** exigido en el Mapa de Oportunidad Tecnológica.
