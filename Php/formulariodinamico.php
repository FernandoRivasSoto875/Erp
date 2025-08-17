<?<?php
/*

COPILOT_PROMPT (Lineamientos y requisitos para cualquier cambio en este archivo)

NUEVA FUNCIONALIDAD: Campo tipo "embevido"
-------------------------------------------
Debe permitir agregar un campo con:
  - "tipo": "embevido"
  - "etiqueta": "Contenido Embebido"
  - "url_embebido": URL o ruta local del recurso a mostrar (página web, archivo HTML, archivo local)
  - "parametros_embebido": objeto con parámetros clave-valor que se enviarán al recurso embebido (por ejemplo, como query string)
  - "alto": altura en px o % (opcional)
  - "ancho": ancho en px o % (opcional)
  - "mostrar_borde": booleano (opcional, para mostrar borde en el iframe)
  - "permitir_fullscreen": booleano (opcional, para permitir pantalla completa)

El render debe crear un <iframe> con la URL y parámetros, aplicar alto/ancho, borde y fullscreen según las propiedades.

Ejemplo de campo en el JSON:
{
  "nombre": "contenido_embebido",
  "tipo": "embevido",
  "etiqueta": "Contenido Embebido",
  "url_embebido": "https://www.ejemplo.com/archivo.html",
  "parametros_embebido": { "usuario": "123", "token": "abc" },
  "alto": "400px",
  "ancho": "100%",
  "mostrar_borde": true,
  "permitir_fullscreen": true
}

Esta funcionalidad debe estar soportada en el renderizador JS y en el JSON.

NUEVA PROPIEDAD: FormularioDataSourcePrincipal en 'parametros' del JSON
-----------------------------------------------------------------------
Agrega la propiedad "FormularioDataSourcePrincipal" dentro del objeto "parametros" del JSON principal.
Su función es definir el modo de operación del formulario:
  - Si está vacía (""): el formulario es de entrada de datos libre, no interactúa con la base de datos.
  - Si contiene un valor (por ejemplo, "Cliente"): el formulario interactúa directamente con la base de datos indicada.
Esto permite distinguir si el formulario debe operar en modo libre o vinculado a una entidad de BD.

Ejemplo en el JSON:
"parametros": {
  ...
  "FormularioDataSourcePrincipal": "Cliente"
}

El render y la lógica deben respetar este comportamiento.

Objetivo:
Mantener este archivo SOLO como orquestador (vista): carga JSON, pasa datos a helpers y pinta HTML mínimo.
NO agregar aquí: lógica de negocio, funciones PHP nuevas, CSS inline, ni JS inline.

Ubicación de cada tipo de código:


NUEVA FUNCIONALIDAD: Campo tipo "datatable"
-------------------------------------------
Debe permitir agregar un campo con:
  - "tipo": "datatable"
  - "etiqueta": "Datatable"
  - "columnas": array de columnas (cada una con nombre, etiqueta, tipo, opciones, etc.)
  - "busqueda_simple": "enable" para mostrar búsqueda rápida
  - "filtro_avanzado": "enable" para mostrar filtros avanzados
  - "sumar_columnas": array con nombres de columnas a sumar
  - "dataSource": objeto con "tabla" (opcional, si se conecta a BD)

Requisitos:
- El datatable debe funcionar con todas sus funcionalidades (CRUD, búsqueda, filtro, suma) y mostrar controles siempre, sin importar si tiene "tabla" asociada.
- Si "dataSource.tabla" está vacío o no definido, el datatable debe funcionar como formulario libre, permitiendo al usuario agregar, editar y eliminar filas manualmente.
- Si "dataSource.tabla" está definido, debe cargar y sincronizar datos con la BD.
- Las columnas pueden ser de cualquier tipo soportado (text, number, select, date, checkbox, etc.).
- La suma de columnas debe calcularse y mostrarse en el pie del datatable.
- El render JS debe soportar ambos modos (libre y BD) sin perder funcionalidad.

Ejemplo de campo en el JSON:
{
  "nombre": "detalle_productos",
  "tipo": "datatable",
  "etiqueta": "Producto",
  "busqueda_simple": "enable",
  "filtro_avanzado": "enable",
  "sumar_columnas": ["precio", "cantidad"],
  "columnas": [
    { "nombre": "producto", "etiqueta": "Producto", "tipo": "text" },
    { "nombre": "precio", "etiqueta": "Precio", "tipo": "number" },
    { "nombre": "cantidad", "etiqueta": "Cantidad", "tipo": "number" },
    { "nombre": "total_linea", "etiqueta": "Total", "tipo": "number" }
  ],
  "dataSource": { "tabla": "" }
}

Esta funcionalidad debe estar soportada en el renderizador JS y en el JSON.
- Lógica específica adicional (validaciones, serialización, etc.): formulariodinamicologica.php (si aplica).
- JavaScript (cualquier nuevo comportamiento): js/formulariodinamico.js (extender sin borrar funciones que ya funcionen).
- Estilos / diseño: css/formulariodinamico.css.
- JSON fuente: carpeta /json (no hardcodear estructuras aquí).
- Mantenedor del Árbol JSON (micro‑app separada): arboljson/ (index.php, css/, js/).
  * Micro‑app encapsula HTML/CSS/JS para explorar / editar parametros, fieldsets y layout.
  * Integración: contenedor #fd-json-tree-app (iframe o montaje dinámico).
  * Comunicación: postMessage, namespace FD, o endpoints AJAX.

UX / Embellecimiento:
- Siempre usar la última versión estable de Bootstrap (actualizar link cuando proceda).
- Mejoras visuales SOLO vía css/formulariodinamico.css y utilidades Bootstrap (no inline aquí).
- Usar componentes y utilidades modernos: grid responsive, nav-tabs, botones outline, offcanvas/modals, tooltips, collapse, toast.
- Accesibilidad: incluir atributos ARIA / role cuando se añadan elementos interactivos (tabs, drag handles).
- Evitar dependencias extra innecesarias; priorizar utilidades Bootstrap + CSS propio con prefijo .fd-.
- Cualquier “embellecer” debe ser progresivo (no romper funcionalidad si falla JS).

Separación de modos y funcionalidades:
- Modo normal: solo muestra el formulario para el usuario final, sin controles de edición ni DnD.
- Botón tipo círculo "Diseño": activa el modo diseño.
- Al activar modo diseño, aparecen dos botones flotantes:
   - "Diseño Árbol": permite editar la estructura desde el árbol JSON y arrastrar objetos en el formulario.
   - "Diseño Formulario": permite editar directamente el formulario con DnD y arrastrar objetos.
- Ambos modos de diseño permiten arrastrar y editar objetos en el formulario, cada uno con su enfoque.
- El modo diseño alterna sin recargar datos base, solo re-renderiza o aplica clases.
- Solo los controles relevantes al modo diseño están visibles; no hay duplicidad de controles.

Modo Diseño (siempre activable/desactivable):
- Activación: checkbox #designModeToggle y/o query ?modoDiseno=1 (sin estado ambiguo).
- Debe poder alternar sin recargar datos base (solo re-render / clases).
- Al entrar en modo diseño, destacar contenedores con clases .fd-editable / .fd-draggable si aplica.

Reglas antes de modificar:
0. REVISAR Y CONSERVAR FUNCIONALIDAD EXISTENTE: antes de agregar código nuevo, revisar tabs, árbol, DnD, guardado, render de fieldsets; solo complementar. PROHIBIDO eliminar, comentar o degradar funcionalidad existente salvo bug confirmado; en ese caso marcar // DEPRECATED, justificar y mantener wrapper/compatibilidad temporal.
1. Revisar primero lógica existente (formulariodinamico.js, formulariodinamicofunciones.php, arboljson/*).
2. Mantener compatibilidad retro o crear wrapper / alias temporal.
3. No renombrar IDs / clases usadas por JS sin actualizar todo (incluida micro‑app).
4. Mantener contrato JSON (solo ampliar tolerantemente).
5. Eliminaciones: marcar // DEPRECATED si no críticas, conservar breve periodo si hay riesgo.
6. Sin echo/print debug permanentes.
7. Sin SQL / includes extra aquí.
8. Evitar duplicar includes/require.
9. Sanitizar salida (htmlspecialchars) siempre.
10. Commits/PR atómicos (render / JS / CSS / refactor / integración árbol).
11. Integración árbol: aquí solo contenedor #fd-json-tree-app (no markup interno).
12. CONSISTENCIA DE LLAMADOS: verificar includes, data-* (#fd-data), scripts (Sortable + formulariodinamico.js), contenedor micro‑app y funciones clave (fd_render_layout_fallback) existen y JSON decodifica (json_last_error()==JSON_ERROR_NONE).
13. Modo diseño debe seguir operando (toggle + DnD + árbol) tras cualquier cambio.
14. NO cambiar el diseño  a no ser qexplictamente cambios en <div class="css"></div>
Validaciones al finalizar:
15 Siempre verifica que todo quede de forma responsiva.
- php -l formulariodinamico.php sin errores.
- Sin nuevos <style> ni <script> inline.
16.- Si hay algo que no puedes hacer, por restringcion del prompt, indicamelo, indicame que debemos agregar en el prompt.

Resumen (TL;DR):
Archivo de vista. NO lógica / NO JS / NO CSS aquí. Mantener modo diseño operativo (toggle + dos vías de edición). Embellecer usando Bootstrap moderno + CSS externo. Revisar consistencia (punto 12/13) y NO eliminar funcionalidad existente (regla 0).

---

COPILOT_PROMPT (Complemento: Requisitos para rediseño en tiempo de ejecución por el usuario final)

Objetivo de rediseño en runtime:
- Permitir al usuario final modificar la estructura, campos, layout y propiedades del formulario en tiempo real, sin recargar la página ni perder datos.
- Todas las acciones de edición deben ser visuales, intuitivas y reversibles (undo/redo).
- El sistema debe reflejar los cambios inmediatamente en la UI y en el JSON fuente.

Características obligatorias:
- Botones flotantes para alternar entre "Diseño Formulario" y "Diseño Árbol" siempre visibles en modo diseño.
- Edición visual de layout y campos mediante DnD, tooltips, modals y controles contextuales.
- Edición estructural avanzada vía micro-app árbol JSON (arboljson/), con sincronización bidireccional.
- Guardado inmediato o diferido de cambios en el JSON fuente, con validación y feedback visual.
- Accesibilidad: todos los controles editables deben tener ARIA roles y feedback visual.
- Animaciones y transiciones suaves para cambios de modo, DnD y edición.
- Soporte para deshacer/rehacer cambios (undo/redo) en ambas vías de edición.
- Sin duplicidad de controles ni estados ambiguos; solo los controles relevantes al modo activo visibles.
- El usuario puede alternar entre modos de edición sin perder el estado actual ni recargar datos base.
- El layout y los fieldsets deben poder reordenarse, agruparse y editarse en tiempo real.
- Todas las modificaciones deben actualizar el JSON fuente y reflejarse en la UI instantáneamente.

Interacciones clave:
- Botón flotante "Diseño Formulario": activa edición directa con DnD y controles contextuales.
- Botón flotante "Diseño Árbol": abre micro-app árbol JSON para edición estructural avanzada.
- Guardar: botón visible en modo diseño, guarda el estado actual en el JSON fuente.
- Alternar modo diseño: checkbox y/o query ?modoDiseno=1, sin recarga ni pérdida de datos.
- Feedback visual: toast, alertas, tooltips y animaciones para cada acción relevante.

Validaciones y consistencia:
- Todas las reglas del bloque principal siguen vigentes y tienen prioridad.
- Este complemento solo amplía requisitos para runtime redesign y UX avanzada.
- No eliminar ni degradar instrucciones previas; solo complementar y detallar.
- Revisar consistencia de integración, contratos JSON y compatibilidad retro.

Resumen:
Este bloque complementa el prompt principal, detallando requisitos para rediseño en tiempo de ejecución por el usuario final. Mantener estricta separación de responsabilidades, UX moderna y edición visual/estructural robusta, sin perder ninguna funcionalidad existente.
*/
require_once __DIR__ . '/formulariodinamicofunciones.php';
if (!function_exists('fd_render_layout_fallback')) {
  function fd_render_layout_fallback(){ return '<div class="alert alert-danger">Helper fd_render_layout_fallback no disponible.</div>'; }
}
?>
<body class="<?= $modoDiseno ? 'fd-design-mode' : '' ?>">
  <!-- IMPORTANTE: Revisar el bloque COPILOT_PROMPT al inicio de este archivo para TODOS los lineamientos, reglas y requisitos de rediseño runtime. -->
  <div class="container-fluid py-2">
    <div class="d-flex justify-content-between align-items-center mb-3 design-toolbar">
      <div>
        <h4 class="m-0" id="fd-form-title"><?= htmlspecialchars($titulo_formulario) ?></h4>
        <?php if ($descripcion_formulario): ?>
          <small class="text-muted" id="fd-form-desc"><?= htmlspecialchars($descripcion_formulario) ?></small>
        <?php endif; ?>
      </div>
      <div class="d-flex align-items-center gap-2">
        <label class="form-check form-switch m-0">
          <input type="checkbox" class="form-check-input" id="designModeToggle" <?= $modoDiseno ? 'checked' : '' ?> aria-label="Activar modo diseño">
          <span class="form-check-label">Diseño</span>
        </label>
        <button type="button" class="btn btn-sm btn-outline-secondary <?= $modoDiseno ? '' : 'd-none' ?>" id="toggleTreeBtn">Árbol</button>
        <button type="button" class="btn btn-sm btn-primary <?= $modoDiseno ? '' : 'd-none' ?>" id="saveLayoutBtn" <?= $modoDiseno ? '' : 'disabled' ?>>Guardar</button>
      </div>
    </div>

    <!-- Botones flotantes para alternar vistas -->
    <div id="fd-float-btns" style="position:fixed;bottom:32px;right:32px;z-index:9999;display:flex;flex-direction:column;gap:12px;">
      <button id="btnShowTree" class="btn btn-outline-secondary shadow">Diseño Árbol</button>
      <button id="btnShowForm" class="btn btn-outline-primary shadow">Diseño Formulario</button>
    </div>

    <div class="fd-shell">
      <div class="fd-form-area">
        <form id="formulariodinamico" data-layout-container class="mb-4">
          <div id="formulariodinamico"></div>
          <div class="mt-3">
            <?php foreach ($botones_config as $b):
              $txt    = htmlspecialchars($b['texto'] ?? 'Botón');
              $accion = $b['accion'] ?? 'submit';
              $cls    = htmlspecialchars($b['clase'] ?? 'btn-secondary');
              $type   = ($accion === 'reset' ? 'reset' : 'submit'); ?>
              <button type="<?= $type ?>" class="btn <?= $cls ?>"><?= $txt ?></button>
            <?php endforeach; ?>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Contenedor del árbol y nodo de datos -->
  <div id="fd-json-tree-app" class="<?= $modoDiseno ? '' : 'd-none' ?>" data-tree-app></div>
  <div id="fd-data"
       data-json-file="<?= htmlspecialchars($archivo_base ?? 'formulariogenerico2.json') ?>"
       data-form-json='<?= htmlspecialchars(json_encode($json_data ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8") ?>'></div>

  <!-- Scripts requeridos -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
  <script src="js/formulariodinamico.js"></script>
  <script src="js/formulariodinamico-float.js"></script>
  <script>
    // Carga el JSON desde el atributo data-form-json
    (function(){
      var fdData = document.getElementById('fd-data');
      if(fdData && fdData.getAttribute('data-form-json')){
        try {
          window.formularioJsonOriginal = JSON.parse(fdData.getAttribute('data-form-json'));
        } catch(e){ window.formularioJsonOriginal = {}; }
      }
    })();
  </script>
</body>
</html>
 
