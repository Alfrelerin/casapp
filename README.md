# Reparto de tareas · Laura y Alfre

Web app instalable en el móvil para repartir las tareas del hogar:

- **Rotación A/B automática.** Cada lunes cambia de semana sola.
- **Puntos por esfuerzo** y un balance semanal, quincenal y mensual.
- **Intercambios.** Puedes pedirle al otro que haga una tarea, como favor o a cambio de otra.
- **Batch cooking.** Qué base cocina cada uno y el reparto de comidas del finde.
- **Sincronización en tiempo real** entre los dos móviles. También funciona sin conexión.

Está hecha con HTML, CSS y JavaScript, sin nada que compilar. Los datos se guardan en **Firebase Firestore** (plan gratuito) y la web se aloja en **GitHub Pages** (gratis).

---

## Puesta en marcha (una sola vez, unos 30 minutos)

### 1. Crear el proyecto de Firebase

1. Entra en <https://console.firebase.google.com> con tu cuenta de Google.
2. **Crear un proyecto** → nombre `reparto-tareas` → puedes desactivar Google Analytics → Crear.
3. **Autenticación**
   - Menú izquierdo: *Compilación → Authentication → Comenzar*.
   - Pestaña *Método de inicio de sesión* → **Anónimo** → *Habilitar* → Guardar.
4. **Base de datos**
   - *Compilación → Firestore Database → Crear base de datos*.
   - Ubicación: `europe-southwest1 (Madrid)`, o cualquier otra de Europa.
   - Empieza en **modo de producción**.
   - Cuando se haya creado, ve a la pestaña **Reglas**, borra lo que haya, pega el contenido del archivo [`firestore.rules`](firestore.rules) y pulsa **Publicar**.
5. **Registrar la app web**
   - Rueda ⚙️ (arriba a la izquierda) → *Configuración del proyecto* → en *Tus apps*, pulsa el icono **`</>`** (Web).
   - Apodo: `reparto-tareas`. **No** marques Firebase Hosting. Pulsa *Registrar app*.
   - Copia los valores del bloque `firebaseConfig` y pégalos en [`js/firebase-config.js`](js/firebase-config.js), sustituyendo los `PEGA_AQUI`.

> Las claves de `firebaseConfig` no son secretas: solo identifican el proyecto y pueden estar en un repositorio público. La protección la dan las reglas del paso 4.

### 2. Subirlo con GitHub Desktop

1. GitHub Desktop → **File → Add Local Repository…** → elige esta carpeta (`reparto-tareas`).
2. Si te dice que no es un repositorio, pulsa **"create a repository"** → *Create repository*.
3. Abajo a la izquierda, escribe un resumen (p. ej. `Primera versión`) → **Commit to main**.
4. Arriba, pulsa **Publish repository**.
   - Desmarca *Keep this code private*: GitHub Pages gratis necesita que el repositorio sea público. No hay datos personales en el código.
   - Publish.

### 3. Activar GitHub Pages

1. En <https://github.com>, abre tu repositorio `reparto-tareas` → **Settings → Pages**.
2. *Source*: **Deploy from a branch** → Branch: **main**, carpeta **/(root)** → *Save*.
3. En 1–2 minutos la app estará en `https://TU-USUARIO.github.io/reparto-tareas/`.

### 4. Empezar a usarla

1. Abre esa dirección en tu móvil → **Crear nuestro hogar** → **Soy Alfre**.
2. Pulsa **Enviar enlace** (o *Ajustes → Compartir*) y mándaselo a Laura por WhatsApp. Al abrirlo, ella entra directamente en el mismo hogar.
3. Instaladla en el móvil:
   - **iPhone:** Safari → botón Compartir → **Añadir a pantalla de inicio**.
   - **Android:** Chrome → menú ⋮ → **Instalar aplicación**.
4. En *Ajustes → Rotación*, comprobad que la semana actual es la A o la B que os toca.

---

## Cómo se usa

| Acción | Cómo |
|---|---|
| Marcar una tarea hecha | Toca el círculo. Si es del otro, te pregunta quién la ha hecho. |
| Desmarcar | Vuelve a tocar el círculo. |
| Pedir un cambio | Toca el nombre de la tarea → *Pedir cambio a…* → elige si es un favor o si a cambio haces una suya. |
| Aceptar o rechazar un cambio | Aparece un aviso arriba en *Semana*. |
| Ver otras semanas | Flechas ‹ › de la cabecera. |
| Apuntar la base del batch | Pestaña *Cocina* → "Base a cocinar". Se guarda sola. |
| Cambiar quién se encarga de cada comida del finde | *Cocina* → toca la casilla (Alfre → Laura → Los dos). |
| Editar tareas y puntos | *Ajustes → Tareas y puntos*, o toca una tarea → *Editar tarea*. |
| Decir que una tarea no hace falta esta semana | Toca la tarea → *No hace falta esta semana* → elige el motivo. Al otro le llega un aviso en *Semana*, con un número rojo en la pestaña. No suma puntos y se puede deshacer. |
| Poner foto de perfil | *Ajustes → Perfil → Poner foto*. Se recorta cuadrada y se guarda comprimida en Firestore. |
| Apuntar lo que habéis cocinado | Pestaña *Tápers* → *Apuntar comida*: qué es, si va a la nevera o al congelador, cuándo se hizo y cuántas raciones hay. La fecha límite se calcula sola (nevera 3 días, congelador unos 3 meses) y se puede cambiar. Desde *Cocina* también podéis apuntar el batch con *Apuntar en tápers*. |
| Comer, congelar o terminar un táper | *Comer 1* resta una ración y, con la última, el táper pasa a terminados. Si tocas el táper puedes pasarlo al congelador, descongelarlo (queda 1 día para comerlo), editarlo o marcarlo como tirado. En la pestaña sale un número rojo si algo caduca hoy o mañana. |

Los **puntos se los lleva quien hace la tarea**. Si alguien te cede una, te llevas sus puntos. Una tarea de "Los dos" suma a los dos.

---

## Actualizar la app

1. Cambia los archivos.
2. En GitHub Desktop: **Commit to main** → **Push origin**.
3. GitHub Pages se actualiza en uno o dos minutos. Si en el móvil no ves los cambios, cierra la app del todo y vuelve a abrirla.
4. Si cambias muchos archivos y siguen sin aparecer, sube el número de versión en `sw.js` (`reparto-v1` → `reparto-v2`).

## Si algo falla

| Mensaje | Solución |
|---|---|
| "Falta conectar Firebase" | No se ha pegado la configuración en `js/firebase-config.js`, o no se ha subido (commit + push). |
| "No se pudo iniciar sesión" / `auth/admin-restricted-operation` | Activa el inicio de sesión **Anónimo** en Authentication. |
| `auth/unauthorized-domain` | Authentication → Configuración → *Dominios autorizados* → añade `TU-USUARIO.github.io`. |
| `permission-denied` | No se han publicado las reglas de `firestore.rules`. |
| "No encuentro ese hogar" | El código o el enlace está incompleto. Pide que te lo reenvíen. |

## Estructura

```
index.html              Estructura de la página
css/styles.css          Estilos (modo claro y oscuro)
js/app.js               Pantallas y acciones
js/logic.js             Rotación A/B, puntos y tareas iniciales (del Excel)
js/store.js             Conexión con Firebase (lectura/escritura en tiempo real)
js/firebase-config.js   ← aquí va vuestra configuración
sw.js                   Funcionamiento sin conexión
manifest.webmanifest    Datos para instalarla como app
firestore.rules         Reglas de seguridad para pegar en Firebase
firebase.json           Solo para pruebas locales con el emulador (opcional)
```

Datos en Firestore: `households/{código}` → `tasks/*` (tareas), `weeks/{lunes}` (hechas, intercambios, «no hace falta» y notas de cada semana) `profiles/{persona}` (fotos) y `meals/*` (tápers).

## Ideas para la versión 2

- Lista de la compra compartida por categorías (la 3.ª pestaña del Excel).
- Notificaciones ("Laura te ha pedido un cambio").
- Tareas con frecuencia distinta a la semanal (cambiar sábanas cada 2 semanas, limpiar nevera al mes…).
