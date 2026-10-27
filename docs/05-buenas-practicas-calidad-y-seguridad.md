# 05 — Buenas Prácticas de Desarrollo, Calidad y Seguridad (ADR-005)

**Estado:** Aprobado  
**Contexto:** Requerimiento de cátedra: *"Poné las decisiones como markdowns y desarrollá todo en esta carpeta implementando buenas prácticas del desarrollo"*.

---

## 1. Principios de Ingeniería de Software Aplicados

### 1.1 Principios SOLID y Clean Code
- **Single Responsibility Principle (SRP):**
  - `DataQualityValidator` solo evalúa la legibilidad y completitud de los datos ingresados (Pantalla 4).
  - `ImageMiningService` solo analiza coincidencias de hashes de imágenes y anuncios duplicados (Paso 1).
  - `ZonePriceBiService` solo calcula estadísticas de precios y ratios de seña respecto a la zona universitaria (Paso 2).
  - `IdentityCbuMatcher` solo cruza CBU/Alias, reportes comunitarios e indicadores registrales (Paso 3).
  - `VerifyListingUseCase` coordina los servicios y sintetiza el veredicto explicable.
- **Open/Closed Principle (OCP):**
  - El motor de reglas admite nuevas señales de riesgo o nuevas zonas universitarias en el catálogo sin modificar la estructura del veredicto ni las pantallas de interfaz.
- **Dependency Inversion Principle (DIP):**
  - Los casos de uso dependen de contratos/estructuras de dominio y reciben los repositorios de datos como dependencias inyectables, facilitando el testing determinístico.

### 1.2 Tipado Estricto (`TypeScript strict mode`)
- Configuración `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` y `noFallthroughCasesInSwitch: true` en `tsconfig.json`.
- Uso de uniones discriminadas (`VerdictType`, `AlertSeverity`, `VerificationStepId`, `ScreenId`) para impedir estados imposibles en la interfaz.

---

## 2. Estándares Modernos de Web y Experiencia de Usuario (UX/A11y)

Siguiendo las guías de buenas prácticas web modernas (`modern-web-guidance`):
1. **Validación amigable post-interacción:** Los formularios guían al estudiante sin mostrar errores prematuros mientras escribe, ubicando las pistas de formato (`hints`) por encima de cada campo para que los popovers de autocompletado no las tapen.
2. **Elementos Nativos y Accesibles (`<dialog>`):** El modal de soporte humano y el visor de ejemplos utilizan el elemento semántico nativo `<dialog>` con soporte para cierre con tecla `Escape`, clic exterior (*light dismiss*) y manejo accesible del foco.
3. **Transparencia Algorítmica (`aria-live="polite"`):** Durante la **Pantalla 5 (Procesamiento)**, el avance por los 3 pasos se anuncia semánticamente y explica qué está verificando el sistema para mitigar la ansiedad del estudiante.
4. **Diseño Imprimible / Exportable a PDF (`@media print`):** La **Pantalla 8 (Reporte)** cuenta con reglas de estilo de impresión dedicadas que ocultan la navegación e imprimen una ficha técnica limpia con el veredicto, nivel de confianza, motivos y recomendación para compartir con familiares.

---

## 3. Privacidad por Diseño y Ética de Datos

Tal como se definió en el **Mapa de Oportunidad Tecnológica (Punto 3: Datos Necesarios)**:
- **Permiso y Alcance:** *"Solo información pública"*.
- **Consentimiento informado:** En la **Pantalla 3**, el sistema requiere la confirmación explícita de autorización para procesar los datos del anuncio antes de ejecutar la verificación.
- **Minimización de datos:** No se solicitan claves bancarias ni datos privados del estudiante; únicamente se analizan los datos del anuncio ofertado y el CBU/Alias de destino antes de realizar una transferencia.
- **Descargo de responsabilidad claro (Pantalla 2 y Reporte):** Se recuerda siempre que *"la verificación automatizada reduce el riesgo de estafas evidentes pero no reemplaza ver la propiedad en persona ni firmar un contrato válido"*.

---

## 4. Estrategia de Pruebas Automatizadas (`Vitest`)

El proyecto incluye una suite de tests automatizados en `tests/` que verifica:
1. **Control de Calidad de Datos (Pantalla 4):** Bloqueo preventivo cuando faltan datos de contacto del propietario con el mensaje exacto requerido por el prototipo.
2. **Detección de Fotos Robadas (Paso 1):** Identificación de anuncios con imágenes duplicadas en otros avisos a distinto precio.
3. **Cálculo Estadístico BI de Precios por Zona (Paso 2):** Cálculo exacto de porcentaje de desvío y Z-Score frente al promedio del barrio universitario.
4. **Cruce con Directorio de CBU/Alias Fraudulentos y Reportes Comunitarios (Paso 3):** Detección inmediata de alias/CBU denunciados y actualización en vivo cuando un estudiante reporta una nueva estafa confirmada en la Pantalla 7.
5. **Experimento de los 30 Anuncios Reales (Mapa Tecnológico):** Test integral que corre los 30 casos del experimento y comprueba que la sensibilidad de detección de estafas supera el umbral objetivo.
