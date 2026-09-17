// runtime.js — a small, hand-written stand-in for Node's require(), made
// to run in the browser via plain (non-module) <script> tags. Loaded
// first; every other script just calls __modules__.define(key, factory)
// to register itself — nothing executes until something actually
// require()s it (same lazy-evaluation + caching behavior as Node).
(function () {
  var registry = Object.create(null);   // moduleKey -> factory(module, exports, require)
  var cache = Object.create(null);      // moduleKey -> the module object (after first run)
  var EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

  function define(key, factory) { registry[key] = factory; }

  function stripKnownExtension(p) {
    return p.replace(/\.(tsx|ts|jsx|js)$/, '');
  }

  function resolveRelative(fromKey, spec) {
    var base = fromKey.split('/'); base.pop(); // drop the requiring file's own name, keep its folder
    var parts = stripKnownExtension(spec).split('/');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === '.' || part === '') continue;
      if (part === '..') base.pop(); else base.push(part);
    }
    return base.join('/');
  }

  function findRegistered(key) {
    for (var i = 0; i < EXTENSIONS.length; i++) {
      var candidate = key + EXTENSIONS[i];
      if (registry[candidate]) return candidate;
    }
    return null;
  }

  function req(fromKey, spec) {
    var isRelative = spec.charAt(0) === '.';
    var key = isRelative ? findRegistered(resolveRelative(fromKey, spec)) : findRegistered(spec);
    if (!key) {
      throw new Error('[runtime.js] Cannot find module "' + spec + '" (required from "' + (fromKey || '(entry)') + '"). ' +
        'Check that the file exists under src/ and was included in the build.');
    }
    if (cache[key]) return cache[key].exports;
    var mod = { exports: {} };
    cache[key] = mod; // set BEFORE running the factory, so circular requires get the in-progress object instead of looping forever
    var localRequire = function (s) { return req(key, s); };
    registry[key](mod, mod.exports, localRequire);
    return mod.exports;
  }

  window.__modules__ = {
    define: define,
    require: function (spec) { return req('', spec); },
  };
})();
