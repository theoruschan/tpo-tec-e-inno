# CuartoSeguro — Documentación de Decisiones y Arquitectura

**Materia:** Tecnología e Innovación / Tendencias Tecnológicas (UADE)  
**Docente:** Daniel Alejandro Remondegui  
**Grupo 12:** Matías Fernández, Tomás Matías Lecuenis, Theo Ruschanoff  
**Proyecto:** Idea 2 — **CuartoSeguro** (Puntaje Matriz de Evaluación: **29 / 35**)

---

## 1. Propósito de este Repositorio

Este repositorio contiene la resolución integral del Trabajo Práctico a partir del requerimiento de la **Idea 2: CuartoSeguro**, articulando de punta a punta los tres entregables de diseño e innovación del grupo:

1. **[1_IDEAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf](./entregables/1_IDEAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf):** Evaluación de hipótesis de invención con matriz de 35 puntos y ficha técnica de *CuartoSeguro* (29/35).
2. **[2_TECNOLOGIAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf](./entregables/2_TECNOLOGIAS_G12_Fernandez-Lecuenis-Ruschannoff.pdf):** Mapa de Oportunidad Tecnológica (Data Mining + Business Intelligence sobre fuentes públicas, sin IA de caja negra en el primer MVP, y experimento de validación sobre 30 anuncios reales).
3. **[3_CustomerJourney_G12_Fernandez,Lecuenis,Ruschanoff.pdf](./entregables/3_CustomerJourney_G12_Fernandez,Lecuenis,Ruschanoff.pdf):** Investigación UX y Design Thinking (3 hallazgos de evidencia, insight, tensión principal, matriz de priorización de 14 alternativas y prototipo de 8 pantallas).

---

## 2. Síntesis Ejecutiva de CuartoSeguro

| Dimensión | Definición en CuartoSeguro |
| :--- | :--- |
| **Problema** | El primer alquiler o subalquiler suele ser el primer contacto con estafas: depósitos/señas por adelantado sin ver la propiedad, publicaciones duplicadas con fotos robadas o supuestos propietarios que no existen. |
| **Usuario Inicial** | Estudiantes universitarios que se mudan por primera vez a otra ciudad para cursar, buscando cuarto o subalquiler a distancia y sin experiencia previa alquilando. |
| **Tensión Principal (UX)** | El estudiante debe decidir en una **ventana de minutos** (bajo presión del supuesto propietario en WhatsApp o chat) entre un proceso artesanal lento e incierto (videollamada, googlear) o confiar a ciegas y transferir la seña. |
| **Solución (MVP)** | Plataforma web de verificación rápida y gratuita para estudiantes que combina: **(1) Motor de verificación automática** (búsqueda inversa de fotos + BI de precios por zona + control de datos), **(6) Bot de reportes cruzados** y **(11) Directorio colaborativo de CBU/Alias fraudulentos**. |
| **Capacidad Tecnológica** | **Data Mining** (detección de imágenes duplicadas / reutilizadas entre anuncios y patrones de fraude) + **Business Intelligence (BI)** (comparación estadística contra precios promedio por barrio universitario y analítica de validación sobre 30 anuncios). |
| **Métrica del Experimento** | Verificar **30 anuncios reales** de ciudades universitarias y medir el **% de anuncios truchos detectados correctamente (Recall/Sensibilidad de fraude)** junto con la precisión global del motor. |

---

## 3. Índice de Decisiones (Markdowns)

Todas las decisiones de producto, experiencia de usuario, arquitectura de software, modelo heurístico/BI y calidad de código se encuentran documentadas en esta carpeta `docs/` bajo el formato de **Architecture Decision Records (ADRs)** y guías de diseño:

1. **[01-decisiones-producto-y-alcance-mvp.md](./01-decisiones-producto-y-alcance-mvp.md)**  
   Trazabilidad desde los hallazgos de Design Thinking hasta el alcance funcional del MVP, justificación de la matriz de priorización (alternativas 1 + 6 + 11) y especificación de las **8 pantallas** del flujo de usuario.
2. **[02-arquitectura-y-stack-tecnologico.md](./02-arquitectura-y-stack-tecnologico.md)**  
   Decisiones de arquitectura limpia (Separación Dominio / Aplicación / Infraestructura / UI), elección de stack tecnológico (TypeScript estricto, React 19, Vite, Tailwind CSS, Vitest) y estructura de directorios.
3. **[03-motor-verificacion-y-heuristica-scoring.md](./03-motor-verificacion-y-heuristica-scoring.md)**  
   Diseño detallado del **Motor de Verificación Explicable**: Control de Calidad de Datos (Paso 0), Búsqueda Inversa de Fotos (Paso 1), BI de Precios por Zona (Paso 2), Cruce de Identidad / CBU / Reportes Comunitarios (Paso 3) y fórmula del Nivel de Confianza y Veredicto.
4. **[04-experimento-validacion-30-anuncios.md](./04-experimento-validacion-30-anuncios.md)**  
   Diseño y resultados del **Experimento de 30 Anuncios Reales** definido en el Mapa de Oportunidad Tecnológica, matriz de confusión y métricas de efectividad.
5. **[05-buenas-practicas-calidad-y-seguridad.md](./05-buenas-practicas-calidad-y-seguridad.md)**  
   Estándares de ingeniería aplicados: Clean Code, principios SOLID, tipado estricto, privacidad de datos ("solo información pública"), accesibilidad web (WCAG) y estrategia de testing automatizado.
6. **[06-directorio-colaborativo-supabase.md](./06-directorio-colaborativo-supabase.md)**  
   Directorio colaborativo compartido en Supabase: hash con sal secreta, enmascarado, moderación, regla de 3 reportes independientes y fallback offline.
