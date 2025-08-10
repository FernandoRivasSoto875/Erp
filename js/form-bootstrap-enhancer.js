(function(){
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));

  onReady(()=> enhanceAll());

  // Reejecuta si cambian nodos dentro del formulario (render dinámico)
  const mo = new MutationObserver(debounce(()=> enhanceAll(), 150));
  onReady(()=> {
    const root = $('#fd-root');
    if (root) mo.observe(root, { childList:true, subtree:true });
  });

  function onReady(cb){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
    else cb();
  }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  function enhanceAll(){
    const root = $('#fd-root');
    if (!root) return;
    enhanceFieldsets(root);
    enhanceControls(root);
    enhanceButtons(root);
    ensureTabsActive(root);
  }

  function enhanceFieldsets(root){
    // Convierte fieldset/legend a card/card-header/card-body
    $$('fieldset', root).forEach(fs=>{
      if (fs.dataset.bsEnhanced === '1') return;
      fs.dataset.bsEnhanced = '1';
      fs.classList.add('card','mb-3');

      // Legend -> card-header
      const legend = fs.querySelector(':scope > legend');
      if (legend){
        const header = document.createElement('div');
        header.className = 'card-header';
        header.append(...Array.from(legend.childNodes));
        legend.replaceWith(header);
      }

      // Resto -> card-body (si no existe ya)
      const innerKids = Array.from(fs.childNodes).filter(n=> !(n.nodeType===1 && n.classList.contains('card-header')));
      if (!fs.querySelector(':scope > .card-body')){
        const body = document.createElement('div');
        body.className = 'card-body';
        innerKids.forEach(n=> body.appendChild(n));
        fs.appendChild(body);
      }
    });
  }

  function enhanceControls(root){
    // Labels
    $$('label', root).forEach(l=> l.classList.add('form-label'));

    // Inputs tipo texto
    $$('input:not([type]), input[type="text"], input[type="email"], input[type="number"], input[type="password"], input[type="date"], input[type="time"], input[type="datetime-local"], input[type="url"], input[type="search"], input[type="tel"], input[type="color"], input[type="file"]', root)
      .forEach(inp=>{
        if (!inp.classList.contains('form-control') && !inp.classList.contains('form-check-input')) {
          inp.classList.add('form-control');
        }
        ensureGroupWrapper(inp);
      });

    // Textareas
    $$('textarea', root).forEach(tx=>{
      if (!tx.classList.contains('form-control')) tx.classList.add('form-control');
      ensureGroupWrapper(tx);
    });

    // Selects
    $$('select', root).forEach(sel=>{
      if (!sel.classList.contains('form-select')) sel.classList.add('form-select');
      ensureGroupWrapper(sel);
    });

    // Checkboxes / Radios
    $$('input[type="checkbox"], input[type="radio"]', root).forEach(inp=>{
      if (inp.closest('.form-check')) return;
      const wrap = document.createElement('div');
      wrap.className = 'form-check mb-3';
      const label = findAssociatedLabel(inp, root);

      inp.classList.add('form-check-input');
      if (label){
        label.classList.add('form-check-label');
        // reordenar como: input + label
        inp.parentElement.insertBefore(wrap, inp);
        wrap.appendChild(inp);
        wrap.appendChild(label);
      } else {
        inp.parentElement.insertBefore(wrap, inp);
        wrap.appendChild(inp);
      }
    });
  }

  function ensureGroupWrapper(ctrl){
    // No envolver si ya está en .mb-3, .form-group, .input-group, .form-check
    const hasGroupAncestor = ctrl.closest('.mb-3, .form-group, .input-group, .form-check');
    if (hasGroupAncestor) return;

    const parent = ctrl.parentElement;
    if (!parent) return;

    // Mover label asociada junto al control, si está de hermano previo/siguiente
    const label = (ctrl.id && parent.querySelector(`label[for="${cssEscape(ctrl.id)}"]`))
               || (ctrl.name && parent.querySelector(`label[for="${cssEscape(ctrl.name)}"]`))
               || (ctrl.previousElementSibling && ctrl.previousElementSibling.tagName==='LABEL' ? ctrl.previousElementSibling : null);

    const group = document.createElement('div');
    group.className = 'mb-3';

    // Insertar group y meter label + control
    parent.insertBefore(group, label && label.parentElement===parent ? label : ctrl);
    if (label && label.parentElement===parent) group.appendChild(label);
    group.appendChild(ctrl);
  }

  function enhanceButtons(root){
    $$('button, input[type="button"], input[type="submit"], a.btn', root).forEach(btn=>{
      if (!btn.classList.contains('btn')) btn.classList.add('btn');
      const isSubmit = (btn.type === 'submit') || (btn.tagName==='BUTTON' && btn.getAttribute('type')==='submit');
      const hasVariant = Array.from(btn.classList).some(c=> /^btn-/.test(c) && c!=='btn');
      if (!hasVariant) btn.classList.add(isSubmit ? 'btn-primary' : 'btn-secondary');
      // Espaciado
      if (!btn.classList.contains('me-2')) btn.classList.add('me-2');
    });
  }

  function ensureTabsActive(root){
    // Asegura que las tabs funcionen si no hay activo
    const navs = $$('.nav-tabs', root);
    navs.forEach(ul=>{
      const lis = Array.from(ul.children).filter(li=> li.querySelector('a,button'));
      if (!lis.length) return;
      const anyActive = lis.some(li=> li.classList.contains('active') || li.querySelector('a.active,button.active'));
      if (!anyActive){
        const first = lis[0];
        first.classList.add('active');
        const link = first.querySelector('a,button');
        if (link){
          link.classList.add('active');
          link.setAttribute('aria-selected','true');
          const paneId = getTargetId(link);
          const cont = findTabContentContainer(ul, root);
          if (paneId && cont){
            Array.from(cont.children).forEach(p=> p.classList.remove('active','show'));
            const pane = cont.querySelector(`#${cssEscape(paneId)}`);
            if (pane) pane.classList.add('active','show');
          }
        }
      }
    });
  }

  function findAssociatedLabel(input, root){
    if (input.id){
      const lbl = root.querySelector(`label[for="${cssEscape(input.id)}"]`);
      if (lbl) return lbl;
    }
    // Siguiente o anterior inmediato
    if (input.nextElementSibling && input.nextElementSibling.tagName==='LABEL') return input.nextElementSibling;
    if (input.previousElementSibling && input.previousElementSibling.tagName==='LABEL') return input.previousElementSibling;
    return null;
  }

  function getTargetId(link){
    let t = link.getAttribute('data-bs-target') || link.getAttribute('href') || '';
    if (!t) return null;
    t = t.trim();
    if (t.startsWith('#')) return t.slice(1);
    const pos = t.indexOf('#');
    return pos >= 0 ? t.substring(pos+1) : null;
  }
  function findTabContentContainer(ul, root){
    const sib = ul.nextElementSibling;
    if (sib && sib.classList?.contains('tab-content')) return sib;
    return root.querySelector('.tab-content');
  }
  function cssEscape(s){ return String(s).replace(/(["\\.#\[\]:])/g, '\\$1'); }
})();