<?php
/*
COPILOT_PROMPT (Lineamientos para cualquier cambio en este archivo):

Objetivo:
Mantener este archivo SOLO como orquestador (vista): carga JSON, pasa datos a helpers y pinta HTML mínimo.
NO agregar aquí: lógica de negocio, funciones PHP nuevas, CSS inline, ni JS inline.

Ubicación de cada tipo de código:
- Lógica / helpers PHP existentes o nuevos: formulariodinamicofunciones.php (o archivo inc separado si crece).
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

Botones flotantes de alternancia:
- Deben existir dos botones flotantes siempre visibles: uno para alternar a "Diseño Árbol" y otro para "Diseño Formulario".
- "Diseño Árbol": muestra la micro-app del árbol JSON, donde se puede editar la estructura y arrastrar objetos en el formulario.
- "Diseño Formulario": muestra el formulario dinámico y permite arrastrar/editar objetos directamente en el formulario (DnD, WYSIWYG).
- Ambos modos permiten arrastrar objetos en el formulario, ya sea desde el árbol o directamente.

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

Validaciones al finalizar:
- php -l formulariodinamico.php sin errores.
- Sin nuevos <style> ni <script> inline.
- Consola sin errores JS (modo normal y diseño).
- Drag & Drop mueve elementos entre fieldsets/tabs correctamente (si habilitado).
- Guardado layout produce JSON consistente (layout actualizado).
- Micro‑app (si cargada) sincroniza cambios y no rompe formulario.
- Accesibilidad básica: tabs navegables con teclado, focus visible.

Formato para nuevas modificaciones:
- Solo añadir contenedores HTML mínimos.
- Prefijo fd- para clases nuevas.
- Lógica adicional → helpers / JS.
- Mejoras visuales → CSS externo.

Resumen (TL;DR):
Archivo de vista. NO lógica / NO JS / NO CSS aquí. Mantener modo diseño operativo (toggle + dos vías de edición). Embellecer usando Bootstrap moderno + CSS externo. Revisar consistencia (punto 12/13) y NO eliminar funcionalidad existente (regla 0).

--- PROMPT_VISIBILIDAD_CONTROLES_MODO_DISENO (Adición) ---
Requisito de visibilidad de controles:
- Los botones "Árbol" (#toggleTreeBtn) y "Guardar" (#saveLayoutBtn) deben mostrarse solo cuando el modo diseño está activo.
- En modo normal: deben permanecer ocultos con d-none y deshabilitados (disabled, aria-hidden="true").
- Al activar modo diseño: quitar d-none y disabled, y montar/mostrar el árbol automáticamente en la primera activación.
- Al desactivar: volver a ocultar y deshabilitar ambos; el árbol puede ocultarse.

Checklist (entrada al modo diseño):
[ ] body.fd-design-mode aplicado
[ ] Botones Árbol y Guardar visibles y habilitados
[ ] Árbol visible/cargado (iframe o fallback)
[ ] DnD activo y marcando dirty
Checklist (salida del modo diseño):
[ ] Botones ocultos y deshabilitados
[ ] Árbol oculto (opcional)
[ ] DnD inactivo/ignorado
--- FIN PROMPT_VISIBILIDAD_CONTROLES_MODO_DISENO ---

Fin del COPILOT_PROMPT.
*/
/* ADENDO: Panel árbol interno removido; usar micro‑app en #fd-json-tree-app. */

if (session_status() === PHP_SESSION_NONE) session_start();
header('Content-Type: text/html; charset=utf-8');

$modoDiseno = (isset($_GET['modoDiseno']) && $_GET['modoDiseno'] === '1');

$archivo_base = 'formulariogenerico2.json';
$json_path    = __DIR__ . DIRECTORY_SEPARATOR . 'json' . DIRECTORY_SEPARATOR . $archivo_base;
$json_text    = is_file($json_path) ? file_get_contents($json_path) : '{}';
$json_data    = json_decode($json_text, true);
if (!is_array($json_data)) { $json_data = []; }

$params    = $json_data['parametros'] ?? [];
$fieldsets = $json_data['fieldsets']  ?? [];
$layout    = $json_data['layout']     ?? [];

$titulo_formulario      = $params['titulo']     ?? 'Formulario Dinámico';
$descripcion_formulario = $params['comentario'] ?? ($json_data['descripcion'] ?? '');
$css_default            = $params['CssDefault'] ?? '';
$botones_config         = $params['botones']    ?? [];

require_once __DIR__ . '/formulariodinamicofunciones.php';
if (!function_exists('fd_render_layout_fallback')) {
    function fd_render_layout_fallback(){ return '<div class="alert alert-danger">Helper fd_render_layout_fallback no disponible.</div>'; }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title><?= htmlspecialchars($titulo_formulario) ?></title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <?php if ($css_default): ?>
    <link rel="stylesheet" href="css/<?= htmlspecialchars($css_default) ?>">
  <?php endif; ?>
  <link rel="stylesheet" href="css/formulariodinamico.css">
</head>
<body class="<?= $modoDiseno ? 'fd-design-mode' : '' ?>">
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
          <?= fd_render_layout_fallback($layout, $fieldsets); ?>
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
</body>
</html>

