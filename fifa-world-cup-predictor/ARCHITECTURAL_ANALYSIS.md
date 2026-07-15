# Arquitectura del proyecto FIFA World Cup Predictor

## 1. Resumen ejecutivo

Este proyecto es un frontend Angular 22 implementado con componentes standalone, rutas simples y una capa de servicios para integrar el flujo de autenticación y predicción con un backend externo. La arquitectura actual está pensada como un MVP: prioriza rapidez de desarrollo y simplicidad operativa sobre un modelo más formal de estados, guards de ruta, interceptores y pruebas automatizadas.

## 2. Objetivo funcional del sistema

El sistema soporta tres responsabilidades principales:
1. iniciar y validar una sesión de usuario vía autenticación externa con Google;
2. cargar partidos disponibles y filtrar los que siguen siendo predecibles en una ventana temporal razonable;
3. enviar una solicitud de predicción y renderizar un resultado previsto con una explicación textual.

## 3. Mapa de componentes y responsabilidades

### 3.1 Arranque y shell de la aplicación
- AppComponent: componente raíz que actúa como shell y renderiza el router outlet.
- main.ts: punto de entrada de Angular; ejecuta bootstrapApplication con appConfig.
- app.config.ts: configura providers globales de Angular, incluyendo router e HttpClient.

### 3.2 Páginas o vistas del producto
- LoginComponent: vista de aterrizaje para autenticación, validación inicial de sesión y redirección a la pantalla de predicción cuando ya está autenticado.
- PredictionComponent: vista principal del producto, responsable de verificar auth, desplegar el selector de partidos, enviar predicciones y presentar resultados.

### 3.3 Servicios de integración y acceso a datos
- AuthService: encapsula el inicio de login con Google, la comprobación de sesión y el logout, usando llamadas HTTP con credenciales para mantener la sesión del backend.
- MatchesService: encapsula la consulta de partidos desde el backend.
- PredictionService: encapsula el envío del payload de predicción al backend.
- buildApiUrl(): helper de infraestructura que resuelve la URL de backend en runtime y en desarrollo local.

### 3.4 Modelos de dominio y contratos de datos
- Match: modelo de entrada con datos del partido: equipos, fase, sede y fecha.
- PredictionRequest: payload enviado al backend con los atributos del partido seleccionado.
- PredictionResponse: contrato de respuesta que representa el resultado predicho, score, resultado, explicación y metadatos opcionales.
- AuthSessionResponse: respuesta de sesión usada por el frontend para validar si el usuario está autenticado.

### 3.5 Infraestructura y configuración operativa
- app.routes.ts: mapeo de rutas del sistema.
- proxy.conf.json: proxy de desarrollo para redirigir /api a http://localhost:8080.
- public/app-config.js: archivo de configuración cargado en runtime para inyectar API_BASE_URL.
- render.yaml: blueprint de despliegue en Render para producir la app de forma estática y configurar variables de runtime.
- angular.json: configuración de compilación y assets del proyecto.

## 4. Arquitectura funcional por capas

### 4.1 Capa de presentación
Responsable de la experiencia visual y de la interacción del usuario:
- LoginComponent
- PredictionComponent
- templates HTML y estilos CSS asociados

### 4.2 Capa de servicios
Responsable de encapsular integración con el backend y reglas de acceso a recursos:
- AuthService
- MatchesService
- PredictionService

### 4.3 Capa de modelos
Define contratos de datos y tipado para las transacciones entre frontend y backend:
- Match
- PredictionRequest
- PredictionResponse
- AuthSessionResponse

### 4.4 Capa de infraestructura y runtime
Responsable del arranque, routing, configuración de URL y despliegue:
- main.ts
- app.config.ts
- app.routes.ts
- api-url.ts
- proxy.conf.json
- render.yaml
- public/app-config.js

## 5. Flujos nombrados del sistema

### Flujo 1 — Inicio del shell de la aplicación
Nombre: Arranque del shell Angular
Componentes involucrados:
- main.ts
- AppComponent
- app.config.ts
- app.routes.ts
- Router

Descripción:
1. main.ts invoca bootstrapApplication para arrancar Angular.
2. appConfig registra provideRouter(routes) y provideHttpClient().
3. AppComponent renderiza el RouterOutlet como shell único.
4. El router resuelve la ruta inicial y redirige a /login cuando la URL está vacía.

### Flujo 2 — Inicio de autenticación externa
Nombre: Redirección a Google Login
Componentes involucrados:
- LoginComponent
- AuthService
- window.location
- backend /api/auth/login

Descripción:
1. El usuario pulsa “Login with Google”.
2. LoginComponent.startLogin() limpia el estado local y marca el login como en progreso.
3. AuthService.startGoogleLogin() construye la URL del backend con redirect_uri, redirectUrl y returnUrl apuntando a /predict.
4. El navegador ejecuta una redirección completa al endpoint de login externo.

### Flujo 3 — Verificación de sesión previa
Nombre: Validación de sesión activa en el arranque
Componentes involucrados:
- LoginComponent
- AuthService
- Router
- backend /api/auth/session

Descripción:
1. LoginComponent.ngOnInit() invoca checkSessionAndNavigate(false).
2. AuthService.getSession() realiza GET /api/auth/session con withCredentials: true.
3. Si el backend responde con authenticated: true, el componente navega a /predict.
4. Si el backend retorna 401/403 o no está autenticado, el flujo se mantiene en login y muestra mensaje de login requerido.

### Flujo 4 — Carga del catálogo de partidos
Nombre: Carga y filtrado de partidos disponibles
Componentes involucrados:
- PredictionComponent
- MatchesService
- Match
- backend /api/matches

Descripción:
1. PredictionComponent.ngOnInit() invoca loadMatches() y checkAuthentication().
2. MatchesService.getMatches() consulta /api/matches con credenciales.
3. PredictionComponent filtra partidos que aún estén disponibles en una ventana de 3 horas desde el kickoff, usando una clave temporal calculada en America/Mexico_City.
4. El listado se ordena cronológicamente para formar el selector.

### Flujo 5 — Envío de la predicción
Nombre: Solicitud de predicción al backend
Componentes involucrados:
- PredictionComponent
- PredictionService
- PredictionRequest
- Match
- backend /api/predictions

Descripción:
1. El usuario selecciona un partido del dropdown y confirma con “Predict Result”.
2. PredictionComponent.onSubmit() valida el formulario y construye el payload con el partido elegido.
3. PredictionService.predict() envía POST /api/predictions con withCredentials: true.
4. El backend responde con PredictionResponse y el componente lo almacena para renderizar la UI.

### Flujo 6 — Renderizado del resultado previsto
Nombre: Presentación del resultado y explicación
Componentes involucrados:
- PredictionComponent
- PredictionResponse
- prediction.component.html
- prediction.component.css

Descripción:
1. El componente almacena la respuesta de predicción en prediction.
2. Se derivan etiquetas legibles como ganador proyectado, score y resultado humano.
3. El template muestra el scoreboard, el resultado y la explicación del modelo.
4. La vista también incluye una representación visual tipo bracket para reforzar el storytelling del producto.

### Flujo 7 — Cierre de sesión
Nombre: Logout y reinicio del ciclo de autenticación
Componentes involucrados:
- PredictionComponent
- AuthService
- backend /api/auth/logout

Descripción:
1. El usuario pulsa “Log off”.
2. PredictionComponent.logOff() llama a AuthService.logout() con credenciales.
3. El backend procesa el cierre de sesión y el componente reacciona reiniciando el ciclo de autenticación mediante startGoogleLogin().

### Flujo 8 — Manejo de errores transversales
Nombre: Gestión de fallos de red, auth y validación de formulario
Componentes involucrados:
- LoginComponent
- PredictionComponent
- AuthService
- MatchesService
- PredictionService
- HttpErrorResponse

Descripción:
1. LoginComponent transforma errores de session check en mensajes de usuario específicos para 401/403, 0 y otros casos.
2. PredictionComponent convierte errores de predicción y carga de matches en mensajes amigables y estados de UI.
3. El componente centraliza mensajes operativos para no exponer detalles técnicos del backend.

### Flujo 9 — Configuración dinámica de runtime para producción
Nombre: Resolución de URL de backend en runtime
Componentes involucrados:
- api-url.ts
- public/app-config.js
- render.yaml
- angular.json

Descripción:
1. buildApiUrl() lee window.__APP_CONFIG__.API_BASE_URL si existe.
2. Si no existe, la implementación cae al path relativo para desarrollo local o al proxy.
3. Render inyecta la variable API_BASE_URL durante el build de producción para construir URLs correctas del backend.

## 6. Decisiones arquitectónicas clave

### 6.1 Arquitectura por componentes standalone
Decisión: usar componentes standalone para reducir boilerplate y simplificar la creación de vistas.
Ventajas:
- arranque rápido del proyecto;
- menos configuración repetida que con NgModules;
- fit natural para un MVP de una sola feature.
Riesgos:
- el sistema podría crecer en complejidad sin un criterio claro de organización y composición;
- el acoplamiento entre componente y lógica de UI puede crecer.

### 6.2 Separación de responsabilidades en servicios inyectables
Decisión: encapsular llamadas HTTP en AuthService, MatchesService y PredictionService.
Ventajas:
- desacopla la vista de la integración con el backend;
- facilita cambios de contrato o endpoint;
- deja al componente enfocado en interacción y render.
Riesgos:
- se mantiene lógica de negocio ligera en el componente;
- no existe aún una capa de use cases o state management explícito.

### 6.3 Routing simple basado en páginas
Decisión: definir rutas explícitas para /login y /predict, con redirecciones generales al login.
Ventajas:
- navegación fácil de entender;
- bajo costo de implementación;
- compatible con un producto orientado a una experiencia lineal.
Riesgos:
- no hay guards de ruta ni protección declarativa de /predict;
- la aplicación asume que la sesión ya se valida en la vista.

### 6.4 Autenticación basada en cookies y credenciales del navegador
Decisión: usar requests con withCredentials: true para que las cookies de sesión se envíen al backend.
Ventajas:
- coincide con la estrategia del backend para sesiones de navegador;
- evita necesidad de token en memoria en este MVP.
Riesgos:
- implica mayor sensibilidad a CORS, SameSite y política de cookies del navegador;
- cualquier cambio en la política de cookies puede romper todo el flujo.

### 6.5 Estado local y reactividad en el componente
Decisión: mantener estado de formulario, loading, mensaje de error y resultado en PredictionComponent y LoginComponent.
Ventajas:
- implementación sencilla y directa;
- adecuado para una sola pantalla y un flujo corto.
Riesgos:
- escalado deficiente si se agregan más pantallas, estados compartidos o más reglas de negocio.

### 6.6 Configuración dinámica de base URL para entornos
Decisión: usar buildApiUrl() plus public/app-config.js para ajustar la URL del backend según el entorno.
Ventajas:
- favorece despliegues en local y en producción sin tocar el código fuente;
- reduce el acoplamiento con un host estático.
Riesgos:
- la estrategia depende de que la variable runtime exista en el proceso de build;
- la resolución se hace de forma manual y no se centraliza en un interceptor HTTP.

## 7. Puntos fuertes del diseño actual

- Separación clara entre pantallas y servicios HTTP.
- Flujo de usuario lineal y comprensible.
- Integración con backend vía servicios bien delimitados.
- Soporte para desarrollo local con proxy y runtime config para producción.
- El componente de predicción encapsula la regla de negocio de selección de partidos en una manera legible.

## 8. Debilidades y riesgos arquitectónicos

- Falta de route guards para proteger /predict y evitar acceso no autorizado.
- No existe intercambios centralizados de auth/error a través de un interceptor HTTP.
- La lógica de presentación y de negocio está concentrada en los componentes.
- El manejo de errores está disperso y depende de condiciones manuales en cada pantalla.
- No existe estrategia formal de pruebas ni cobertura para los flujos críticos.
- El estado del formulario y del resultado puede crecer de forma poco mantenible si se agregan varias pantallas o flujos concurrentes.

## 9. Recomendaciones de evolución arquitectónica

1. Introducir route guards para proteger /predict frente a sesiones no válidas.
2. Crear un AuthInterceptor para centralizar withCredentials, headers y manejo de 401/403.
3. Definir un store o servicio de estado compartido si la app crece su complejidad.
4. Separar reglas de negocio y transformaciones de datos en servicios o helpers reutilizables.
5. Añadir pruebas de integración para login, sesión, matches y prediction.
6. Formalizar el contrato del backend mediante interfaces o schemas compartidos.

## 10. Conclusión

La arquitectura actual es simple, funcional y suficiente para un MVP. Está organizada en componentes standalone, servicios inyectables y modelos de dominio, con un flujo de usuario claro para autenticación, carga de partidos y predicción. Sin embargo, la solución está todavía muy cerca del producto y no ha incorporado mecanismos de protección, observabilidad o escalado que serían esperables en una evolución posterior.
