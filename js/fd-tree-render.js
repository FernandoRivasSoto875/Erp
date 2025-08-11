(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function pickFieldsContainer(base){
    if (!base) return null;
    if (base.matches('table')) return base.tBodies[0]||base;
    return base.querySelector(':scope > .card-body, :scope > .panel-body, :scope > .accordion-body, :scope > .fd-fields-container, :scope > .list-group, :scope > .container, :scope > .row') || base;
  }
  function isGroup(el){
    return el && el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset');
  }
  function isFieldWrapperDirect(el){
    if (!el || /^(SCRIPT|STYLE)$/.test(el.tagName)) return false;
    if (el.matches('fieldset, .card, .panel, .accordion-item, [data-fieldset-name], .fd-fieldset')) return false;
    if (el.matches('.row,[class*="col-"],.col')) return false;
    return !!el.querySelector?.('input,select,textarea,[name],[data-name]');
  }
  function getGroupTitle(g){
    const t=g.querySelector(':scope > legend, :scope > .card-header, :scope > [data-fieldset-title]');
    if (t) return (t.textContent||'').trim()||'Grupo';
    return g.getAttribute('data-fieldset-name')||g.id||'Grupo';
  }
  function getGroupId(g){
    return g.getAttribute('data-group-id')||
           g.getAttribute('data-fieldset-name')||
           g.id||
           getGroupTitle(g).toLowerCase().replace(/\s+/g,'-');
  }
  function getFieldId(w){
    return w.getAttribute('data-field-id')||
           w.querySelector?.('[name]')?.getAttribute('name')||
           w.querySelector?.('[id]')?.getAttribute('id')||'';
  }
  function getFieldLabel(w){
    const lab=w.querySelector?.('label');
    if (lab) return (lab.textContent||'').trim();
    return w.querySelector?.('[name]')?.getAttribute('name')||'Campo';
  }

  function buildTree(){
    const panel = $('#json-tree-panel');
    const formRoot = $('#fd-root');
    if (!panel || !formRoot) return;
    panel.innerHTML='';

    const groups = $$('#fd-root fieldset, #fd-root .card, #fd-root .panel, #fd-root .fd-fieldset');
    if (!groups.length){
      panel.innerHTML='<div class="text-muted small">No hay grupos.</div>';
      return;
    }
    const ulRoot=document.createElement('ul');

    groups.forEach(g=>{
      if (!isGroup(g)) return;
      const gid = getGroupId(g);
      if (!g.getAttribute('data-group-id')) g.setAttribute('data-group-id', gid);

      const liGroup=document.createElement('li');
      liGroup.setAttribute('data-node','group');
      liGroup.setAttribute('data-id',gid);

      const title=document.createElement('div');
      title.className='title';
      title.textContent=getGroupTitle(g);
      liGroup.appendChild(title);

      const fieldsWrap=document.createElement('div');
      fieldsWrap.setAttribute('data-node','fields');
      fieldsWrap.setAttribute('data-id',gid);

      const list=document.createElement('ul');
      list.className='node-fields-list';
      list.setAttribute('data-id',gid);

      const body = pickFieldsContainer(g);
      const wrappers = body?Array.from(body.children).filter(isFieldWrapperDirect):[];
      wrappers.forEach(w=>{
        const fid = getFieldId(w);
        if (!fid) return;
        if (!w.getAttribute('data-field-id')) w.setAttribute('data-field-id', fid);
        const liField=document.createElement('li');
        liField.setAttribute('data-node','field');
        liField.setAttribute('data-id',fid);
        const handle=document.createElement('span');
        handle.className='handle';
        handle.textContent='⋮⋮';
        liField.appendChild(handle);
        liField.appendChild(document.createTextNode(' '+getFieldLabel(w)));
        list.appendChild(liField);
      });

      fieldsWrap.appendChild(list);
      liGroup.appendChild(fieldsWrap);
      ulRoot.appendChild(liGroup);
    });

    panel.appendChild(ulRoot);
    window.fdDndLiteRefresh && window.fdDndLiteRefresh();
  }

  window.renderJsonTreeFromForm = buildTree;

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildTree);
  else buildTree();

})();