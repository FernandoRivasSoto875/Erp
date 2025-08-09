/* KEEP: Merge util to preserve existing JSON while applying layout changes without deleting data */
(function (global) {
  'use strict';

  /**
   * Comprueba si es un objeto plano
   * @param {any} v
   * @returns {boolean}
   */
  function isPlainObject(v) {
    return Object.prototype.toString.call(v) === '[object Object]';
  }

  /**
   * Clonado profundo seguro
   * @param {any} v
   * @returns {any}
   */
  function deepClone(v) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(v); } catch (_) { /* fallback */ }
    }
    return JSON.parse(JSON.stringify(v));
  }

  /**
   * Detecta la clave primaria para arrays de objetos
   * @param {Array} arr
   * @param {string[]} candidates
   * @returns {string|undefined}
   */
  function detectKey(arr, candidates) {
    const list = Array.isArray(arr) ? arr : [];
    const keys = candidates || ['nombre', 'name', 'id', 'key', 'codigo', 'code'];
    for (const k of keys) {
      if (list.some(it => isPlainObject(it) && it[k] !== undefined && it[k] !== null)) return k;
    }
    return undefined;
  }

  /**
   * Merge de arrays conservando existentes (no borra), agrega/actualiza los nuevos
   * - Para "layout": reemplaza completamente (cambio explícito del diseño)
   * - Para arrays de primitivos: unión manteniendo el orden original
   * - Para arrays de objetos: merge por clave detectada (nombre/name/id/...)
   * @param {Array} target
   * @param {Array} source
   * @param {string} path
   * @returns {Array}
   */
  function mergeArraysKeep(target, source, path) {
    const tgt = Array.isArray(target) ? target.slice() : [];
    const src = Array.isArray(source) ? source : [];

    // Regla: el layout se reemplaza (no es eliminación de datos, es cambio de disposición)
    if (path === 'layout') return deepClone(src);

    const targetAreObjects = tgt.some(isPlainObject) || false;
    const sourceAreObjects = src.some(isPlainObject) || false;

    // Primitivos: unión
    if (!targetAreObjects && !sourceAreObjects) {
      const set = new Set(tgt);
      src.forEach(v => { if (!set.has(v)) { set.add(v); tgt.push(v); } });
      return tgt;
    }

    // Objetos: merge por clave
    const key = detectKey(tgt.concat(src));
    if (!key) {
      // Sin clave: agrega los objetos nuevos no idénticos (según firma)
      const seen = new Set(tgt.map(o => JSON.stringify(o)));
      src.forEach(o => {
        const sig = JSON.stringify(o);
        if (!seen.has(sig)) {
          seen.add(sig);
          tgt.push(deepClone(o));
        }
      });
      return tgt;
    }

    // Indexar destino por clave
    const index = new Map();
    tgt.forEach((it, i) => {
      if (isPlainObject(it) && it[key] !== undefined && it[key] !== null) {
        index.set(String(it[key]), i);
      }
    });

    // Merge de cada item de source
    src.forEach(s => {
      const k = isPlainObject(s) ? s[key] : undefined;
      const kk = k !== undefined && k !== null ? String(k) : undefined;
      if (kk !== undefined && index.has(kk)) {
        const pos = index.get(kk);
        tgt[pos] = mergeKeep(tgt[pos], s, { path: path ? path + '[]' : '[]' });
      } else {
        tgt.push(deepClone(s));
      }
    });

    return tgt;
  }

  /**
   * Merge profundo con lógica KEEP:
   * - No elimina claves existentes del target.
   * - Actualiza o agrega las claves provenientes del source.
   * - Para arrays aplica mergeArraysKeep (excepto layout que se reemplaza).
   * - Para valores primitivos: si source es undefined, mantiene el target; si no, reemplaza por source.
   * @param {any} target
   * @param {any} source
   * @param {{path?: string}} [opt]
   * @returns {any}
   */
  function mergeKeep(target, source, opt) {
    const path = (opt && opt.path) || '';

    // Si alguno es array, delega
    if (Array.isArray(target) || Array.isArray(source)) {
      return mergeArraysKeep(target, source, path);
    }

    // Si source no es objeto plano, aplicar regla primitiva
    if (!isPlainObject(source)) {
      return source === undefined ? deepClone(target) : deepClone(source);
    }

    // Ambos son objetos
    const out = isPlainObject(target) ? deepClone(target) : {};
    Object.keys(source).forEach(k => {
      const p = path ? path + '.' + k : k;
      if (k === 'layout') {
        // Reemplazo explícito del layout
        out[k] = deepClone(source[k]);
      } else {
        out[k] = mergeKeep(out[k], source[k], { path: p });
      }
    });
    return out;
  }

  /**
   * Aplica cambios de layout y otros al JSON original sin borrar datos existentes
   * Ejemplo de uso:
   *   const merged = applyKeepLayoutUpdate(formularioJsonOriginal, { layout, elementos_fuera, fieldsets });
   * @param {object} originalJson
   * @param {{layout?: any, elementos_fuera?: any, fieldsets?: any, [k:string]: any}} changes
   * @returns {object} JSON resultante con lógica KEEP
   */
  function applyKeepLayoutUpdate(originalJson, changes) {
    const base = deepClone(originalJson || {});

    // fieldsets: merge preservando
    if (Object.prototype.hasOwnProperty.call(changes || {}, 'fieldsets')) {
      base.fieldsets = mergeKeep(base.fieldsets, changes.fieldsets, { path: 'fieldsets' });
    }

    // layout: reemplazo (no es eliminación de datos, es cambio de disposición)
    if (Object.prototype.hasOwnProperty.call(changes || {}, 'layout')) {
      base.layout = deepClone(changes.layout);
    }

    // elementos_fuera: reemplazo directo del listado actual
    if (Object.prototype.hasOwnProperty.call(changes || {}, 'elementos_fuera')) {
      base.elementos_fuera = deepClone(changes.elementos_fuera);
    }

    // Cualquier otra clave: merge KEEP
    Object.keys(changes || {}).forEach(k => {
      if (k === 'layout' || k === 'elementos_fuera' || k === 'fieldsets') return;
      base[k] = mergeKeep(base[k], changes[k], { path: k });
    });

    return base;
  }

  // Exponer en el global para uso desde el constructor de formularios
  global.KeepJSON = {
    mergeKeep,
    applyKeepLayoutUpdate
  };

})(typeof window !== 'undefined' ? window : globalThis);