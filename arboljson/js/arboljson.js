// Lógica centralizada para alternar vistas y modo diseño en arboljson/index.php
(function(w,d){
  'use strict';
  var btnTree = d.getElementById('btnShowTree');
  var btnForm = d.getElementById('btnShowForm');
  var treePane = d.getElementById('treePane');
  var formPane = d.getElementById('formPane');
  var designMode = false;

  function setDesignMode(on){
    designMode = !!on;
    d.body.classList.toggle('fd-design-mode', designMode);
    // Feedback visual
    [btnTree, btnForm].forEach(function(b){
      if(b) b.classList.toggle('btn-active', designMode);
    });
    // Activar DnD si es diseño y Sortable está disponible
    if(designMode && typeof Sortable!=='undefined'){
      d.querySelectorAll('#formulariodinamico .row').forEach(function(row){
        if(row.dataset.fdColsSortable) return;
        Sortable.create(row,{ group:'fd-cols', draggable:'> [class*="col-"]', animation:150 });
        row.dataset.fdColsSortable='1';
      });
      d.querySelectorAll('#formulariodinamico fieldset').forEach(function(fs){
        if(fs.dataset.fdFieldsSortable) return;
        Sortable.create(fs,{ group:'fd-fields', draggable:'.form-group', filter:'legend', animation:120 });
        fs.dataset.fdFieldsSortable='1';
      });
    }
  }

  if(btnTree) btnTree.onclick = function(){
    treePane.style.display = '';
    formPane.style.display = 'none';
    setDesignMode(false);
  };
  if(btnForm) btnForm.onclick = function(){
    treePane.style.display = 'none';
    formPane.style.display = '';
    setDesignMode(true);
  };

  // Inicialización: por defecto mostrar árbol
  treePane.style.display = '';
  formPane.style.display = 'none';

})(window,document);
