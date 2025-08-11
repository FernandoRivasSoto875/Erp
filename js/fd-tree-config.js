window.fdTreeConfig = {
  // raíz del árbol
  root: '#json-tree-panel',

  // el nodo contenedor “Campos” (el bloque que agrupa los campos)
  fieldsContainer: '[data-node="fields"]',

  // la lista real donde van los hijos “Campo”
  fieldsList: 'ul',            // ajusta si usas .children/.nodes/etc.
  fieldsListClass: 'node-fields-list',

  // cada ítem “Campo” del árbol
  fieldItem: '[data-node="field"]',
  fieldHandle: '.handle', // o deja vacío si no hay handle

  // cada “Grupo” del árbol (padre de “Campos”)
  groupItem: '[data-node="group"]',

  // atributos con los ids reales
  fieldIdAttr: 'data-id',      // en el nodo “Campo”
  groupIdAttr: 'data-id'       // en el nodo “Campos” o su UL
};