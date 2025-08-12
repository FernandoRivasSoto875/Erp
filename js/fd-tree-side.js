(function(){
  let panel, jsonTreeEl, filterInput, tabsEl;
  let FORM_JSON_LOCAL = null;

  function qs(){
    panel = document.getElementById('fd-tree-side');
    jsonTreeEl = document.getElementById('fd-json-tree');
    filterInput = document.getElementById('fd-tree-filter');
    tabsEl = document.getElementById('fd-side-tabs');
  }
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  ready(async function init(){
    qs();
    if(!panel) return;
    injectFilterStyles();

    // Cargar JSON (desde window.FORM_JSON o archivo)
    FORM_JSON_LOCAL = await loadFormJson();

    // Construir árbol JSON (Parametros, Fieldsets, Layout)
    jsonBuildTree();
    applyFilterAll();

    // UI
    filterInput?.addEventListener('input', applyFilterAll);
    tabsEl?.addEventListener('click', e=>{
      const btn=e.target.closest('[data-tab]'); if(!btn) return;
      const tab=btn.dataset.tab;
      document.getElementById('fd-tree-wrapper-form')?.classList.toggle('d-none', tab!=='form');
      document.getElementById('fd-tree-wrapper-json')?.classList.toggle('d-none', tab!=='json');
      if(tab==='json'){ jsonBuildTree(); applyFilterAll(); }
    });

    // Edición inline de valores primitivos en JSON
    jsonTreeEl?.addEventListener('click', e=>{
      const tgl=e.target.closest('.fd-json-toggle');
      if(tgl && !tgl.classList.contains('empty')){
        const li=tgl.closest('li'); li.classList.toggle('collapsed'); tgl.textContent=li.classList.contains('collapsed')?'▸':'▾';
      }
      const valSpan = e.target.closest('.fd-json-value');
      if(valSpan) startEdit(valSpan);
    });
  });

  async function loadFormJson(){
    try{
      if (window.FORM_JSON && Object.keys(window.FORM_JSON).length) {
        return JSON.parse(JSON.stringify(window.FORM_JSON));
      }
      const url = (window.FORM_CONFIG?.archivo_json) || 'json/formulariogenerico2.json';
      const r = await fetch(url, {cache:'no-cache'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    } catch(e){
      console.error('No se pudo parsear el JSON del formulario:', e);
      showJsonError('Error cargando/parsing JSON. Revisa la sintaxis (ver consola).');
      return { parametros:{}, fieldsets:{}, layout:{} };
    }
  }

  // Árbol JSON: muestra Parametros, Fieldsets, Layout (Parametros editable)
  function jsonBuildTree(){
    if(!jsonTreeEl) return;
    jsonTreeEl.innerHTML = '';
    const rootUl = document.createElement('ul');
    rootUl.className = 'fd-json-root';

    // 1) Parametros (todo lo que “va antes de fieldsets").
    rootUl.appendChild(buildJsonNode('parametros', FORM_JSON_LOCAL?.parametros ?? {}, 'parametros'));

    // 2) Fieldsets y 3) Layout solo para visualización/edición, sin tocar el DOM del form
    rootUl.appendChild(buildJsonNode('fieldsets', FORM_JSON_LOCAL?.fieldsets ?? {}, 'fieldsets'));
    rootUl.appendChild(buildJsonNode('layout', FORM_JSON_LOCAL?.layout ?? {}, 'layout'));

    jsonTreeEl.appendChild(rootUl);
  }

  function buildJsonNode(key, value, path){
    const li=document.createElement('li');
    const isArr=Array.isArray(value);
    const isObj=value && typeof value==='object' && !isArr;
    const hasChildren = isArr ? value.length>0 : (isObj ? Object.keys(value).length>0 : false);

    li.innerHTML = `
      <div class="fd-json-node ${isObj?'fd-json-type-object':''} ${isArr?'fd-json-type-array':''}" data-path="${escapeHtml(path)}">
        <span class="fd-json-toggle ${hasChildren?'':'empty'}">${hasChildren?'▾':''}</span>
        <span class="fd-json-key">${escapeHtml(key)}</span>
        ${(!isObj && !isArr) ? `<span class="fd-json-value ${valueClass(value)}" data-type="${valueType(value)}">${renderValue(value)}</span>` : `<span class="fd-json-badge">${isArr?('['+value.length+']'):'{'+Object.keys(value).length+'}'}</span>`}
      </div>
    `;

    if(hasChildren){
      const ul=document.createElement('ul');
      if(isArr){
        value.forEach((v,i)=> ul.appendChild(buildJsonNode(String(i), v, `${path}[${i}]`)));
      } else {
        Object.keys(value).forEach(k=> ul.appendChild(buildJsonNode(k, value[k], `${path}.${k}`)));
      }
      li.appendChild(ul);
    }
    return li;
  }

  // Edición inline de primitivos
  function startEdit(span){
    if(span.classList.contains('fd-editing')) return;
    const old=span.textContent, type=span.dataset.type;
    span.classList.add('fd-editing');
    const input=document.createElement('input'); input.type='text';
    input.value=(type==='string')?old.replace(/^"|"$/g,''):old;
    span.textContent=''; span.appendChild(input); input.focus(); input.select();
    const commit=()=>{
      let raw=input.value, val;
      if(type==='number'){ val=Number(raw); if(isNaN(val)) return cancel(); }
      else if(type==='boolean'){ val = /^true$/i.test(raw); }
      else if(type==='null'){ val=null; }
      else { val=raw; }
      const path = span.closest('.fd-json-node').dataset.path;
      setJsonPathValue(FORM_JSON_LOCAL, path, val);
      span.className='fd-json-value '+valueClass(val);
      span.dataset.type=valueType(val);
      span.classList.remove('fd-editing');
      span.textContent=renderValue(val);
    };
    const cancel=()=>{ span.classList.remove('fd-editing'); span.textContent=old; };
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') commit(); else if(e.key==='Escape') cancel(); });
    input.addEventListener('blur', commit);
  }

  // Utilidades JSON
  function setJsonPathValue(rootObj, path, val){
    const tokens=[];
    path.split('.').forEach(seg=>{
      const head = seg.match(/^[^\[]+/); if(head) tokens.push(head[0]);
      const idxs = seg.match(/\[\d+\]/g); idxs?.forEach(b=> tokens.push(Number(b.slice(1,-1))));
    });
    let obj=rootObj;
    for(let i=0;i<tokens.length-1;i++){
      obj = obj?.[tokens[i]];
      if(obj===undefined) return;
    }
    obj[tokens[tokens.length-1]] = val;
  }
  function valueType(v){ if(v===null) return 'null'; if(Array.isArray(v)) return 'array'; return typeof v; }
  function valueClass(v){ return 'fd-type-'+valueType(v); }
  function renderValue(v){ const t=valueType(v); if(t==='boolean') return v?'true':'false'; if(t==='null') return 'null'; return String(v); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Filtro (no toca el DOM del formulario)
  function injectFilterStyles(){
    if (document.getElementById('fd-tree-filter-styles')) return;
    const st=document.createElement('style'); st.id='fd-tree-filter-styles';
    st.textContent = `
      #fd-tree-side .fd-filter-hide{ display:none !important; }
      #fd-tree-side .fd-filter-hit > .fd-json-node{ background:#fff3cd; }
    `;
    document.head.appendChild(st);
  }
  function applyFilterAll(){
    const term=(filterInput?.value||'').toLowerCase().trim();
    if(!jsonTreeEl) return;
    jsonTreeEl.querySelectorAll('li').forEach(li=> li.classList.remove('fd-filter-hide','fd-filter-hit'));
    if(term){
      jsonTreeEl.querySelectorAll('.fd-json-node').forEach(nd=>{
        const key=nd.querySelector('.fd-json-key')?.textContent.toLowerCase()||'';
        const val=nd.querySelector('.fd-json-value')?.textContent.toLowerCase()||'';
        const hit = key.includes(term) || val.includes(term);
        if(hit){
          const li = nd.closest('li'); li.classList.add('fd-filter-hit');
          // expandir ancestros
          let cur=li; while(cur){ cur.classList.remove('collapsed'); cur=cur.parentElement.closest('li'); }
          // ajustar toggles visibles
          nd.querySelector('.fd-json-toggle')?.textContent && (nd.querySelector('.fd-json-toggle').textContent='▾');
        }
      });
      jsonTreeEl.querySelectorAll('li').forEach(li=>{
        if(li.classList.contains('fd-filter-hit')) return;
        if(li.querySelector('.fd-filter-hit')) return;
        li.classList.add('fd-filter-hide');
      });
    } else {
      jsonTreeEl.querySelectorAll('li').forEach(li=>{
        li.classList.remove('collapsed');
        const tg=li.querySelector(':scope > .fd-json-node .fd-json-toggle'); if(tg && !tg.classList.contains('empty')) tg.textContent='▾';
      });
    }
  }

  function showJsonError(msg){
    if(!jsonTreeEl) return;
    jsonTreeEl.innerHTML = `<div class="text-danger small">${escapeHtml(msg)}</div>`;
  }
})();