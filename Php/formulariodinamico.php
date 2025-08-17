<?php
/*

COPILOT_PROMPT (Lineamientos y requisitos para cualquier cambio en este archivo)

NUEVA FUNCIONALIDAD: Campo tipo "embevido"
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
  "kkk"
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
Debe permitir agregar un campo con:
  - "tipo": "datatable"
  - "etiqueta": "Datatable"
  - "columnas": array de columnas (cada una con nombre, etiqueta, tipo, opciones, etc.)
  - "busqueda_simple": "enable" para mostrar búsqueda rápida
  - "filtro_avanzado": "enable" para mostrar filtros avanzados
  - "sumar_columnas": array con nombres de columnas a sumar
  - "dataSource": objeto con "tabla" (opcional, si se conecta a BD)

Requisitos:

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
  * Micro‑app encapsula HTML/CSS/JS para explorar / editar parametros, fieldsets y layout.
  * Integración: contenedor #fd-json-tree-app (iframe o montaje dinámico).
  * Comunicación: postMessage, namespace FD, o endpoints AJAX.

UX / Embellecimiento:

Separación de modos y funcionalidades:
   - "Diseño Árbol": permite editar la estructura desde el árbol JSON y arrastrar objetos en el formulario.
   - "Diseño Formulario": permite editar directamente el formulario con DnD y arrastrar objetos.

Modo Diseño (siempre activable/desactivable):

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
16.- Si hay algo que no puedes hacer, por restringcion del prompt, indicamelo, indicame que debemos agregar en el prompt.

Resumen (TL;DR):
Archivo de vista. NO lógica / NO JS / NO CSS aquí. Mantener modo diseño operativo (toggle + dos vías de edición). Embellecer usando Bootstrap moderno + CSS externo. Revisar consistencia (punto 12/13) y NO eliminar funcionalidad existente (regla 0).


COPILOT_PROMPT (Complemento: Requisitos para rediseño en tiempo de ejecución por el usuario final)

Objetivo de rediseño en runtime:

Características obligatorias:

Interacciones clave:

Validaciones y consistencia:

Resumen:
Este bloque complementa el prompt principal, detallando requisitos para rediseño en tiempo de ejecución por el usuario final. Mantener estricta separación de responsabilidades, UX moderna y edición visual/estructural robusta, sin perder ninguna funcionalidad existente.
*/
require_once __DIR__ . '/formulariodinamicologica.php';
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

