# Prompt para continuar el trabajo

Copiá todo el bloque de abajo en una sesión nueva de Claude Code abierta en esta carpeta.

```text
Contexto
Trabajás sobre "CuartoSeguro" (TP UADE, Tecnología e Innovación, Grupo 12): verifica anuncios de
alquiler para estudiantes antes de pagar la seña. Ya está desplegada y funcionando:
- Producción: https://tpo-tec-e-inno.vercel.app (Vercel, deploy automático en cada push a main)
- Repo: https://github.com/theoruschan/tpo-tec-e-inno (CI de GitHub Actions: lint, typecheck, test, build)
- Supabase: proyecto "tpo-tec e inno" (ref pakcqhhecnlgkzznlytu, us-east-1). Tablas fraud_reports y
  photo_sightings con RLS; solo se accede por RPC (get_public_fraud_directory, hash_identifiers,
  submit_fraud_report, match_and_register_photo). Sal secreta en el schema private.
- Stack: React 19 + Vite 6 + Tailwind 4 + TypeScript estricto + Vitest, Clean Architecture
  (src/domain, src/application, src/infrastructure, src/presentation), puertos y adaptadores.

Antes de tocar código
1. Leé README.md (tabla "Qué es real y qué no"), docs/03, docs/04, docs/06 y este archivo.
2. Corré: corepack pnpm@10.15.0 install && corepack pnpm@10.15.0 lint && corepack pnpm@10.15.0 typecheck
   && corepack pnpm@10.15.0 test && corepack pnpm@10.15.0 build. Línea base: 181 tests, build OK.
   (No hay pnpm global; pnpm 12 rechaza el lockfile, por eso pnpm 10.15.0 vía corepack.)
3. Si algo no está claro, preguntame. No asumas.

Reglas
- Respondé en español, directo, sin halagos.
- Cambios parciales; no reescribas archivos salvo que cambie más del 80 %.
- El dominio no importa React ni el navegador (lo controla ESLint). Servicios nuevos por puertos.
- Conservá los textos exactos del prototipo (PDF 3 en docs/entregables/).
- Después de cada paso: lint + typecheck + test + build, mostrame la evidencia, commit y push
  enseguida (no dejes trabajo verificado solo en local).
- Honestidad: todo lo que sea semilla, estimación o demo tiene que decirse en la UI y en docs.

Cosas que ya sabemos (para no repetir pruebas)
- El conector de Vercel no puede crear proyectos ni variables de entorno (403): esas acciones las
  hago yo desde el dashboard. Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY ya están.
- Crear proyectos de Supabase desde el conector pide confirmación de costo que el cliente no soporta.
- Docker no está corriendo en esta máquina; el SQL se prueba directo en Supabase con la clave pública.
- `pnpm preview` sirve los mismos headers que producción (CSP incluida), leídos de vercel.json.
- El OCR (tesseract.js 6.0.1) se sirve desde /ocr/tesseract-6.0.1/, copiado en cada dev/build por
  scripts/copy-ocr-assets.mjs; si se actualiza tesseract.js hay que cambiar OCR_BASE (hay un test).
- Precios de mercado: src/infrastructure/data/marketPrices.json, actualizado por
  scripts/update_market_prices.py y la Action "Actualizar precios de mercado" (día 20).
- Al probar contra Supabase, borrá siempre las filas de prueba (usá ids de dispositivo con prefijo
  "test-" o "e2e-" para encontrarlas).

Pendiente (en este orden, salvo que te diga otra cosa)
1. Correr una vez la Action "Actualizar precios de mercado" (workflow_dispatch) y revisar el resultado.
2. OCR con capturas reales: te paso capturas de WhatsApp/Marketplace (con datos tapados); medí qué
   campos lee bien y ajustá ListingTextExtractor con tests nuevos por cada caso real.
3. (PARCIAL 28/10/2026) Piloto y panel admin hechos (docs/08): aviso, condiciones, feedback y moderación
   de reportes en /#admin. El usuario admin ya existe y está habilitado (no se probó el login real aún; la contraseña hay que cambiarla por una fuerte antes de compartir el link). Falta: login para reportar y
   registrar fotos, rate limit por IP (Edge Function), revisar alertas de fotos con pocas fuentes y dar de
   baja reportes ya aprobados desde el panel (hoy es por SQL).
4. Precio de habitaciones: hoy es una estimación del equipo. Opciones: API de MercadoLibre (requiere que
   registre una app en el DevCenter; credenciales solo como secretos) o calcular medianas con datos
   de la comunidad excluyendo anuncios marcados como sospechosos. Preguntame antes de elegir.
5. (RESUELTO 28/10/2026) El 82 % del PDF 3 es ilustrativo; no se retocó la fórmula. docs/03 describe la
   fórmula real (72-89 % para sospechoso, se satura) y la UI rotula la confianza como índice del motor.
6. Soporte humano (Pantalla 7): hoy es demo y lo dice. Hace falta un canal real (lo defino yo).
7. Legal antes de abrir el directorio al público: las condiciones del piloto (PilotInfoView) son un
   borrador en lenguaje llano, no asesoramiento legal. Falta revisión profesional, proceso de reclamo
   formal y evaluación de Ley 25.326 / registro ante la AAIP.
8. Operación: Supabase free pausa el proyecto tras 7 días sin uso (proponé un ping o el plan pago);
   monitoreo de errores (por ejemplo Sentry) y métricas de uso sin datos personales.
9. Re-medir Lighthouse móvil en producción después del OCR y los precios (antes: 99-100 en todo).
10. Experimento real: cuando cargue mis 30 anuncios reales en el laboratorio, ayudame a separar
    calibración/evaluación antes de mirar resultados y a escribir los números en docs/04.
11. Más adelante: bot de WhatsApp (WhatsApp Business Cloud API) para responder en el mismo canal
    donde se decide la seña (Hallazgo 2 del PDF 3).

Empezá por el punto 1 y mostrame el plan del punto 2 antes de escribir código.
```
