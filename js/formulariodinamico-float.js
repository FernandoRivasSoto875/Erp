// JS para alternar entre vista de árbol y formulario en formulariodinamico.php
// Leer COPILOT_PROMPT en formulariodinamicoprompt.txt.
(function(w,d){
  var btnTree = d.getElementById('btnShowTree');
  var btnForm = d.getElementById('btnShowForm');
  var treeApp = d.getElementById('fd-json-tree-app');
  var formArea = d.querySelector('.fd-form-area');

  function showTree(){
    if(treeApp) treeApp.style.display = '';
    if(formArea) formArea.style.display = 'none';
  }
  function showForm(){
    if(treeApp) treeApp.style.display = 'none';
    if(formArea) formArea.style.display = '';
  }

  if(btnTree) btnTree.onclick = showTree;
  if(btnForm) btnForm.onclick = showForm;

  // Por defecto mostrar solo el formulario
  showForm();
})(window,document);
