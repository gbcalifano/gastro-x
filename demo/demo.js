/* GASTRO-X demo: stock a kitchen live from items.json, with the rules used for the study scenarios
   (slot template, purchase-weighted draws, typical-set selection, waste-weighted at-risk items),
   then cook one dish for two by dragging food into the pot. */
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
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Drawing a kitchen (unchanged rules) ---------- */
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
    rows.push({ it: { slot: 'L', en: lo.en, loc: lo.loc, g: 500, storage: 'C' }, st: 'left', atRisk: true, urgent: true, w: 1 });
    rows.forEach(function (r) { r.icon = iconFor(r.it); r.zone = zoneFor(r.it); });
    return rows;
  }

  /* ---------- Text ---------- */
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
  function local() { return $('local').checked; }
  function nameOf(row) { return flat(local() ? row.it.loc : row.it.en); }

  function line(row) {
    var loc = local(), data = DB.countries[country], st = loc ? data.state.loc : data.state.en;
    var dec = loc ? REG[country].dec : '.', it = row.it;
    if (row.st === 'left') return st.portions + ', ' + st.left;
    var q = it.q;
    if (row.st === 'opened') q = it.unit === 'pcs' ? (it.q >= 2 ? Math.ceil(it.q / 2) : 0.5) : niceHalf(it.q);
    var tag = '';
    if (row.st === 'past') tag = st.past.replace('{d}', loc ? it.pastLoc : it.pastEn);
    else if (row.st === 'fresh') tag = loc ? it.freshLoc : it.freshEn;
    else tag = st[row.st];
    return qtyText(q, it.unit, dec) + (tag ? ', ' + tag : '');
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

  var TAG = { past: 'use today', useby: 'tomorrow', opened: 'opened', left: 'leftover' };

  /* ---------- Stylised products ---------- */
  // [pattern on the English name, emoji, pack]; first match wins.
  var ICONS = [
    [/leftover/, '🍲', 'tupper'],
    [/frozen pizza/, '🍕', 'box'], [/frozen chips/, '🍟', 'bag'], [/fish fingers/, '🐟', 'box'],
    [/burger/, '🍔', 'box'], [/prawn/, '🦐', null], [/seafood mix/, '🦑', 'bag'],
    [/frozen plaice/, '🐟', 'bag'], [/frozen peas/, '🫛', 'bag'], [/frozen mixed/, '🥕', 'bag'],
    [/tortilla/, '🫓', 'bag'], [/baguette/, '🥖', null], [/croissant/, '🥐', null],
    [/sliced white|toast bread|sandwich bread/, '🍞', 'bag'], [/rolls/, '🥯', null], [/bread/, '🍞', null],
    [/biscuit/, '🍪', 'box'], [/rusk/, '🍞', 'box'], [/buns/, '🧁', null], [/cake|babka/, '🍰', null],
    [/flour/, '🌾', 'bag'], [/tagliatelle/, '🍝', 'tray'], [/lasagne/, '🍝', 'tray'], [/pierogi/, '🥟', 'tray'],
    [/pasta sauce/, '🍅', 'jar'], [/pasta|spaghetti/, '🍝', 'box'], [/rice/, '🍚', 'bag'],
    [/cornflakes|muesli|oats/, '🥣', 'box'], [/lentil/, '🫘', 'bag'],
    [/chicken|turkey/, '🍗', 'tray'], [/bacon|prosciutto|ham/, '🥓', 'tray'],
    [/sausage|frankfurter|chorizo/, '🌭', 'tray'], [/lamb|rabbit|joint/, '🍖', 'tray'],
    [/steak|beef|pork|escalope|loin|patties/, '🥩', 'tray'],
    [/tuna/, '🐟', 'tin'], [/mussel/, '🦪', null], [/salmon|mackerel|cod|pollock|bream|fish/, '🐟', 'tray'],
    [/oat drink/, '🌾', 'carton'], [/kefir/, '🥛', 'bottle'], [/milk/, '🥛', 'carton'],
    [/yoghurt|quark/, '🥛', 'tub'], [/sour cream|double cream/, '🥛', 'tub'], [/cream/, '🥛', 'carton'],
    [/gouda|processed cheese/, '🧀', 'tray'], [/cheese|cheddar|parmesan|parmigiano|brie|mozzarella/, '🧀', null],
    [/egg/, '🥚', 'eggbox'], [/margarine/, '🧈', 'tub'], [/butter/, '🧈', null],
    [/satsuma|mandarin|orange/, '🍊', null], [/lemon/, '🍋', null], [/pineapple/, '🍍', null],
    [/apple/, '🍎', null], [/pear/, '🍐', null], [/raisin/, '🍇', 'box'], [/grape/, '🍇', null],
    [/banana/, '🍌', null], [/kiwi/, '🥝', null], [/plum/, '🫐', null],
    [/walnut/, '🌰', 'bag'], [/nuts/, '🥜', 'bag'],
    [/sauerkraut/, '🥬', 'jar'], [/pickled cucumber|gherkin/, '🥒', 'jar'],
    [/potato/, '🥔', null], [/cabbage|sprouts|lettuce|spinach|chicory|celery|leek/, '🥬', null],
    [/cauliflower|broccoli|turnip/, '🥦', null], [/green beans/, '🫛', null], [/carrot|parsnip/, '🥕', null],
    [/beetroot/, '🍠', null], [/celeriac/, '🥔', null], [/garlic/, '🧄', null], [/onion/, '🧅', null],
    [/cucumber|courgette/, '🥒', null], [/mushroom/, '🍄', null],
    [/puree|concentrate/, '🍅', 'jar'], [/chopped tomatoes/, '🍅', 'tin'], [/passata|ketchup/, '🍅', 'bottle'],
    [/tomato soup/, '🍅', 'carton'], [/soup/, '🍲', 'carton'], [/tomato/, '🍅', null],
    [/paprika powder/, '🌶️', 'jar'], [/pepper/, '🫑', null], [/aubergine/, '🍆', null], [/pumpkin/, '🎃', null],
    [/parsley|fennel|artichoke/, '🌿', null],
    [/beans/, '🫘', 'tin'], [/sweetcorn/, '🌽', 'tin'], [/olive/, '🫒', 'jar'], [/pesto/, '🌿', 'jar'],
    [/mayonnaise/, '🥚', 'jar'], [/stock cube/, '🍲', 'box'], [/herbs|oregano|marjoram/, '🌿', 'jar']
  ];
  var LEFT = [[/pasta/, '🍝'], [/meatball/, '🧆'], [/potato/, '🥔'], [/pork|beef/, '🍖'],
    [/vegetables/, '🥕'], [/minestrone|stew|soup|żurek/, '🍲']];
  var COLORS = ['#b4532a', '#c58b1c', '#4f7a3a', '#3f6e8c', '#7a4d7a', '#9b3d3d', '#5c6f4a', '#a0623b'];

  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function iconFor(it) {
    var n = it.en.toLowerCase(), emo = '🍽️', pack = 'box';
    if (it.slot === 'L') {
      emo = '🍲'; LEFT.some(function (r) { if (r[0].test(n)) { emo = r[1]; return true; } return false; });
      return { emo: emo, pack: 'tupper', color: '#8a3b24', frozen: false };
    }
    ICONS.some(function (r) { if (r[0].test(n)) { emo = r[1]; pack = r[2]; return true; } return false; });
    if (it.storage === 'Z' && !pack) pack = 'bag';
    return { emo: emo, pack: pack, color: COLORS[hash(it.en) % COLORS.length], frozen: it.storage === 'Z' };
  }

  function packSVG(ic) {
    var c = ic.color, s;
    switch (ic.pack) {
      case 'tin': s = '<rect x="10" y="8" width="36" height="42" rx="4" fill="#b9bcbf"/><ellipse cx="28" cy="9" rx="18" ry="4" fill="#d9dcdf"/><rect x="10" y="17" width="36" height="24" fill="' + c + '"/>'; break;
      case 'jar': s = '<rect x="14" y="4" width="28" height="8" rx="2" fill="' + c + '"/><rect x="10" y="12" width="36" height="40" rx="8" fill="#e8eef0" stroke="#c6d0d4"/><rect x="13" y="22" width="30" height="20" rx="2" fill="#fbf6ec"/>'; break;
      case 'bottle': s = '<rect x="23" y="2" width="10" height="9" rx="2" fill="' + c + '"/><path d="M22 11h12l4 10v30a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3V21z" fill="#f0ebe4" stroke="#d3c9bc"/><rect x="18" y="26" width="20" height="18" fill="' + c + '" opacity=".9"/>'; break;
      case 'carton': s = '<path d="M14 14l7-10h14l7 10v38H14z" fill="#fbfaf7" stroke="#d9d2c6"/><path d="M14 14h28" stroke="#d9d2c6"/><rect x="14" y="30" width="28" height="22" fill="' + c + '"/>'; break;
      case 'bag': s = '<path d="M12 10l3-6h26l3 6-2 42H14z" fill="' + c + '"/><path d="M15 4h26l1 4H14z" fill="#00000022"/><rect x="16" y="20" width="24" height="22" rx="11" fill="#ffffffd9"/>'; break;
      case 'box': s = '<rect x="9" y="6" width="38" height="46" rx="2" fill="' + c + '"/><rect x="9" y="6" width="38" height="7" fill="#00000022"/><rect x="14" y="19" width="28" height="26" rx="13" fill="#ffffffd9"/>'; break;
      case 'tray': s = '<rect x="4" y="22" width="48" height="28" rx="5" fill="#f4f1ec" stroke="#d6cfc4"/><rect x="7" y="25" width="42" height="22" rx="4" fill="#ffffff66" stroke="#ffffffaa"/><rect x="34" y="40" width="14" height="6" fill="' + c + '"/>'; break;
      case 'tub': s = '<rect x="9" y="16" width="38" height="7" rx="3" fill="' + c + '"/><path d="M11 23h34l-3 27H14z" fill="#fbfaf7" stroke="#d9d2c6"/>'; break;
      case 'eggbox': s = '<path d="M4 26h48l-3 22H7z" fill="#cdb79a"/><path d="M4 26q24-14 48 0" fill="#d8c4a8"/>'; break;
      case 'tupper': s = '<rect x="5" y="16" width="46" height="7" rx="3" fill="' + c + '"/><rect x="7" y="23" width="42" height="27" rx="5" fill="#ffffff55" stroke="#c9d3d8"/>'; break;
      default: return '';
    }
    if (ic.frozen) s += '<path d="M8 6l4 3M48 8l-4 3M10 50l3-3" stroke="#bfe3f5" stroke-width="2" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">' + s + '</svg>';
  }

  /* ---------- Where things go ---------- */
  var CRISPER = { salad: 1, brassica: 1, cabbage: 1, carrot: 1, cucumber: 1, pepper: 1, mushroom: 1, veg_other: 1 };
  function zoneFor(it) {
    if (it.slot === 'L') return 'fridge';
    if (it.storage === 'Z') return 'freezer';
    if (it.storage === 'C') return 'fridge';
    if (it.slot === 'FV' && CRISPER[it.key]) return 'crisper';
    if (it.storage === 'P') return 'basket';
    return 'shelf';
  }

  /* ---------- Rendering ---------- */
  function tokenLabel(row) {
    return nameOf(row) + ', ' + line(row) + (row.urgent ? ', needs using soon' : '') +
      (choice[row.idx] === 1 ? ', in the pot' : choice[row.idx] === 0.5 ? ', part of it in the pot' : '');
  }

  function render() {
    ['freezer', 'fridge', 'crisper', 'shelf', 'basket'].forEach(function (z) { $('z-' + z).innerHTML = ''; });
    current.forEach(function (row, i) {
      row.idx = i;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tok' + (row.urgent ? ' urgent' : '') + (row.st === 'opened' ? ' opened' : '');
      b.dataset.i = i;
      b.style.setProperty('--d', (i * 35) + 'ms');
      var pk = packSVG(row.icon);
      b.innerHTML = '<span class="art' + (pk ? ' packed' : '') + '" data-pack="' + (row.icon.pack || 'fresh') + '">' + pk + '<span class="emo">' + row.icon.emo + '</span></span>' +
        (TAG[row.st] && (row.urgent || row.st === 'opened') ? '<span class="tag">' + TAG[row.st] + '</span>' : '') +
        '<span class="half" aria-hidden="true">½</span><span class="nm"></span>';
      b.querySelector('.nm').textContent = nameOf(row);
      b.setAttribute('aria-label', tokenLabel(row));
      bindToken(b, i);
      $('z-' + row.zone).appendChild(b);
    });
    var urg = current.filter(function (r) { return r.urgent; }).length;
    var kg = current.reduce(function (a, r) { return a + (r.it.g || 0); }, 0) / 1000;
    $('kitchen-note').textContent = 'A typical kitchen in ' + REG[country].name + ': 20 items, about ' +
      num(Math.round(kg * 10) / 10, '.') + ' kg of food, ' + urg + ' of them need using soon.';
    update();
  }

  function update() {
    // tokens
    document.querySelectorAll('.tok').forEach(function (b) {
      var i = +b.dataset.i, row = current[i];
      b.classList.toggle('used', choice[i] === 1);
      b.classList.toggle('part', choice[i] === 0.5);
      b.querySelector('.nm').textContent = nameOf(row);
      b.setAttribute('aria-label', tokenLabel(row));
    });
    // pot contents
    var inPot = [], potIn = $('pot-in'); potIn.innerHTML = '';
    current.forEach(function (row, i) { if (choice[i] > 0) inPot.push(i); });
    var lift = Math.min(10, inPot.length);
    inPot.forEach(function (i, k) {
      var s = document.createElement('span'); s.className = 'bob';
      var h = hash(current[i].it.en + i);
      s.style.left = (6 + ((k * 23 + (h % 7)) % 70)) + '%';
      s.style.bottom = (8 + lift + Math.floor(k / 4) * 6 + ((h >> 3) % 5)) + '%';
      s.style.setProperty('--b', (1.6 + (h % 10) / 10) + 's');
      s.style.setProperty('--r', ((h % 30) - 15) + 'deg');
      s.textContent = current[i].icon.emo;
      potIn.appendChild(s);
    });
    var on = inPot.length > 0;
    $('pot').classList.toggle('on', on);
    $('pot-hint').hidden = on;
    $('cook').disabled = !on;
    // list of what is in the pot
    var ul = $('potlist'); ul.innerHTML = '';
    inPot.forEach(function (i) {
      var row = current[i], li = document.createElement('li');
      li.innerHTML = '<span class="emo" aria-hidden="true">' + row.icon.emo + '</span><span class="pn"></span>';
      li.querySelector('.pn').textContent = nameOf(row);
      var seg = document.createElement('span'); seg.className = 'seg'; seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', 'How much of ' + nameOf(row));
      [[0.5, 'part'], [1, 'all']].forEach(function (o) {
        var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = o[1];
        bt.setAttribute('aria-pressed', String(choice[i] === o[0]));
        bt.addEventListener('click', function () { setChoice(i, o[0]); });
        seg.appendChild(bt);
      });
      var x = document.createElement('button'); x.type = 'button'; x.className = 'out'; x.textContent = '×';
      x.setAttribute('aria-label', 'Take ' + nameOf(row) + ' out of the pot');
      x.addEventListener('click', function () { setChoice(i, 0); });
      li.appendChild(seg); li.appendChild(x); ul.appendChild(li);
    });
    $('potlist-wrap').hidden = !on;
    score();
  }

  function score() {
    var sw = 0, swf = 0, usedU = 0, totU = 0;
    current.forEach(function (r, i) {
      sw += r.w; swf += r.w * (choice[i] || 0);
      if (r.urgent) { totU++; if (choice[i] > 0) usedU++; }
    });
    var wui = sw ? swf / sw : 0, pct = Math.round(wui * 100);
    $('wui').textContent = pct + '%';
    $('wui-bar').style.width = pct + '%';
    $('urgent-used').textContent = 'Urgent food rescued: ' + usedU + ' of ' + totU;
    return { pct: pct, usedU: usedU, totU: totU };
  }

  function setChoice(i, v, fromEl) {
    var before = choice[i];
    choice[i] = v;
    if (v > before) splash(fromEl);
    update();
    closeCard(false);
  }

  /* ---------- Animations ---------- */
  function splash(fromEl) {
    var pot = $('pot');
    if (fromEl && !reduceMotion && fromEl.animate) {
      var a = fromEl.getBoundingClientRect(), p = pot.getBoundingClientRect();
      var g = fromEl.cloneNode(true); g.className = 'tok ghost flying'; g.removeAttribute('id');
      g.style.left = a.left + 'px'; g.style.top = a.top + 'px'; g.style.width = a.width + 'px';
      document.body.appendChild(g);
      var dx = p.left + p.width / 2 - (a.left + a.width / 2), dy = p.top + p.height * 0.28 - (a.top + a.height / 2);
      g.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx * 0.6 + 'px,' + (dy * 0.6 - 60) + 'px) scale(.8) rotate(-12deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.35) rotate(10deg)', opacity: 0 }
      ], { duration: 520, easing: 'ease-in' }).onfinish = function () { g.remove(); };
    }
    pot.classList.remove('splash'); void pot.offsetWidth; pot.classList.add('splash');
  }

  /* ---------- Drag and drop (mouse, pen and touch) ---------- */
  var drag = null, suppressClick = false;
  function overPot(x, y) {
    var r = $('pot').getBoundingClientRect(), m = 24;
    return x > r.left - m && x < r.right + m && y > r.top - m * 2 && y < r.bottom + m;
  }
  function bindToken(b, i) {
    b.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      drag = { i: i, el: b, x: e.clientX, y: e.clientY, id: e.pointerId, ghost: null };
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    b.addEventListener('pointermove', function (e) {
      if (!drag || drag.el !== b) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.ghost) {
        if (dx * dx + dy * dy < 49) return;
        var r = b.getBoundingClientRect();
        var g = b.cloneNode(true); g.className = 'tok ghost'; g.style.width = r.width + 'px';
        drag.ox = drag.x - r.left; drag.oy = drag.y - r.top;
        document.body.appendChild(g); drag.ghost = g;
        b.classList.add('lifted'); document.body.classList.add('dragging');
      }
      drag.ghost.style.left = (e.clientX - drag.ox) + 'px';
      drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
      $('pot').classList.toggle('target', overPot(e.clientX, e.clientY));
    });
    function end(e, cancelled) {
      if (!drag || drag.el !== b) return;
      var d = drag; drag = null;
      document.body.classList.remove('dragging'); b.classList.remove('lifted');
      $('pot').classList.remove('target');
      if (!d.ghost) return;
      suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
      var hit = !cancelled && overPot(e.clientX, e.clientY);
      if (hit) {
        if (choice[d.i] !== 1) setChoice(d.i, 1, d.ghost);
        d.ghost.remove();
      } else if (!reduceMotion && d.ghost.animate) {
        var r = b.getBoundingClientRect(), gr = d.ghost.getBoundingClientRect();
        d.ghost.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + (r.left - gr.left) + 'px,' + (r.top - gr.top) + 'px)' }],
          { duration: 250, easing: 'ease-out' }).onfinish = function () { d.ghost.remove(); };
      } else d.ghost.remove();
    }
    b.addEventListener('pointerup', function (e) { end(e, false); });
    b.addEventListener('pointercancel', function (e) { end(e, true); });
    b.addEventListener('click', function () { if (suppressClick) return; openCard(i, b); });
  }

  /* ---------- Item card (tap or keyboard) ---------- */
  var cardFor = null, cardFrom = null;
  function openCard(i, from) {
    var row = current[i], c = $('card');
    cardFor = i; cardFrom = from;
    $('card-art').innerHTML = from.querySelector('.art').outerHTML;
    $('card-name').textContent = nameOf(row);
    $('card-detail').textContent = line(row);
    $('card-detail').classList.toggle('urgent', row.urgent);
    $('card-why').textContent = why(row);
    c.querySelectorAll('[data-v]').forEach(function (bt) {
      bt.setAttribute('aria-pressed', String(choice[i] === +bt.dataset.v));
    });
    c.hidden = false;
    c.querySelector('[data-v="1"]').focus();
  }
  function closeCard(refocus) {
    var c = $('card'); if (c.hidden) return;
    c.hidden = true;
    if (refocus !== false && cardFrom) cardFrom.focus();
    cardFor = null;
  }

  /* ---------- Doors ---------- */
  function toggleDoor(btn, force) {
    var open = typeof force === 'boolean' ? force : btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    var target = $(btn.getAttribute('aria-controls'));
    target.classList.toggle('open', open);
    if (open) target.removeAttribute('inert'); else target.setAttribute('inert', '');
    btn.querySelector('.sr').textContent = (open ? 'Close ' : 'Open ') + btn.dataset.what;
  }

  /* ---------- Cooking ---------- */
  function cook() {
    var s = score(), r = $('result');
    var title = s.pct < 20 ? 'A good start' : s.pct < 40 ? 'Nice rescue' : s.pct < 60 ? 'Kitchen hero' : 'Clean-fridge champion';
    $('res-title').textContent = title;
    $('res-score').textContent = s.pct + '%';
    $('res-urgent').textContent = s.usedU + ' of ' + s.totU + ' items that needed using soon went into the pot.';
    var left = $('res-left'); left.innerHTML = '';
    current.forEach(function (row, i) {
      if (row.urgent && !(choice[i] > 0)) {
        var li = document.createElement('li');
        li.innerHTML = '<span aria-hidden="true">' + row.icon.emo + '</span> ';
        li.appendChild(document.createTextNode(nameOf(row) + ' (' + line(row) + ')'));
        left.appendChild(li);
      }
    });
    $('res-left-wrap').hidden = !left.children.length;
    r.hidden = false;
    $('res-again').focus();
  }

  function stock() {
    current = draw(country);
    choice = current.map(function () { return 0; });
    $('result').hidden = true; closeCard(false);
    $('kitchen').classList.add('stocked');
    $('open').textContent = 'Restock the kitchen';
    render();
  }

  function setCountry(c) {
    country = c;
    document.querySelectorAll('.region').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
    $('local-label').textContent = c === 'UK' ? 'Shown in English' : 'Show in ' + REG[c].lang;
    $('local').disabled = c === 'UK';
    stock();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.door').forEach(function (d) {
      d.addEventListener('click', function () { toggleDoor(d); });
    });
    $('card').addEventListener('click', function (e) {
      var v = e.target.closest('[data-v]');
      if (v && cardFor !== null) setChoice(cardFor, +v.dataset.v, +v.dataset.v > 0 ? cardFrom : null);
      if (e.target.closest('.card-close')) closeCard();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeCard(); if (!$('result').hidden) $('result').hidden = true; }
    });
    $('cook').addEventListener('click', cook);
    $('res-again').addEventListener('click', function () { $('result').hidden = true; $('cook').focus(); });
    $('res-restock').addEventListener('click', function () { stock(); $('open').focus(); });
    fetch('items.json').then(function (r) { return r.json(); }).then(function (d) {
      DB = d;
      document.querySelectorAll('.region').forEach(function (b) {
        b.addEventListener('click', function () { setCountry(b.dataset.c); });
      });
      $('open').addEventListener('click', stock);
      $('local').addEventListener('change', function () { if (current) update(); });
      stock();
    }).catch(function () {
      $('open').disabled = true; $('open').textContent = 'Could not load the kitchen data';
    });
  });
})();
