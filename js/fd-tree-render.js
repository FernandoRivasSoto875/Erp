(function(){
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));

  // Detecta “body” de grupo
  function pickFieldsContainer(base){
    if (!base || base.nodeType!==1) return null;
    if (base.matches('table')) return (base.tBodies && base.tBodies[0]) || base;
    const body = base.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .accordion-body, :scope > .fd-fields-container, :scope > .list-group, :scope > .container, :scope > .row');
    return body || base;
  }
  // ¿Es un grupo?
  function isGroup(el){
    return !!el && el.matches && el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset');
  }
  // Wrappers válidos de campo (hijo directo)
  function isFieldWrapperDirect(el){
    if (!el || el.tagName==='SCRIPT' || el.tagName==='STYLE') return false;
    if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) return false;
    if (el.matches('.row, [class*="col-"], .col')) return false;
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }
  // Obtiene id de grupo
  function getGroupId(el){
    return el.getAttribute('data-group-id') || el.getAttribute('data-fieldset-name') || el.id || slug(getGroupTitle(el));
  }
  // Título de grupo
  function getGroupTitle(group){
    const t = group.querySelector(':scope > legend, :scope > .card-header, :scope > [data-fieldset-title]');
    if (t) return (t.textContent||'').trim() || 'Grupo';
    return (group.getAttribute('data-fieldset-name') || group.id || 'Grupo').trim();
  }
  // Id de campo desde wrapper/control
  function getFieldId(wrapper){
    return wrapper.getAttribute('data-field-id') ||
      wrapper.querySelector?.('[name]')?.getAttribute('name') ||
      wrapper.querySelector?.('[id]')?.getAttribute('id') || '';
  }
  // Texto de campo
  function getFieldLabel(wrapper){
    const lab = wrapper.querySelector?.('label');
    if (lab) return (lab.textContent||'').trim();
    const nm = wrapper.querySelector?.('[name]')?.getAttribute('name');
    return nm || 'Campo';
  }
  function slug(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9\-_.]+/g,''); }

  function buildTree(){
    const panel = $('#json-tree-panel');
    const formRoot = $('#fd-root');
    if (!panel || !formRoot) return;

    // Limpia
    panel.innerHTML = '';

    // Encuentra grupos visibles en el formulario
    const groups = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root .fd-fieldset');
    const ulRoot = document.createElement('ul');

    groups.forEach(group=>{
      if (!isGroup(group)) return;
      const gid = getGroupId(group);
      const gtitle = getGroupTitle(group);

      // Asegura que el grupo del form tenga data-group-id para el puente
      if (!group.getAttribute('data-group-id')) group.setAttribute('data-group-id', gid);

      const liGroup = document.createElement('li');
      liGroup.setAttribute('data-node', 'group');
      liGroup.setAttribute('data-id', gid);

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = gtitle;
      liGroup.appendChild(title);

      const fieldsWrap = document.createElement('div');
      fieldsWrap.setAttribute('data-node', 'fields');
      fieldsWrap.setAttribute('data-id', gid);

      const list = document.createElement('ul');
      list.className = 'node-fields-list';
      list.setAttribute('data-id', gid);

      // Obtener wrappers directos de campos dentro del body del grupo
      const body = pickFieldsContainer(group);
      const wrappers = body ? Array.from(body.children).filter(isFieldWrapperDirect) : [];

      wrappers.forEach(w=>{
        const fid = getFieldId(w);
        if (!fid) return;
        // Asegura que el wrapper del form tenga data-field-id para el puente
        if (!w.getAttribute('data-field-id')) w.setAttribute('data-field-id', fid);

        const liField = document.createElement('li');
        liField.setAttribute('data-node', 'field');
        liField.setAttribute('data-id', fid);

        const handle = document.createElement('span');
        handle.className = 'handle';
        handle.textContent = '⋮⋮';

        liField.appendChild(handle);
        liField.appendChild(document.createTextNode(' ' + getFieldLabel(w)));
        list.appendChild(liField);
      });

      fieldsWrap.appendChild(list);
      liGroup.appendChild(fieldsWrap);
      ulRoot.appendChild(liGroup);
    });

    panel.appendChild(ulRoot);

    // Toggle plegado
    panel.addEventListener('click', function(e){
      const t = e.target.closest('#json-tree-panel [data-node="group"] > .title');
      if (!t) return;
      t.parentElement.classList.toggle('collapsed');
    });

    // Reengancha DnD (tabs/grupos/campos y árbol)
    window.fdDndLiteRefresh && window.fdDndLiteRefresh();
  }

  // API pública
  window.renderJsonTreeFromForm = buildTree;

  // Render inicial
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildTree);
  else buildTree();

  // Re-render cuando cambia el formulario
  const root = document.getElementById('fd-root');
  if (root){
    const obs = new MutationObserver(()=> buildTree());
    obs.observe(root, { childList:true, subtree:true });
  }
})();