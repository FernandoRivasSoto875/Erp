// js/formulariodinamico.js
// KEEP: Revisado y listo para commit. Lógica de modo diseño, drag & drop, undo/redo y editor visual del formulario dinámico.
// Lógica de modo diseño, drag & drop, undo/redo, y utilidades para el formulario dinámico

$(document).ready(function() {
    // --- LÓGICA DEL MODO DISEÑO (CORREGIDA Y MEJORADA) ---
    const designModeToggle = $('#designModeToggle');
    const saveLayoutBtn = $('#saveLayoutBtn');
    const undoBtn = $('#undoBtn');
    const redoBtn = $('#redoBtn');
    const body = $('body');
    let sortableInstances = [];

    // --- Sistema de Historial para Undo/Redo ---
    let history = [];
    let historyIndex = -1;
    const formContainer = document.getElementById('formulariodinamico');

    function saveState() {
        if (!formContainer) return;
        const currentState = formContainer.innerHTML;
        if (historyIndex > -1 && history[historyIndex] === currentState) return;
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        history.push(currentState);
        historyIndex++;
        updateUndoRedoButtons();
    }

    function restoreState(index) {
        if (!formContainer) return;
        if (index >= 0 && index < history.length) {
            formContainer.innerHTML = history[index];
            disableDesignMode(false);
            enableDesignMode(false);
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState(historyIndex);
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            restoreState(historyIndex);
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.prop('disabled', historyIndex <= 0);
        redoBtn.prop('disabled', historyIndex >= history.length - 1);
    }

    undoBtn.on('click', undo);
    redoBtn.on('click', redo);

    // --- Lógica Principal del Modo Diseño ---

    function enableDesignMode(doSaveState = true) {
        body.addClass('design-mode');
        $('#paletas-modo-diseno').show();
        saveLayoutBtn.show();
        undoBtn.show();
        redoBtn.show();
        $('.edit-icon, .tab-block-handle, .edit-tab-icon, .add-tab-button').show();

        // Deshabilitar solo el submit en modo diseño
        $('form#formulariodinamico button[type="submit"]').prop('disabled', true);

        if ($('select.form-control').data('select2')) {
            $('select.form-control').select2('destroy');
        }

        // 1) Fieldsets: mover grupos entre columnas y panes de tabs + parking
        document.querySelectorAll('[data-col-width], [data-dropzone="tab-pane"], #elementos-fuera-container').forEach(container => {
            sortableInstances.push(Sortable.create(container, {
                group: { name: 'fieldsets', pull: true, put: true },
                animation: 150,
                ghostClass: 'sortable-ghost',
                draggable: '.draggable-fieldset',
                handle: 'legend, [data-fieldset-title], .draggable-fieldset',
                onEnd: () => {
                    saveState();
                    if (window.DnDFormBuilder && window.DnDFormBuilder.saveDesign) {
                        window.DnDFormBuilder.saveDesign();
                    } else if (typeof actualizarJsonDesdeUI === 'function') {
                        actualizarJsonDesdeUI();
                    }
                }
            }));
        });

        // 2) Campos: mover campos dentro y entre fieldsets
        document.querySelectorAll('.sortable-fields-container, #elementos-fuera-container').forEach(container => {
            sortableInstances.push(Sortable.create(container, {
                group: { name: 'fields', pull: true, put: true },
                animation: 150,
                ghostClass: 'sortable-ghost',
                draggable: '.draggable-field',
                onEnd: () => {
                    saveState();
                    if (window.DnDFormBuilder && window.DnDFormBuilder.saveDesign) {
                        window.DnDFormBuilder.saveDesign();
                    } else if (typeof actualizarJsonDesdeUI === 'function') {
                        actualizarJsonDesdeUI();
                    }
                }
            }));
        });

        // 3) Pestañas: reordenar pestañas y sincronizar panes
        document.querySelectorAll('ul.nav[role="tablist"]').forEach(tabsList => {
            sortableInstances.push(Sortable.create(tabsList, {
                group: 'tabs',
                animation: 150,
                draggable: '.nav-item:not(.add-tab-button)',
                handle: '.nav-link',
                filter: '.add-tab-button',
                onEnd: () => {
                    const block = tabsList.closest('[data-block-type="tabs"]');
                    if (!block) return;
                    const content = block.querySelector('.tab-content');
                    if (!content) return;
                    const ids = Array.from(tabsList.querySelectorAll('.nav-link'))
                        .map(a => (a.getAttribute('href') || '').replace('#',''))
                        .filter(Boolean);
                    ids.forEach(id => {
                        const pane = content.querySelector('#'+CSS.escape(id));
                        if (pane) content.appendChild(pane);
                    });
                    saveState();
                    if (window.DnDFormBuilder && window.DnDFormBuilder.saveDesign) {
                        window.DnDFormBuilder.saveDesign();
                    } else if (typeof actualizarJsonDesdeUI === 'function') {
                        actualizarJsonDesdeUI();
                    }
                }
            }));
        });

        // Paleta de componentes (fieldsets clonables)
        const paletaComponentes = document.getElementById('paleta-componentes');
        if (paletaComponentes) {
            sortableInstances.push(Sortable.create(paletaComponentes, {
                group: { name: 'fieldsets', pull: 'clone', put: false },
                sort: false,
                animation: 150,
                handle: '.handle, [data-fieldset-title]',
                draggable: '.draggable-fieldset',
                onStart: (evt) => evt.item.classList.add('sortable-ghost'),
                onEnd:   (evt) => { evt.item.classList.remove('sortable-ghost'); saveState(); }
            }));
        }

        // Paleta de tipos de control (campos clonables)
        document.querySelectorAll('#paleta-tipos-control .draggable-tipo').forEach(el => {
            Sortable.create(el, {
                group: { name: 'new-fields', pull: 'clone', put: false },
                sort: false,
                animation: 150,
                handle: '.handle',
                onStart: () => el.classList.add('sortable-ghost'),
                onEnd:   () => { el.classList.remove('sortable-ghost'); /* abrir editor de nuevo campo aquí si aplica */ }
            });
        });

        if (doSaveState) saveState();
        updateUndoRedoButtons();
    }

    function disableDesignMode(reinitNormal = true) {
        body.removeClass('design-mode');
        $('#paletas-modo-diseno').hide();
        saveLayoutBtn.hide();
        undoBtn.hide();
        redoBtn.hide();
        $('.edit-icon, .tab-block-handle, .edit-tab-icon, .add-tab-button').hide();

        // Rehabilitar el submit en modo normal
        $('form#formulariodinamico button[type="submit"]').prop('disabled', false);

        sortableInstances.forEach(s => s.destroy());
        sortableInstances = [];
        if (reinitNormal) {
            inicializarLogicaFormulario();
        }
    }
    
    // --- Eventos de los Botones ---
    // Al cambiar el toggle, recargar con el query param modoDiseno=1|0
    designModeToggle.on('change', function() {
        const url = new URL(window.location.href);
        url.searchParams.set('modoDiseno', this.checked ? '1' : '0');
        window.location.href = url.toString();
    });

    // Lógica para editar el nombre de la pestaña
    $(document).on('click', '.edit-tab-icon', function() {
        if (!body.hasClass('design-mode')) return;
        const navLink = $(this).closest('.nav-item').find('a.nav-link');
        const oldTitle = navLink.text();
        
        Swal.fire({
            title: 'Editar nombre de la pestaña',
            input: 'text',
            inputValue: oldTitle,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const newTitle = result.value;
                navLink.text(newTitle);
                const paneId = navLink.attr('href');
                $(paneId).attr('data-tab-title', newTitle);
                saveState();
                if (window.DnDFormBuilder && window.DnDFormBuilder.saveDesign) {
                    window.DnDFormBuilder.saveDesign();
                } else if (typeof actualizarJsonDesdeUI === 'function') {
                    actualizarJsonDesdeUI();
                }
            }
        });
    });

    // Lógica para añadir una nueva pestaña
    $(document).on('click', '.add-tab-button', function(e) {
        e.preventDefault();
        if (!body.hasClass('design-mode')) return;

        Swal.fire({
            title: 'Nueva pestaña',
            input: 'text',
            inputPlaceholder: 'Nombre de la nueva pestaña',
            showCancelButton: true,
            confirmButtonText: 'Crear',
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const newTitle = result.value;
                const tabList = $(this).closest('ul.nav[role="tablist"]');
                const tabContent = tabList.next('.tab-content');
                const newId = 'tab-' + Date.now();

                const newTabLink = `
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" id="${newId}-link" data-toggle="pill" href="#${newId}-pane" role="tab" aria-controls="${newId}-pane" aria-selected="false">${newTitle}</a>
                        <span class="edit-tab-icon edit-icon" style="display:inline-block;"><i class="fas fa-pencil-alt"></i></span>
                    </li>`;
                
                const newTabPane = `
                    <div class="tab-pane fade" id="${newId}-pane" role="tabpanel" aria-labelledby="${newId}-link" data-tab-title="${newTitle}">
                        <!-- Área para soltar elementos -->
                    </div>`;

                $(this).before(newTabLink);
                tabContent.append(newTabPane);

                disableDesignMode(false);
                enableDesignMode(true);
            }
        });
    });

    // Lógica para editar el título del formulario (persistir en editar_propiedades.php)
    $(document).on('click', '[data-edit="form-title"]', function() {
        if (!body.hasClass('design-mode')) return;
        const titleEl = $('#form-title');
        const oldTitle = titleEl.clone().children().remove().end().text().trim(); // solo texto, sin icono
        Swal.fire({
            title: 'Título del formulario',
            input: 'text',
            inputValue: oldTitle,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const newTitle = result.value;
                const archivo = (window.FORM_CONFIG && window.FORM_CONFIG.archivo_json) || '';
                $.post('editar_propiedades.php', { archivo, tipo:'form', titulo: newTitle })
                 .done(resp => {
                    if (resp && resp.success) {
                        const icon = titleEl.find('.edit-icon').detach();
                        titleEl.text(newTitle).append(icon);
                        saveState();
                        Swal.fire('OK','Actualizado','success');
                    } else {
                        Swal.fire('Error', (resp && resp.error) || 'No se pudo actualizar', 'error');
                    }
                 })
                 .fail(xhr => Swal.fire('Error', (xhr.responseJSON && xhr.responseJSON.error) || 'Error de red', 'error'));
            }
        });
    });

    // --- LÓGICA DEL EDITOR VISUAL DE PROPIEDADES ---
    function abrirEditorPropiedades(tipo, datos, onGuardar) {
        // tipo: 'field', 'fieldset', 'tab'
        // datos: objeto con las propiedades actuales (puede estar vacío para nuevo)
        // onGuardar: callback(datosActualizados)
        let html = '';
        if (tipo === 'field') {
            html += '<div class="form-group">';
            html += '<label>Tipo de campo</label>';
            html += '<select class="form-control" name="tipo">';
            const tipos = ['text','textarea','number','email','password','select','selectdata','radio','checkbox','file','date','datatable','hidden'];
            tipos.forEach(t => {
                html += `<option value=\"${t}\" ${datos.tipo===t?'selected':''}>${t}</option>`;
            });
            html += '</select></div>';
            html += '<div class="form-group"><label>Nombre</label><input class="form-control" name="nombre" value="'+(datos.nombre||'')+'" required></div>';
            html += '<div class="form-group"><label>Etiqueta</label><input class="form-control" name="etiqueta" value="'+(datos.etiqueta||'')+'"></div>';
            html += '<div class="form-group"><label>Placeholder</label><input class="form-control" name="placeholder" value="'+(datos.placeholder||'')+'"></div>';
            html += '<div class="form-group"><label>Valor predeterminado</label><input class="form-control" name="valor_predeterminado" value="'+(datos.valor_predeterminado||'')+'"></div>';
            html += '<div class="form-group"><label>Atributos (JSON)</label><input class="form-control" name="atributos" value="'+(datos.atributos?JSON.stringify(datos.atributos):'')+'"></div>';
            html += '<div class="form-group"><label>Opciones (JSON para select/radio/checkbox)</label><input class="form-control" name="opciones" value="'+(datos.opciones?JSON.stringify(datos.opciones):'')+'"></div>';
            html += '<div class="form-group"><label>Data-source/query (para selectdata)</label><input class="form-control" name="query" value="'+(datos.query||'')+'"></div>';
            html += '<div class="form-group"><label>Fórmula (para datatable/number)</label><input class="form-control" name="data-formula" value="'+(datos["data-formula"]||'')+'"></div>';
        } else if (tipo === 'fieldset') {
            html += '<div class="form-group"><label>Título</label><input class="form-control" name="titulo" value="'+(datos.titulo||'')+'" required></div>';
        } else if (tipo === 'tab') {
            html += '<div class="form-group"><label>Título de la pestaña</label><input class="form-control" name="title" value="'+(datos.title||'')+'" required></div>';
        }
        $('#editorPropiedadesBody').html(html);
        $('#editorPropiedadesModal').modal('show');
        $('#formEditorPropiedades').off('submit').on('submit', function(e){
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(this).entries());
            // Parsear atributos y opciones si corresponde
            if(formData.atributos){ try{ formData.atributos = JSON.parse(formData.atributos);}catch(e){formData.atributos={};} }
            if(formData.opciones){ try{ formData.opciones = JSON.parse(formData.opciones);}catch(e){formData.opciones={};} }
            if(formData["data-formula"]){ formData["data-formula"] = formData["data-formula"]; }
            $('#editorPropiedadesModal').modal('hide');
            if(onGuardar) onGuardar(formData);
        });
    }

    // *** CAMBIO REALIZADO: Nueva función para inicializar la lógica del formulario normal ***
    // Esta función llama al código que está en `js/formulariodinamico.js`.
    function inicializarLogicaFormulario() {
        // Verificamos si la función `inicializarFormularioDinamico` existe en el script que acabamos de incluir.
        if (typeof inicializarFormularioDinamico === 'function') {
            const config = {
                archivo_json: window.FORM_CONFIG ? window.FORM_CONFIG.archivo_json : ''
            };
            // Ejecutamos la inicialización del formulario pasándole la configuración necesaria.
            inicializarFormularioDinamico(config);
        } else {
            console.warn('La función `inicializarFormularioDinamico` no se encontró en `js/formulariodinamico.js`. La funcionalidad interactiva puede no estar disponible.');
            // Fallback por si el otro script falla: inicializa al menos los Select2 básicos.
             $('.form-control').each(function() {
                if ($(this).is('select')) {
                    $(this).select2({
                        width: '100%'
                    });
                }
            });
        }
    }


    // --- Función defensiva para inicializar datatables y evitar errores de find sobre undefined ---
    function inicializarFormularioDinamico(config) {
        // Busca todos los fieldsets y campos tipo datatable en el DOM o en window.FORM_CONFIG si existe
        let fieldsets = window.FORM_CONFIG && window.FORM_CONFIG.fieldsets ? window.FORM_CONFIG.fieldsets : null;
        if (!fieldsets && typeof config === 'object' && config.archivo_json) {
            // Si tienes una variable global con el JSON cargado, úsala aquí
            // Si no, omite y solo protege el DOM
        }
        // Si tienes los datos en el DOM, puedes recorrerlos aquí
        // Protección defensiva para todos los datatable renderizados
        $("[data-tipo='datatable']").each(function() {
            let campo = $(this).data();
            if (!Array.isArray(campo.columnas)) {
                campo.columnas = [];
            }
        });
        // Si tienes lógica adicional para inicializar datatables, agrégala aquí
    }

    // *** CAMBIO REALIZADO: Se llama a la lógica del formulario al cargar la página ***
    inicializarLogicaFormulario();

    // --- Respetar modoDiseno del servidor al cargar ---
    if ($('body').hasClass('design-mode')) {
        designModeToggle.prop('checked', true);
        enableDesignMode();
    } else {
        designModeToggle.prop('checked', false);
        disableDesignMode();
    }
});

(function(){
    let history = [], idx = -1;
    function updateUndoRedoButtons() {
        const u = document.getElementById('undoBtn'), r = document.getElementById('redoBtn');
        if (!u || !r) return;
        u.style.display = idx > 0 ? '' : 'none';
        r.style.display = idx < history.length - 1 ? '' : 'none';
    }
    function saveState() {
        const cont = document.querySelector('[data-layout-container]');
        if (!cont) return;
        const html = cont.innerHTML;
        if (idx >= 0 && history[idx] === html) return;
        if (idx < history.length - 1) history = history.slice(0, idx + 1);
        history.push(html); idx++; updateUndoRedoButtons();
    }
    function restore(i) {
        const cont = document.querySelector('[data-layout-container]');
        if (!cont) return;
        if (i >= 0 && i < history.length) { cont.innerHTML = history[i]; idx = i; updateUndoRedoButtons(); }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const body = document.body;
        if (body.classList.contains('design-mode')) saveState();
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.addEventListener('click', () => restore(idx - 1));
        if (redoBtn) redoBtn.addEventListener('click', () => restore(idx + 1));
    });
    window.__designHistory = { saveState };
})();
