/* GASTRO-X demo: stock a kitchen live from items.json, with the rules used for the study scenarios
   (slot template, purchase-weighted draws, typical-set selection, waste-weighted at-risk items). */
(function () {
  'use strict';
  var REG = {
    IT: { name: 'Italy', lang: 'Italian', dec: ',' },
    DE: { name: 'Germany', lang: 'German', dec: ',' },
    PL: { name: 'Poland', lang: 'Polish', dec: ',' },
    UK: { name: 'the United Kingdom', lang: 'English', dec: '.' }
  };
  var K_ATRISK = 6, N_CAND = 400, TOP = 0.10;
  var URGENT_OPENED_KEYS = { tinned: 1, condiment: 1, meal: 1, cake: 1, bread: 1 };
  var DB = null, country = 'IT', current = null, choice = [];
  var $ = function (id) { return document.getElementById(id); };

  function esPick(weights, k) {
    var keys = weights.map(function (w, i) { return { i: i, k: Math.pow(Math.random(), 1 / w) }; });
    keys.sort(function (a, b) { return b.k - a.k; });
    return keys.slice(0, k).map(function (x) { return x.i; });
  }

  function candidate(items) {
    var picked = [], lp = 0;
    DB.slots.forEach(function (s) {
      var pool = items.filter(function (it) { return it.slot === s.id; });
      esPick(pool.map(function (it) { return it.w; }), s.n).forEach(function (j) {
        picked.push(pool[j]); lp += Math.log(pool[j].p);
      });
    });
    return { items: picked, lp: lp };
  }

  function draw(c) {
    var data = DB.countries[c], cands = [];
    for (var i = 0; i < N_CAND; i++) cands.push(candidate(data.items));
    cands.sort(function (a, b) { return b.lp - a.lp; });
    var top = cands.slice(0, Math.max(1, Math.round(N_CAND * TOP)));
    var chosen = top[Math.floor(Math.random() * top.length)].items;
    var risk = esPick(chosen.map(function (it) { return it.rate; }), K_ATRISK);
    var rows = chosen.map(function (it, i) {
      var st, atRisk = risk.indexOf(i) >= 0;
      if (atRisk) {
        if (it.storage === 'P') st = 'past';
        else if (it.storage === 'C') st = (it.raw || Math.random() < 0.5) ? 'useby' : 'opened';
        else st = 'opened';
      } else st = (it.storage === 'P' || it.raw) ? 'fresh' : 'unopened';
      var urgent = st === 'past' || st === 'useby' ||
        (st === 'opened' && (it.storage === 'C' || URGENT_OPENED_KEYS[it.key]));
      return { it: it, st: st, atRisk: atRisk, urgent: urgent, w: urgent ? 1 : it.rate };
    });
    var lo = data.leftovers[Math.floor(Math.random() * data.leftovers.length)];
    rows.push({ it: { slot: 'L', en: lo.en, loc: lo.loc, g: 500 }, st: 'left', atRisk: true, urgent: true, w: 1 });
    return rows;
  }

  function num(x, dec) { var t = String(Math.round(x * 100) / 100); return dec === ',' ? t.replace('.', ',') : t; }
  function niceHalf(q) {
    var h = q / 2; if (h < 20) return Math.max(1, Math.round(h));
    var step = h > 200 ? 50 : 10; return Math.max(step, Math.round(h / step) * step);
  }
  function qtyText(q, unit, dec) {
    if (unit === 'pcs') return q >= 1 ? String(q) : '½';
    if (unit === 'ml' && q === 2272) return '4 pints';
    if (q >= 1000) return num(q / 1000, dec) + (unit === 'g' ? ' kg' : ' l');
    return q + ' ' + unit;
  }
  function flat(s) { return s.replace(' (', ', ').replace(')', ''); }

  function line(row, local) {
    var data = DB.countries[country], st = local ? data.state.loc : data.state.en;
    var dec = local ? REG[country].dec : '.', it = row.it;
    var name = flat(local ? it.loc : it.en);
    if (row.st === 'left') return { name: name, detail: st.portions + ', ' + st.left };
    var q = it.q;
    if (row.st === 'opened') q = it.unit === 'pcs' ? (it.q >= 2 ? Math.ceil(it.q / 2) : 0.5) : niceHalf(it.q);
    var tag = '';
    if (row.st === 'past') tag = st.past.replace('{d}', local ? it.pastLoc : it.pastEn);
    else if (row.st === 'fresh') tag = local ? it.freshLoc : it.freshEn;
    else tag = st[row.st];
    return { name: name, detail: qtyText(q, it.unit, dec) + (tag ? ', ' + tag : '') };
  }

  function why(row) {
    var it = row.it;
    if (it.slot === 'L') return 'Cooked food is one of the largest shares of household food waste: about one sixth of avoidable food waste in German households, and the second largest category by weight in the UK.';
    var p = Math.round(it.p * 100);
    var s = 'Picked from national purchase data: this food fills its place in ' + p + '% of draws in ' + REG[country].name + '. ';
    var r = Math.round(it.rate * 100);
    s += it.itemLevel
      ? 'UK households throw away about ' + r + '% of what they buy of this food.'
      : 'For this food group, UK households throw away about ' + r + '% of what they buy.';
    if (row.urgent) s += ' Here it needs using soon, so it counts fully in the score.';
    return s;
  }

  function render() {
    var local = $('local').checked;
    var list = $('fridge-list'); list.innerHTML = '';
    var labels = {}; DB.slots.forEach(function (s) { labels[s.id] = s.label; }); labels.L = 'Leftovers';
    var lastSlot = null, ul;
    current.forEach(function (row, i) {
      if (row.it.slot !== lastSlot) {
        lastSlot = row.it.slot;
        var h = document.createElement('h3'); h.className = 'shelf'; h.textContent = labels[lastSlot];
        list.appendChild(h);
        ul = document.createElement('ul'); ul.className = 'items'; list.appendChild(ul);
      }
      var l = line(row, local), li = document.createElement('li');
      li.className = row.urgent ? 'urgent' : '';
      var det = document.createElement('details');
      var sum = document.createElement('summary');
      sum.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="iname"></span><span class="idetail"></span>';
      sum.querySelector('.iname').textContent = l.name;
      sum.querySelector('.idetail').textContent = l.detail;
      if (row.urgent) sum.setAttribute('aria-label', l.name + ', ' + l.detail + ', needs using soon');
      var p = document.createElement('p'); p.textContent = why(row);
      det.appendChild(sum); det.appendChild(p);
      var seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', 'Use of ' + l.name);
      [['0', 'none'], ['0.5', 'part'], ['1', 'all']].forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1]; b.dataset.v = o[0];
        b.setAttribute('aria-pressed', String(choice[i] === +o[0]));
        b.addEventListener('click', function () {
          choice[i] = +o[0];
          seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          score();
        });
        seg.appendChild(b);
      });
      li.appendChild(det); li.appendChild(seg); ul.appendChild(li);
    });
    var urg = current.filter(function (r) { return r.urgent; }).length;
    var kg = current.reduce(function (a, r) { return a + (r.it.g || 0); }, 0) / 1000;
    $('fridge-note').textContent = 'A typical kitchen in ' + REG[country].name + ': 20 items, about ' + num(Math.round(kg * 10) / 10, '.') + ' kg of food, ' + urg + ' of them need using soon.';
    score();
  }

  function score() {
    var sw = 0, swf = 0, usedU = 0, totU = 0;
    current.forEach(function (r, i) {
      sw += r.w; swf += r.w * (choice[i] || 0);
      if (r.urgent) { totU++; if (choice[i] > 0) usedU++; }
    });
    var wui = sw ? swf / sw : 0;
    $('wui').textContent = Math.round(wui * 100) + '%';
    $('wui-bar').style.width = Math.round(wui * 100) + '%';
    $('urgent-used').textContent = 'Items that need using soon: ' + usedU + ' of ' + totU + ' used';
  }

  function open() {
    current = draw(country);
    choice = current.map(function () { return 0; });
    $('fridge').hidden = false;
    $('open').textContent = 'Restock the fridge';
    render();
  }

  function setCountry(c) {
    country = c;
    document.querySelectorAll('.region').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
    $('local-label').textContent = c === 'UK' ? 'Shown in English' : 'Show in ' + REG[c].lang;
    $('local').disabled = c === 'UK';
    if (current) open();
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('items.json').then(function (r) { return r.json(); }).then(function (d) {
      DB = d;
      document.querySelectorAll('.region').forEach(function (b) {
        b.addEventListener('click', function () { setCountry(b.dataset.c); });
      });
      $('open').addEventListener('click', open);
      $('local').addEventListener('change', function () { if (current) render(); });
    }).catch(function () {
      $('open').disabled = true; $('open').textContent = 'Could not load the kitchen data';
    });
  });
})();
