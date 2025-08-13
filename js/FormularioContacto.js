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

Validaciones al finalizar:
- php -l formulariodinamico.php sin errores.
- Sin nuevos <style> ni <script> inline.

Resumen (TL;DR):
Archivo de vista. NO lógica / NO JS / NO CSS aquí. Mantener modo diseño operativo (toggle + dos vías de edición). Embellecer usando Bootstrap moderno + CSS externo. Revisar consistencia (punto 12/13) y NO eliminar funcionalidad existente (regla 0).
*/
?>
// File: js/FormularioContacto.js
// KEEP: Revisado y listo para commit. Cambios recientes validados.
$(document).ready(function() {
    // Inicializar todos los campos Select2
    $('.select2-field').each(function() {
        const tabla = $(this).data('tabla');
        const campo = $(this).data('campo');
        
        $(this).select2({
            placeholder: $(this).data('placeholder') || 'Seleccione una opción',
            allowClear: true,
            ajax: {
                url: 'ajax/busqueda_select2.php',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        q: params.term, // término de búsqueda
                        tabla: tabla,
                        campo: campo
                    };
                },
                processResults: function (data) {
                    // Transforma la data al formato que Select2 espera
                    return {
                        results: data
                    };
                },
                cache: true
            },
            minimumInputLength: 1,
            language: "es" // Asegúrate de tener el archivo de idioma de Select2 si es necesario
        });
    });

    // Activar tooltips de Bootstrap
    $('[data-toggle="tooltip"]').tooltip();
});
