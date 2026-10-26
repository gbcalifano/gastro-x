/* GASTRO-X demo: stock a kitchen live from items.json with the rules used for the study scenarios
   (slot template, purchase-weighted draws, typical-set selection, waste-weighted at-risk items).
   The visitor cooks dinner for two; the food at risk and the score are revealed only when dinner is served. */
(function () {
  'use strict';
  var K_ATRISK = 6, N_CAND = 400, TOP = 0.10;
  var URGENT_OPENED_KEYS = { tinned: 1, condiment: 1, meal: 1, cake: 1, bread: 1 };
  var MEAL_MIN = 400, MEAL_MAX = 2000;   // grams; 2,000 g is the threshold used in the preregistration
  var LANG_OF = { IT: 'IT', DE: 'DE', PL: 'PL', UK: 'EN' };
  var NATIVE = { IT: 'Italiano', DE: 'Deutsch', PL: 'Polski' };
  var DEC = { EN: '.', IT: ',', DE: ',', PL: ',' };

  /* ---------- Interface text ---------- */
  var T = {
    EN: {
      kicker: 'Demo', title: 'What’s for dinner?',
      sub: 'A kitchen like the ones in our study, stocked from what households buy and what they throw away. Cook dinner for two with what you find.',
      why: 'In the EU, households throw away about 70 kg of food per person a year: more than half of all food waste (Eurostat, 2022 data).',
      choose: 'Choose a kitchen', newk: 'New kitchen',
      area_IT: 'Southern Europe', area_DE: 'Western Europe', area_PL: 'Eastern Europe', area_UK: 'Northern Europe',
      c_IT: 'Italy', c_DE: 'Germany', c_PL: 'Poland', c_UK: 'United Kingdom',
      in_IT: 'in Italy', in_DE: 'in Germany', in_PL: 'in Poland', in_UK: 'in the United Kingdom',
      note: 'A typical kitchen {in}: 20 foods.',
      instr: 'Cook dinner for two: a main course, with a side dish if you like. Tap a food once to use part of it, twice to use all of it, a third time to put it back.',
      z_fridge: 'Fridge and freezer', z_cupboard: 'Cupboard', z_counter: 'Bread, fruit and vegetables',
      pot_none: 'Nothing in the pot yet', foods: function (n) { return n === 1 ? '1 food' : n + ' foods'; },
      about: 'about {kg}', light: 'a light meal', ok: 'enough for two', much: 'too much for two',
      serve: 'Serve dinner', use: ['not used', 'part of it', 'all of it'], tap: 'Tap to change.',
      h_all: 'Nothing left to waste', h_good: 'Good rescue', h_some: 'Some food saved', h_feast: 'A feast',
      res_line: 'Your dinner used {u} of the {t} foods that were about to go to waste.',
      feast_line: ' But at about {kg} it is more than two people would eat.',
      score_label: 'Rescue score', score_expl: 'The share of the food likely to be thrown away that your dinner uses.',
      fact: 'Of the foods at risk here, households waste {food} most often: about {r}% of what they buy (UK data).',
      study: 'In the study, home cooks in four countries and three AI models cook from kitchens like this one. Who leaves less food to waste? The results will appear on this site.',
      again: 'Try this kitchen again', another: 'Another kitchen', saved: 'rescued', binned: 'left to waste',
      opened: 'opened', tin: ['1 tin', '½ tin'],
      ex_sum: 'How the score works',
      ex_p1: 'The score is the study’s waste-weighted use index. Every food carries a weight: the chance that it ends up in the bin if dinner does not use it. Food that is sprouting, wilting or going stale, food with a use-by date tomorrow, opened perishable packs and yesterday’s leftovers count fully (weight 1). Everything else counts by how often UK households throw that food away: about 0.41 for potatoes, 0.26 for bread, 0.05 for milk. The score is the weighted share of the kitchen that dinner uses, counting “part of it” as half.',
      ex_p2: 'The weight of dinner is a rough estimate from typical pack sizes. Above 2 kg it is more than two people would eat; the study uses the same threshold to check that a high score does not come from cooking everything at once.',
      st_h: 'How a kitchen is stocked',
      st_1: '<strong>Shelves.</strong> Every kitchen has the same 19 places: bread, a cake or pizza, two staples, three meats, a fish, three dairy items, two fruits, four vegetables, a tin or frozen bag, a sauce or snack. A fixed layout keeps kitchens comparable across countries.',
      st_2: '<strong>What people buy.</strong> Each place is filled by a weighted draw from national household budget statistics: the more households spend on a food, the more often it turns up. The draw is repeated hundreds of times and one of the most typical kitchens is kept.',
      st_3: '<strong>What people throw away.</strong> Six foods are then put at risk, drawn in proportion to how much of each food households waste: salad, potatoes and bread far more often than rice or milk.',
      st_4: '<strong>A leftover.</strong> Cooked food is one of the largest shares of household food waste, so every kitchen also has yesterday’s leftovers.',
      st_src: 'The 20 kitchens used in the study were drawn once, in advance, with the same rules, and are not shown here. Sources: DEFRA Family Food (UK, 2024/25), Destatis EVS 2018 (Germany), Statistics Poland Household Budget Survey 2024, ISTAT household expenditure and price basket 2025 (Italy), Eurostat HICP item weights, WRAP household food waste in the UK 2022. Quantities are typical shop packs. The code is open and will be released with the benchmark.'
    },
    IT: {
      kicker: 'Demo', title: 'Cosa c’è per cena?',
      sub: 'Una cucina come quelle del nostro studio, rifornita con quello che le famiglie comprano e con quello che buttano. Prepara la cena per due con quello che trovi.',
      why: 'Nell’Unione europea le famiglie buttano circa 70 kg di cibo a persona ogni anno: più della metà di tutto lo spreco alimentare (Eurostat, dati 2022).',
      choose: 'Scegli una cucina', newk: 'Nuova cucina',
      area_IT: 'Europa meridionale', area_DE: 'Europa occidentale', area_PL: 'Europa orientale', area_UK: 'Europa settentrionale',
      c_IT: 'Italia', c_DE: 'Germania', c_PL: 'Polonia', c_UK: 'Regno Unito',
      in_IT: 'in Italia', in_DE: 'in Germania', in_PL: 'in Polonia', in_UK: 'nel Regno Unito',
      note: 'Una cucina tipica {in}: 20 alimenti.',
      instr: 'Prepara la cena per due: un piatto principale, con un contorno se vuoi. Tocca un alimento una volta per usarne una parte, due volte per usarlo tutto, una terza volta per rimetterlo a posto.',
      z_fridge: 'Frigorifero e freezer', z_cupboard: 'Dispensa', z_counter: 'Pane, frutta e verdura',
      pot_none: 'La pentola è ancora vuota', foods: function (n) { return n === 1 ? '1 alimento' : n + ' alimenti'; },
      about: 'circa {kg}', light: 'un pasto leggero', ok: 'giusto per due', much: 'troppo per due',
      serve: 'Servi la cena', use: ['non usato', 'una parte', 'tutto'], tap: 'Tocca per cambiare.',
      h_all: 'Niente da buttare', h_good: 'Bel salvataggio', h_some: 'Qualcosa si è salvato', h_feast: 'Un banchetto',
      res_line: 'La tua cena ha usato {u} dei {t} alimenti che stavano per finire nella spazzatura.',
      feast_line: ' Ma con circa {kg} è più di quanto mangerebbero due persone.',
      score_label: 'Punteggio di recupero', score_expl: 'La quota del cibo che rischiava di finire nella spazzatura usata dalla tua cena.',
      fact: 'Tra gli alimenti a rischio in questa cucina, quello che le famiglie buttano più spesso: {food}, circa il {r}% di quanto ne comprano (dati del Regno Unito).',
      study: 'Nello studio, persone che cucinano a casa in quattro Paesi e tre modelli di intelligenza artificiale cucinano con cucine come questa. Chi lascia meno cibo da buttare? I risultati saranno pubblicati su questo sito.',
      again: 'Riprova con questa cucina', another: 'Un’altra cucina', saved: 'salvato', binned: 'da buttare',
      opened: 'confezione aperta', tin: ['1 scatola', '½ scatola'],
      ex_sum: 'Come funziona il punteggio',
      ex_p1: 'Il punteggio è l’indice usato nello studio. Ogni alimento ha un peso: la probabilità che finisca nella spazzatura se la cena non lo usa. Il cibo con germogli, appassito o raffermo, quello che scade domani, le confezioni aperte di prodotti deperibili e gli avanzi di ieri pesano 1. Tutto il resto pesa quanto spesso le famiglie britanniche buttano quell’alimento: circa 0,41 per le patate, 0,26 per il pane, 0,05 per il latte. Il punteggio è la quota pesata della cucina usata dalla cena, contando “una parte” come metà.',
      ex_p2: 'Il peso della cena è una stima approssimativa basata sulle confezioni tipiche. Sopra i 2 kg è più di quanto mangerebbero due persone; nello studio la stessa soglia serve a controllare che un punteggio alto non venga dal cucinare tutto insieme.',
      st_h: 'Come si rifornisce una cucina',
      st_1: '<strong>Scaffali.</strong> Ogni cucina ha gli stessi 19 posti: pane, un dolce o una pizza, due alimenti di base, tre di carne, un pesce, tre latticini, due frutti, quattro verdure, una scatola o una busta di surgelati, una salsa o uno snack. Uno schema fisso rende le cucine confrontabili tra Paesi.',
      st_2: '<strong>Cosa si compra.</strong> Ogni posto viene riempito con un’estrazione basata sulle statistiche nazionali della spesa delle famiglie: più le famiglie spendono per un alimento, più spesso compare. L’estrazione si ripete centinaia di volte e si tiene una delle cucine più tipiche.',
      st_3: '<strong>Cosa si butta.</strong> Sei alimenti vengono poi messi a rischio, estratti in proporzione a quanto le famiglie ne sprecano: insalata, patate e pane molto più spesso di riso o latte.',
      st_4: '<strong>Un avanzo.</strong> Il cibo cucinato è una delle quote più grandi dello spreco domestico, quindi ogni cucina ha anche gli avanzi di ieri.',
      st_src: 'Le 20 cucine usate nello studio sono state estratte una volta, in anticipo, con le stesse regole, e non sono mostrate qui. Fonti: DEFRA Family Food (Regno Unito, 2024/25), Destatis EVS 2018 (Germania), Statistics Poland Household Budget Survey 2024, ISTAT spesa delle famiglie e paniere dei prezzi 2025 (Italia), pesi HICP di Eurostat, WRAP Household food waste in the UK 2022. Le quantità sono confezioni tipiche. Il codice è aperto e sarà pubblicato insieme al benchmark.'
    },
    DE: {
      kicker: 'Demo', title: 'Was gibt’s zum Abendessen?',
      sub: 'Eine Küche wie in unserer Studie, gefüllt nach dem, was Haushalte kaufen und was sie wegwerfen. Kochen Sie ein Abendessen für zwei mit dem, was Sie finden.',
      why: 'In der EU werfen Haushalte pro Person und Jahr rund 70 kg Lebensmittel weg: mehr als die Hälfte aller Lebensmittelabfälle (Eurostat, Daten für 2022).',
      choose: 'Wählen Sie eine Küche', newk: 'Neue Küche',
      area_IT: 'Südeuropa', area_DE: 'Westeuropa', area_PL: 'Osteuropa', area_UK: 'Nordeuropa',
      c_IT: 'Italien', c_DE: 'Deutschland', c_PL: 'Polen', c_UK: 'Vereinigtes Königreich',
      in_IT: 'in Italien', in_DE: 'in Deutschland', in_PL: 'in Polen', in_UK: 'im Vereinigten Königreich',
      note: 'Eine typische Küche {in}: 20 Lebensmittel.',
      instr: 'Kochen Sie ein Abendessen für zwei: ein Hauptgericht, auf Wunsch mit einer Beilage. Tippen Sie einmal auf ein Lebensmittel, um einen Teil davon zu verwenden, zweimal für alles und ein drittes Mal, um es zurückzulegen.',
      z_fridge: 'Kühlschrank und Gefrierfach', z_cupboard: 'Vorratsschrank', z_counter: 'Brot, Obst und Gemüse',
      pot_none: 'Der Topf ist noch leer', foods: function (n) { return n + ' Lebensmittel'; },
      about: 'etwa {kg}', light: 'eine leichte Mahlzeit', ok: 'genug für zwei', much: 'zu viel für zwei',
      serve: 'Abendessen servieren', use: ['nicht verwendet', 'ein Teil davon', 'alles'], tap: 'Zum Ändern tippen.',
      h_all: 'Nichts mehr zu verschwenden', h_good: 'Gut gerettet', h_some: 'Einiges gerettet', h_feast: 'Ein Festmahl',
      res_line: 'Ihr Abendessen hat {u} der {t} Lebensmittel verwendet, die kurz davor waren, im Müll zu landen.',
      feast_line: ' Aber mit etwa {kg} ist es mehr, als zwei Personen essen würden.',
      score_label: 'Rettungswert', score_expl: 'Der Anteil der Lebensmittel, die wahrscheinlich im Müll gelandet wären, den Ihr Abendessen verwendet.',
      fact: 'Von den gefährdeten Lebensmitteln in dieser Küche werfen Haushalte dieses am häufigsten weg: {food}, etwa {r} % dessen, was sie kaufen (Daten aus dem Vereinigten Königreich).',
      study: 'In der Studie kochen Menschen aus vier Ländern und drei KI-Modelle mit Küchen wie dieser. Wer lässt weniger Lebensmittel verkommen? Die Ergebnisse erscheinen auf dieser Website.',
      again: 'Diese Küche noch einmal', another: 'Eine andere Küche', saved: 'gerettet', binned: 'landet im Müll',
      opened: 'angebrochen', tin: ['1 Dose', '½ Dose'],
      ex_sum: 'So funktioniert der Wert',
      ex_p1: 'Der Wert ist der Index, den die Studie verwendet. Jedes Lebensmittel hat ein Gewicht: die Wahrscheinlichkeit, dass es im Müll landet, wenn das Abendessen es nicht verwendet. Lebensmittel mit Keimen, welken Blättern oder altbacken, mit Verbrauchsdatum morgen, angebrochene verderbliche Packungen und Reste von gestern zählen voll (Gewicht 1). Alles andere zählt danach, wie oft britische Haushalte dieses Lebensmittel wegwerfen: etwa 0,41 bei Kartoffeln, 0,26 bei Brot, 0,05 bei Milch. Der Wert ist der gewichtete Anteil der Küche, den das Abendessen verwendet; „ein Teil davon“ zählt zur Hälfte.',
      ex_p2: 'Das Gewicht des Abendessens ist eine grobe Schätzung aus typischen Packungsgrößen. Über 2 kg ist es mehr, als zwei Personen essen würden; die Studie prüft mit derselben Schwelle, dass ein hoher Wert nicht daher kommt, alles auf einmal zu kochen.',
      st_h: 'Wie eine Küche gefüllt wird',
      st_1: '<strong>Regale.</strong> Jede Küche hat dieselben 19 Plätze: Brot, ein Kuchen oder eine Pizza, zwei Grundnahrungsmittel, drei Fleischprodukte, ein Fisch, drei Milchprodukte, zwei Obstsorten, vier Gemüse, eine Dose oder ein Tiefkühlbeutel, eine Soße oder ein Snack. Ein festes Schema macht die Küchen zwischen Ländern vergleichbar.',
      st_2: '<strong>Was gekauft wird.</strong> Jeder Platz wird per Zufallsziehung aus den nationalen Statistiken zu den Haushaltsausgaben gefüllt: Je mehr Haushalte für ein Lebensmittel ausgeben, desto öfter taucht es auf. Die Ziehung wird hunderte Male wiederholt, und eine der typischsten Küchen wird behalten.',
      st_3: '<strong>Was weggeworfen wird.</strong> Danach werden sechs Lebensmittel gefährdet, gezogen im Verhältnis dazu, wie viel Haushalte davon verschwenden: Salat, Kartoffeln und Brot viel häufiger als Reis oder Milch.',
      st_4: '<strong>Ein Rest.</strong> Gekochtes Essen ist einer der größten Anteile der Lebensmittelabfälle im Haushalt, deshalb hat jede Küche auch Reste von gestern.',
      st_src: 'Die 20 Küchen der Studie wurden einmal im Voraus nach denselben Regeln gezogen und werden hier nicht gezeigt. Quellen: DEFRA Family Food (Vereinigtes Königreich, 2024/25), Destatis EVS 2018 (Deutschland), Statistics Poland Household Budget Survey 2024, ISTAT Haushaltsausgaben und Preiswarenkorb 2025 (Italien), Eurostat HVPI-Gewichte, WRAP Household food waste in the UK 2022. Die Mengen sind typische Packungsgrößen. Der Code ist offen und wird mit dem Benchmark veröffentlicht.'
    },
    PL: {
      kicker: 'Demo', title: 'Co na kolację?',
      sub: 'Kuchnia taka jak w naszym badaniu, zaopatrzona według tego, co gospodarstwa domowe kupują i co wyrzucają. Przygotuj kolację dla dwóch osób z tego, co znajdziesz.',
      why: 'W UE gospodarstwa domowe wyrzucają około 70 kg jedzenia na osobę rocznie: ponad połowę całego marnowanego jedzenia (Eurostat, dane za 2022 r.).',
      choose: 'Wybierz kuchnię', newk: 'Nowa kuchnia',
      area_IT: 'Europa Południowa', area_DE: 'Europa Zachodnia', area_PL: 'Europa Wschodnia', area_UK: 'Europa Północna',
      c_IT: 'Włochy', c_DE: 'Niemcy', c_PL: 'Polska', c_UK: 'Wielka Brytania',
      in_IT: 'we Włoszech', in_DE: 'w Niemczech', in_PL: 'w Polsce', in_UK: 'w Wielkiej Brytanii',
      note: 'Typowa kuchnia {in}: 20 produktów.',
      instr: 'Przygotuj kolację dla dwóch osób: danie główne, jeśli chcesz z dodatkiem. Dotknij produktu raz, aby użyć jego części, dwa razy, aby użyć całości, a trzeci raz, aby go odłożyć.',
      z_fridge: 'Lodówka i zamrażarka', z_cupboard: 'Szafka', z_counter: 'Pieczywo, owoce i warzywa',
      pot_none: 'Garnek jest jeszcze pusty',
      foods: function (n) { var m10 = n % 10, m100 = n % 100; return n + (n === 1 ? ' produkt' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? ' produkty' : ' produktów'); },
      about: 'około {kg}', light: 'lekki posiłek', ok: 'w sam raz dla dwóch osób', much: 'za dużo dla dwóch osób',
      serve: 'Podaj kolację', use: ['nieużyte', 'część', 'całość'], tap: 'Dotknij, aby zmienić.',
      h_all: 'Nic do wyrzucenia', h_good: 'Dobry ratunek', h_some: 'Coś udało się uratować', h_feast: 'Uczta',
      res_line: 'Twoja kolacja wykorzystała {u} z {t} produktów, które miały trafić do kosza.',
      feast_line: ' Ale przy około {kg} to więcej, niż zjadłyby dwie osoby.',
      score_label: 'Wynik ratowania', score_expl: 'Część jedzenia zagrożonego wyrzuceniem, którą wykorzystuje twoja kolacja.',
      fact: 'Spośród zagrożonych produktów w tej kuchni gospodarstwa domowe najczęściej wyrzucają ten: {food}, około {r}% tego, co kupują (dane z Wielkiej Brytanii).',
      study: 'W badaniu osoby gotujące w domu w czterech krajach i trzy modele sztucznej inteligencji gotują z kuchni takich jak ta. Kto zostawi mniej jedzenia do wyrzucenia? Wyniki pojawią się na tej stronie.',
      again: 'Spróbuj jeszcze raz z tą kuchnią', another: 'Inna kuchnia', saved: 'uratowane', binned: 'do wyrzucenia',
      opened: 'otwarte opakowanie', tin: ['1 puszka', '½ puszki'],
      ex_sum: 'Jak działa wynik',
      ex_p1: 'Wynik to wskaźnik używany w badaniu. Każdy produkt ma wagę: prawdopodobieństwo, że trafi do kosza, jeśli kolacja go nie wykorzysta. Produkty z kiełkami, zwiędnięte lub czerstwe, z terminem ważności jutro, otwarte opakowania produktów łatwo psujących się i resztki z wczoraj liczą się w pełni (waga 1). Pozostałe liczą się według tego, jak często brytyjskie gospodarstwa domowe wyrzucają dany produkt: około 0,41 dla ziemniaków, 0,26 dla chleba, 0,05 dla mleka. Wynik to ważony udział kuchni, który wykorzystuje kolacja; „część” liczy się jako połowa.',
      ex_p2: 'Waga kolacji to przybliżone oszacowanie na podstawie typowych opakowań. Powyżej 2 kg to więcej, niż zjadłyby dwie osoby; badanie używa tego samego progu, aby sprawdzić, czy wysoki wynik nie bierze się z ugotowania wszystkiego naraz.',
      st_h: 'Jak zaopatrujemy kuchnię',
      st_1: '<strong>Półki.</strong> Każda kuchnia ma te same 19 miejsc: pieczywo, ciasto lub pizzę, dwa produkty podstawowe, trzy mięsne, rybę, trzy nabiałowe, dwa owoce, cztery warzywa, puszkę lub mrożonkę, sos lub przekąskę. Stały układ pozwala porównywać kuchnie między krajami.',
      st_2: '<strong>Co się kupuje.</strong> Każde miejsce wypełnia losowanie oparte na krajowych statystykach wydatków gospodarstw domowych: im więcej gospodarstwa wydają na produkt, tym częściej się pojawia. Losowanie powtarza się setki razy i zostaje jedna z najbardziej typowych kuchni.',
      st_3: '<strong>Co się wyrzuca.</strong> Następnie sześć produktów staje się zagrożonych, losowanych proporcjonalnie do tego, ile gospodarstwa domowe ich marnują: sałata, ziemniaki i chleb znacznie częściej niż ryż czy mleko.',
      st_4: '<strong>Resztki.</strong> Ugotowane jedzenie to jedna z największych części marnowanego jedzenia w domach, dlatego w każdej kuchni są też resztki z wczoraj.',
      st_src: 'Dwadzieścia kuchni użytych w badaniu wylosowano raz, z wyprzedzeniem, według tych samych zasad; nie są tu pokazane. Źródła: DEFRA Family Food (Wielka Brytania, 2024/25), Destatis EVS 2018 (Niemcy), Budżety gospodarstw domowych GUS 2024, ISTAT wydatki gospodarstw domowych i koszyk cen 2025 (Włochy), wagi HICP Eurostatu, WRAP Household food waste in the UK 2022. Ilości to typowe opakowania. Kod jest otwarty i zostanie opublikowany razem z benchmarkiem.'
    }
  };

  var DB = null, country = 'IT', lang = 'EN', current = null, choice = [], mode = 'play';
  var $ = function (id) { return document.getElementById(id); };
  function t(k) { return T[lang][k]; }
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  /* ---------- Drawing a kitchen (same rules as the study) ---------- */
  function esPick(weights, k) {
    var keys = weights.map(function (w, i) { return { i: i, k: Math.pow(Math.random(), 1 / w) }; });
    keys.sort(function (a, b) { return b.k - a.k; });
    return keys.slice(0, k).map(function (x) { return x.i; });
  }
  function candidate(items) {
    var picked = [], lp = 0;
    DB.slots.forEach(function (s) {
      var pool = items.filter(function (it) { return it.slot === s.id; });
      esPick(pool.map(function (it) { return it.w; }), s.n).forEach(function (j) { picked.push(pool[j]); lp += Math.log(pool[j].p); });
    });
    return { items: picked, lp: lp };
  }
  function niceHalf(q) {
    var h = q / 2; if (h < 20) return Math.max(1, Math.round(h));
    var step = h > 200 ? 50 : 10; return Math.max(step, Math.round(h / step) * step);
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
      var urgent = st === 'past' || st === 'useby' || (st === 'opened' && (it.storage === 'C' || URGENT_OPENED_KEYS[it.key]));
      var q = it.q, g = it.g;
      if (st === 'opened') { q = it.unit === 'pcs' ? (it.q >= 2 ? Math.ceil(it.q / 2) : 0.5) : niceHalf(it.q); g = it.g / 2; }
      return { it: it, st: st, urgent: urgent, w: urgent ? 1 : it.rate, q: q, g: g };
    });
    var lo = data.leftovers[Math.floor(Math.random() * data.leftovers.length)];
    rows.push({ it: { slot: 'L', key: 'leftover', en: lo.en, loc: lo.loc, storage: 'C' }, st: 'left', urgent: true, w: 1, q: 2, g: 500 });
    rows.forEach(function (r) { r.zone = (r.it.slot === 'L' || r.it.storage === 'C' || r.it.storage === 'Z') ? 'fridge' : r.it.storage === 'P' ? 'counter' : 'cupboard'; });
    return rows;
  }

  /* ---------- Food text: quantity and state only, as in the study scenarios ---------- */
  function isTin(it) { return it.unit === 'pcs' && /tin|Dose|puszk|scatola/i.test(it.en + ' ' + it.loc); }
  function nameOf(row) {
    var n = lang === 'EN' ? row.it.en : row.it.loc;
    return n.replace(/ \((Dose|puszka)\)/, '').replace(' in scatola', '').replace(' (', ', ').replace(')', '');
  }
  function qtyText(row) {
    var it = row.it, q = row.q;
    if (isTin(it)) {
      var tn = (lang === 'IT' && /^Tonno/.test(it.loc)) ? ['1 scatoletta', '½ scatoletta'] : t('tin');
      return q < 1 ? tn[1] : tn[0];
    }
    if (it.unit === 'pcs') return q >= 1 ? String(q) : '½';
    if (it.unit === 'ml' && q === 2272) return lang === 'EN' ? '4 pints' : '2,3 l';
    if (q >= 1000) return String(Math.round(q / 10) / 100).replace('.', DEC[lang]) + (it.unit === 'g' ? ' kg' : ' l');
    return q + ' ' + it.unit;
  }
  function detail(row) {
    var st = lang === 'EN' ? DB.countries[country].state.en : DB.countries[country].state.loc, it = row.it, s = '';
    if (row.st === 'left') return { q: st.portions, s: st.left };
    if (row.st === 'past') s = lang === 'EN' ? it.pastEn : it.pastLoc;
    else if (row.st === 'useby') s = st.useby;
    else if (row.st === 'opened' && row.urgent && !(it.unit === 'pcs' && row.q < 1)) s = t('opened');
    return { q: qtyText(row), s: s };
  }
  function kg(g) {
    var s = g >= 1000 ? String(Math.round(g / 100) / 10).replace('.', DEC[lang]) + ' kg' : Math.round(g / 50) * 50 + ' g';
    return s;
  }

  /* ---------- Icons: one line drawing per food type ---------- */
  var P = {
    bread: 'M5 19c0-6 4-9 11-9s11 3 11 9v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z M11 13l2 3 M16 12l2 3 M21 13l2 3',
    cake: 'M6 15h20v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z M6 15c2-4 18-4 20 0 M6 20h20 M16 7v4',
    pizza: 'M16 5 5 26h22z M7 22c6 2 12 2 18 0 M14 14h0 M18 18h0 M13 20h0',
    pasta: 'M11 5l3 22 M14 5l2 22 M18 5v22 M21 5l-2 22 M10 16h12',
    rice: 'M5 15h22a11 11 0 0 1-22 0z M8 15c2-5 14-5 16 0 M13 11l1 1 M17 10l1 1 M20 12l1 1',
    staple: 'M10 7h12l-1 4c4 3 5 8 5 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2c0-5 1-10 5-13z M11 11h10',
    cereal: 'M9 5h14v22H9z M12 16c2 2 6 2 8 0 M12 10h8',
    meat: 'M5 12c3-3 7-4 11-3s8 0 11 2v10c-3 2-7 3-11 2s-8 0-11 2z M5 17c3-2 7-3 11-2s8 0 11-1',
    poultry: 'M21 5a7 7 0 1 1-4 13l-7 7 M10 25a2 2 0 1 1-3-1 M8 23a2 2 0 1 1-1-3',
    fish: 'M4 16c4-6 12-8 18-4l6-4v16l-6-4c-6 4-14 2-18-4z M9 15h0',
    tin: 'M8 8c0 2 4 3 8 3s8-1 8-3-4-3-8-3-8 1-8 3z M8 8v16c0 2 4 3 8 3s8-1 8-3V8 M8 14c2 1.5 14 1.5 16 0 M8 19c2 1.5 14 1.5 16 0',
    jar: 'M10 5h12v4H10z M9 9h14a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V11a2 2 0 0 1 2-2z M10 15h12',
    milk: 'M10 11l3-6h6l3 6v16H10z M10 11h12 M13 5l3 6',
    yoghurt: 'M7 8h18v3H7z M8 11h16l-2 15H10z',
    cheese: 'M5 23 25 10v13z M5 23h20 M14 19h0 M20 16h0 M19 21h0',
    eggs: 'M11 26c-3 0-5-3-5-7s2-9 5-9 5 5 5 9-2 7-5 7z M21 26c-3 0-5-3-5-7s2-9 5-9 5 5 5 9-2 7-5 7z',
    fat: 'M5 16l9-5h13v7l-9 5H5z M5 16h13l9-5 M18 16v7',
    cream: 'M13 4h6v4l3 4v15H10V12l3-4z M10 16h12',
    apple: 'M16 11c-3-3-10-2-10 6s5 11 10 9c5 2 10-1 10-9s-7-9-10-6z M16 11c0-3 1-5 3-6 M18 7c2-2 4-2 5-1',
    pear: 'M16 7c-2 0-3 3-3 6-3 2-6 5-6 8a9 9 0 0 0 18 0c0-3-3-6-6-8 0-3-1-6-3-6z M16 7c0-2 1-3 2-4',
    banana: 'M6 9c1 9 9 16 21 12-9-1-15-6-17-13z M5 9l3-2',
    citrus: 'M16 7a9 9 0 1 0 0.1 0 M16 16V7 M16 16l7 5 M16 16l-7 5 M16 16l8-4 M16 16l-8-4',
    grapes: 'M13 12a3 3 0 1 0 0.1 0 M19 12a3 3 0 1 0 0.1 0 M16 17a3 3 0 1 0 0.1 0 M10 17a3 3 0 1 0 0.1 0 M22 17a3 3 0 1 0 0.1 0 M13 22a3 3 0 1 0 0.1 0 M19 22a3 3 0 1 0 0.1 0 M16 9V5l3-1',
    fruit: 'M16 6a10 10 0 1 0 0.1 0 M16 11a5 5 0 1 0 0.1 0 M22 16h0 M10 16h0 M16 24h0',
    potato: 'M7 18c-1-6 4-10 10-10s10 3 9 9-6 9-11 8-7-2-8-7z M12 15h0 M19 13h0 M17 21h0',
    onion: 'M16 5c-1 3-9 6-9 14a9 9 0 0 0 18 0c0-8-8-11-9-14z M16 9c-2 4-3 8-3 15 M16 9c2 4 3 8 3 15',
    carrot: 'M23 9 9 26c-1 1-3-1-2-2L22 8z M22 8l2-4 M23 9l4-1 M22 8l-1-4 M12 19l2 1 M16 15l2 1',
    tomato: 'M16 9a9 9 0 1 0 0.1 0 M12 9l4 2 4-2 M16 11V6',
    salad: 'M16 26c-7 0-11-4-11-9 0-3 2-5 4-6 0-3 3-5 7-5s7 2 7 5c2 1 4 3 4 6 0 5-4 9-11 9z M16 26V11 M16 18l-4-3 M16 21l4-3',
    brassica: 'M11 13a4 4 0 1 0 0.1 0 M16 10a4.5 4.5 0 1 0 0.1 0 M21 13a4 4 0 1 0 0.1 0 M14 18l1 8h2l1-8',
    cabbage: 'M16 6a10 10 0 1 0 0.1 0 M16 6c-4 4-4 16 0 20 M16 6c4 4 4 16 0 20 M7 13c4 2 14 2 18 0',
    cucumber: 'M6 22c-2-2 0-5 3-8l8-8c3-3 6-4 8-2s1 5-2 8l-8 8c-3 3-7 4-9 2z M12 17h0 M16 13h0 M20 9h0',
    pepper: 'M10 11c-3 2-4 6-3 10 1 4 4 6 9 6s8-2 9-6c1-4 0-8-3-10-2-1-4 0-6 0s-4-1-6 0z M16 11V7c0-1 1-2 3-2',
    mushroom: 'M5 16a11 9 0 0 1 22 0z M12 16v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8',
    veg: 'M6 23c6-2 12-8 16-16 2 6-2 16-12 18z M12 19h0 M16 15h0 M19 11h0',
    bag: 'M8 6h16l-1 3 2 17H7L9 9z M9 9h14 M16 14v8 M12.5 16l7 4 M19.5 16l-7 4',
    tray: 'M4 13h24v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z M13 13v12 M4 13l2-3h20l2 3',
    nuts: 'M11 9a6 7 0 1 0 0.1 0 M11 9v14 M21 13a5 6 0 1 0 0.1 0',
    leftover: 'M4 11h24v3H4z M5 14h22v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z M12 6c0 2 2 2 2 4 M18 6c0 2 2 2 2 4'
  };
  var KEY = { bread: 'bread', cake: 'cake', pasta: 'pasta', rice: 'rice', staple: 'staple', cereal: 'cereal',
    beef: 'meat', pork: 'meat', poultry: 'poultry', fish: 'fish', tinned: 'tin', milk: 'milk', yoghurt: 'yoghurt',
    cheese: 'cheese', eggs: 'eggs', fat: 'fat', cream: 'cream', apple: 'apple', pear: 'pear', banana: 'banana',
    citrus: 'citrus', grapes: 'grapes', fruit_other: 'fruit', potato: 'potato', onion: 'onion', carrot: 'carrot',
    tomato: 'tomato', salad: 'salad', brassica: 'brassica', cabbage: 'cabbage', cucumber: 'cucumber', pepper: 'pepper',
    mushroom: 'mushroom', veg_other: 'veg', frozen_veg: 'bag', processed_veg: 'bag', condiment: 'jar', meal: 'tray',
    snack: 'nuts', leftover: 'leftover' };
  function iconFor(it) {
    var en = it.en.toLowerCase(), k = KEY[it.key] || 'veg';
    if (/pizza/.test(en)) k = 'pizza';
    else if (/jar|olive|pickled|gherkin|pesto|pur[eé]e|concentrate|passata|ketchup|mayonnaise/.test(en)) k = 'jar';
    else if (/frozen/.test(en) && k !== 'fish') k = 'bag';
    else if (/soup/.test(en)) k = 'tray';
    else if (/stock|herb|oregano|marjoram|paprika/.test(en)) k = 'jar';
    return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="' + P[k] + '"/></svg>';
  }

  /* ---------- Page text ---------- */
  function applyText() {
    document.documentElement.lang = { EN: 'en-GB', IT: 'it', DE: 'de', PL: 'pl' }[lang];
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') { if (v.indexOf('<') >= 0) el.innerHTML = v; else el.textContent = v; }
    });
    $('lang-en').setAttribute('aria-pressed', String(lang === 'EN'));
    $('lang-loc').setAttribute('aria-pressed', String(lang !== 'EN'));
    if (current) { $('kitchen-note').textContent = fill(t('note'), { 'in': t('in_' + country) }); update(); if (mode === 'reveal') reveal(); }
  }
  function setLang(l) { lang = l; applyText(); }

  /* ---------- Rendering and play ---------- */
  function render() {
    ['fridge', 'cupboard', 'counter'].forEach(function (z) { $('z-' + z).innerHTML = ''; });
    current.forEach(function (row, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'food'; b.dataset.i = i;
      b.innerHTML = '<span class="ico">' + iconFor(row.it) + '</span><span class="txt"><span class="fname"></span><span class="fdet"></span><span class="fverdict"></span></span><span class="use" aria-hidden="true"><span class="pie"></span></span>';
      b.addEventListener('click', function () { if (mode === 'play') { choice[i] = (choice[i] + 1) % 3; update(); } });
      $('z-' + row.zone).appendChild(b);
    });
    $('kitchen-note').textContent = fill(t('note'), { 'in': t('in_' + country) });
    update();
  }
  function update() {
    document.querySelectorAll('.food').forEach(function (b) {
      var i = +b.dataset.i, row = current[i], d = detail(row), c = choice[i];
      b.querySelector('.fname').textContent = nameOf(row);
      b.querySelector('.fdet').textContent = d.q + (d.s ? ', ' + d.s : '');
      b.dataset.use = c;
      b.setAttribute('aria-pressed', c > 0 ? 'true' : 'false');
      b.setAttribute('aria-label', nameOf(row) + ', ' + d.q + (d.s ? ', ' + d.s : '') + '. ' + t('use')[c] + '. ' + (mode === 'play' ? t('tap') : ''));
    });
    var n = 0, grams = 0;
    current.forEach(function (r, i) { var f = choice[i] === 2 ? 1 : choice[i] === 1 ? 0.5 : 0; if (f) { n++; grams += r.g * f; } });
    var size = grams < MEAL_MIN ? t('light') : grams > MEAL_MAX ? t('much') : t('ok');
    $('pot-txt').textContent = n ? t('foods')(n) + ' · ' + fill(t('about'), { kg: kg(grams) }) + ', ' + size : t('pot_none');
    $('pot').classList.toggle('warn', grams > MEAL_MAX);
    $('cook').disabled = n === 0;
  }

  function score() {
    var sw = 0, swf = 0, u = 0, tot = 0, grams = 0;
    current.forEach(function (r, i) {
      var f = choice[i] === 2 ? 1 : choice[i] === 1 ? 0.5 : 0;
      sw += r.w; swf += r.w * f; grams += r.g * f;
      if (r.urgent) { tot++; if (f) u++; }
    });
    return { pct: Math.round(swf / sw * 100), u: u, t: tot, grams: grams };
  }
  function reveal() {
    var s = score();
    $('kitchen').dataset.mode = 'reveal';
    document.querySelectorAll('.food').forEach(function (b) {
      var i = +b.dataset.i, row = current[i], v = b.querySelector('.fverdict');
      b.classList.toggle('risk', row.urgent);
      b.classList.toggle('saved', row.urgent && choice[i] > 0);
      b.classList.toggle('binned', row.urgent && !choice[i]);
      v.textContent = row.urgent ? (choice[i] > 0 ? t('saved') : t('binned')) : '';
    });
    var h = s.grams > MEAL_MAX ? 'h_feast' : s.u === s.t ? 'h_all' : s.u >= s.t / 2 ? 'h_good' : 'h_some';
    $('res-title').textContent = t(h);
    $('res-line').textContent = fill(t('res_line'), { u: s.u, t: s.t }) + (s.grams > MEAL_MAX ? fill(t('feast_line'), { kg: kg(s.grams) }) : '');
    $('res-score').textContent = s.pct + '%';
    $('res-bar').style.width = s.pct + '%';
    var top = current.filter(function (r) { return r.urgent && r.it.slot !== 'L'; }).sort(function (a, b) { return b.it.rate - a.it.rate; })[0];
    if (top) {
      var nm = nameOf(top); if (lang !== 'DE') nm = nm.charAt(0).toLowerCase() + nm.slice(1);
      $('res-fact').textContent = fill(t('fact'), { food: nm, r: Math.round(top.it.rate * 100) });
    } else $('res-fact').textContent = '';
    $('result').hidden = false;
  }
  function serve() {
    mode = 'reveal'; reveal(); update();
    $('result').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    $('result').focus({ preventScroll: true });
  }
  function replay(keep) {
    mode = 'play'; $('kitchen').dataset.mode = 'play'; $('result').hidden = true;
    if (!keep) current = draw(country);
    choice = current.map(function () { return 0; });
    render();
    document.querySelectorAll('.food').forEach(function (b) { b.classList.remove('risk', 'saved', 'binned'); b.querySelector('.fverdict').textContent = ''; });
    $('kitchen').scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function setCountry(c) {
    country = c;
    document.querySelectorAll('.region').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === c)); });
    var loc = $('lang-loc');
    if (c === 'UK') { loc.hidden = true; if (lang !== 'EN') lang = 'EN'; }
    else { loc.hidden = false; loc.textContent = NATIVE[c]; if (lang !== 'EN') lang = LANG_OF[c]; }
    mode = 'play'; current = draw(country); choice = current.map(function () { return 0; });
    $('result').hidden = true; $('kitchen').dataset.mode = 'play';
    render(); applyText();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('cook').addEventListener('click', serve);
    $('res-again').addEventListener('click', function () { replay(true); });
    $('res-restock').addEventListener('click', function () { replay(false); });
    $('lang-en').addEventListener('click', function () { setLang('EN'); });
    $('lang-loc').addEventListener('click', function () { setLang(LANG_OF[country]); });
    fetch('items.json').then(function (r) { return r.json(); }).then(function (d) {
      DB = d;
      document.querySelectorAll('.region').forEach(function (b) { b.addEventListener('click', function () { setCountry(b.dataset.c); }); });
      $('open').addEventListener('click', function () { replay(false); });
      setCountry('IT');
    }).catch(function () { $('open').disabled = true; });
  });
})();
