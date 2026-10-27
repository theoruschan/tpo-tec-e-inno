# CuartoSeguro — Verificación Preventiva de Alquileres Estudiantiles

> **Universidad Argentina de la Empresa (UADE)**  
> **Materia:** Tecnología e Innovación / Tendencias Tecnológicas  
> **Docente:** Daniel Alejandro Remondegui  
> **Grupo 12:** Matías Fernández, Tomás Matías Lecuenis, Theo Ruschanoff  

**App desplegada:** https://tpo-tec-e-inno.vercel.app

---

## 1. Qué hace

CuartoSeguro ayuda a un estudiante que alquila por primera vez a distancia a decidir, **en los minutos en que le piden la seña**, si el anuncio tiene señales de estafa. El flujo sigue las 8 pantallas del prototipo del Entregable 3:

Inicio → Instrucciones → Carga del anuncio → Control de calidad → Procesamiento → Veredicto → Detalles → Reporte

El motor combina tres chequeos explicables (sin IA de caja negra, como pide el Mapa de Oportunidad Tecnológica):

1. **Búsqueda inversa de la foto:** al subir la foto del aviso se calcula en el navegador su huella perceptual (dHash de 64 bits) y se compara por distancia de Hamming contra fotos ya reportadas.
2. **BI de precios por zona:** desvío del alquiler y de la seña contra el promedio de 8 zonas universitarias de CABA, Córdoba, La Plata y Rosario.
3. **Identidad y directorio colaborativo:** antigüedad de la cuenta, matrícula declarada y cruce del CBU/alias/teléfono contra reportes de otros estudiantes.

El resultado es un veredicto (`Anuncio sospechoso` / `Verificado` / `Sin datos suficientes`), un nivel de confianza, los motivos por separado, una recomendación y un **PDF de una página** para compartir con quien vaya a pagar.

## 2. Qué es real y qué no (límites conocidos)

| Parte | Estado |
| :--- | :--- |
| Motor de reglas, control de calidad, veredicto y confianza | **Real**, determinístico y testeado. Las reglas y umbrales son heurísticos, calibrados a mano. |
| Huella perceptual de la foto (dHash) | **Real**, se calcula en el navegador (la foto no sale del dispositivo). |
| Base de fotos conocidas | **Semilla de 5 fotos.** No es una búsqueda en toda la web ni en los portales en vivo. Una captura de pantalla completa puede no coincidir; conviene subir la foto o un recorte. |
| Precios promedio por zona | **Datos semilla** cargados a mano para el TP, no un relevamiento actualizado. |
| Matrícula / registros públicos | **No se consulta ningún padrón real.** Solo se usa lo que declara el estudiante. |
| Directorio de CBU/alias | **Real y compartido en Supabase**: CBU/alias/teléfono guardados como HMAC con sal secreta, enmascarados al mostrarse, reportes nuevos en moderación y regla de 3 reportes independientes. Los 5 casos semilla son **ficticios**. Si Supabase no responde, la app cae al modo local y lo indica. "Independiente" = otro navegador/dispositivo: no frena a alguien decidido a abusar. |
| Experimento de 30 anuncios | **Dataset curado e ilustrativo.** El 100% de recall se mide sobre los mismos casos usados para calibrar las reglas: **no es una validación independiente**. La app permite cargar un CSV/JSON propio y separa calibración y evaluación ([docs/04](./docs/04-experimento-validacion-30-anuncios.md)). |
| Soporte humano (Pantalla 7) | **Demo.** El formulario no envía la consulta a nadie y lo dice. |
| Reporte PDF y compartir | **Real** (jsPDF por import dinámico; Web Share API con fallback a copiar texto). |

> La verificación no reemplaza ver la propiedad en persona.

## 3. Cómo correrlo

Requisitos: Node.js 20 (ver `.nvmrc`) y pnpm 10 (`corepack enable` o `corepack pnpm@10.15.0 …`).

```bash
pnpm install
pnpm dev          # servidor de desarrollo
pnpm lint         # ESLint
pnpm typecheck    # TypeScript estricto
pnpm test         # Vitest (107 tests)
pnpm build        # build de producción en dist/
pnpm preview      # sirve dist/ localmente
```

### Directorio compartido (opcional)

```bash
cp .env.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

Aplicar la migración [`supabase/migrations/20261027000000_fraud_reports.sql`](./supabase/migrations/20261027000000_fraud_reports.sql) en el proyecto de Supabase y cargar las mismas dos variables en Vercel. Solo va la clave pública (anon); nunca la `service_role`. Detalle en [docs/06](./docs/06-directorio-colaborativo-supabase.md).

### Deploy

Vercel conectado al repo de GitHub: cada push a `main` despliega a producción. `vercel.json` define el build con pnpm, el fallback SPA y los headers de seguridad (CSP, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`). GitHub Actions (`.github/workflows/ci.yml`) corre lint, typecheck, tests y build en cada push y PR.

## 4. Arquitectura

Clean Architecture con puertos y adaptadores. El dominio no importa React ni APIs del navegador (lo controla una regla de ESLint).

```text
src/
├── domain/                     # Puro: entidades, reglas y puertos
│   ├── entities/types.ts
│   ├── ports/                  # ImageHasher, FraudDirectoryRepository, ReportPdfExporter
│   └── services/               # DataQualityValidator, ImageMiningService, PerceptualHash,
│                               # ZonePriceBiService, IdentityCbuMatcher, IdentifierPrivacy
├── application/                # Casos de uso
│   ├── VerifyListingUseCase.ts
│   ├── ReportFraudListingUseCase.ts
│   ├── BuildVerificationReportUseCase.ts
│   ├── RunExperimentBenchmarkUseCase.ts      # métricas + split calibración/evaluación
│   └── ParseExperimentDatasetUseCase.ts      # CSV/JSON propio
├── infrastructure/             # Adaptadores
│   ├── image/BrowserImageHasher.ts           # canvas → dHash
│   ├── report/JsPdfReportExporter.ts         # jsPDF (import dinámico)
│   ├── supabase/SupabaseFraudDirectoryRepository.ts
│   ├── storage/LocalRepository.ts, LocalFraudDirectoryRepository.ts
│   ├── createFraudDirectoryRepository.ts     # elige Supabase o local, con fallback
│   └── data/                                 # datasets semilla y los 30 casos curados
└── presentation/               # React 19 + Tailwind 4 (pantallas cargadas con React.lazy)
supabase/migrations/            # Esquema, RLS, hash con sal y semilla del directorio
tests/                          # Vitest + Testing Library
docs/                           # ADRs y entregables
```

## 5. Documentación

- [docs/00](./docs/00-indice-y-vision-general.md) — Índice y trazabilidad con los 3 entregables
- [docs/01](./docs/01-decisiones-producto-y-alcance-mvp.md) — Producto, UX y alcance de las 8 pantallas
- [docs/02](./docs/02-arquitectura-y-stack-tecnologico.md) — Arquitectura y stack
- [docs/03](./docs/03-motor-verificacion-y-heuristica-scoring.md) — Motor de verificación y dHash
- [docs/04](./docs/04-experimento-validacion-30-anuncios.md) — Experimento: alcance real, split y formato del dataset
- [docs/05](./docs/05-buenas-practicas-calidad-y-seguridad.md) — Calidad, seguridad y accesibilidad
- [docs/06](./docs/06-directorio-colaborativo-supabase.md) — Directorio colaborativo en Supabase

Entregables originales:

1. **[1_IDEAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf](./docs/entregables/1_IDEAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf):** Evaluación de la hipótesis de invención (**29/35 puntos**).
2. **[2_TECNOLOGIAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf](./docs/entregables/2_TECNOLOGIAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf):** Mapa de Oportunidad Tecnológica (Data Mining + BI, experimento de 30 anuncios).
3. **[3_CustomerJourney_G12_Fernandez,Lecuenis,Ruschanoff.pdf](./docs/entregables/3_CustomerJourney_G12_Fernandez,Lecuenis,Ruschanoff.pdf):** Design Thinking, alternativas 1 + 6 + 11 y prototipo de 8 pantallas.
