/* ===========================================================================
   Weber Metallbau — Konzept „Vom Stapel"

   🔴 Animationstakt: ENTWEDER requestAnimationFrame ODER setTimeout, nie beide
      im selben Zweig. Im verborgenen Tab feuert rAF nicht; ein paralleler
      Zeitgeber würde bei jedem Aufruf einen weiteren rAF stapeln, und beim
      Zurückwechseln fröre die Seite ein (Romacker, 17.09.2026).
      Geprüft von system/scripts/test_konzept_takt.py.
   =========================================================================== */
(() => {
  "use strict";
  document.body.classList.add("js");
  const wenigerBewegung = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const istMobil = () => innerWidth < 900;          // 🔴 als Funktion, nie beim Laden festhalten
  const spann = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const glaetten = t => t * t * (3 - 2 * t);

  /* ------------------------------------------------- ein Takt für alle -----
     🔴 16.10.2026 (Noah: „die seite hackt ein bisschen"): gemessen am gedrosselten Handy
     erzwang jeder Frame rund sechs Layout-Neuberechnungen, weil jede Aufgabe abwechselnd
     schrieb und dann wieder getBoundingClientRect las. Seitdem hat jede Aufgabe zwei
     Hälften: ERST lesen alle (ein sauberes Layout, eine Messung), DANN schreiben alle.
     Und der Takt läuft nur noch, solange sich etwas tut (Scrollen, Maus, Funken) —
     vorher lief er dauerhaft, auch wenn die Seite stillstand.
     Eine Aufgabe ist { lesen(neu) -> daten, schreiben(daten) -> true = weiterlaufen }. */
  const takt = { aufgaben: new Set(), laeuft: false, bis: 0, stoss: true, y: -1, h: 0, w: 0 };
  function tick() {
    const neu = takt.stoss || scrollY !== takt.y || innerHeight !== takt.h || innerWidth !== takt.w;
    takt.stoss = false; takt.y = scrollY; takt.h = innerHeight; takt.w = innerWidth;
    const liste = [...takt.aufgaben];
    const daten = liste.map(a => { try { return a.lesen ? a.lesen(neu) : null; } catch (e) { return null; } });
    let weiter = neu || performance.now() < takt.bis;
    liste.forEach((a, i) => { try { if (a.schreiben(daten[i], neu)) weiter = true; } catch (e) { /* eine kaputte Aufgabe stoppt nie alle */ } });
    nachlauf.clear();
    if (!weiter || !takt.aufgaben.size) { takt.laeuft = false; return; }
    if (document.hidden) setTimeout(tick, 90);
    else requestAnimationFrame(tick);
  }
  function wecken(stoss) {
    if (stoss) takt.stoss = true;
    takt.bis = performance.now() + 220;
    if (!takt.laeuft && takt.aufgaben.size) { takt.laeuft = true; requestAnimationFrame(tick); }
  }
  function anmelden(a) {
    takt.aufgaben.add(typeof a === "function" ? { schreiben: a } : a);
    wecken(true);
  }
  addEventListener("scroll", () => wecken(), { passive: true });
  addEventListener("resize", () => wecken(true));
  addEventListener("load", () => wecken(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wecken(true); });

  // Was weit außerhalb des Fensters steht, wird gar nicht erst gemessen. Ein Element,
  // das gerade hinausgeht, bekommt noch einen letzten Frame (nachlauf), damit es in
  // seiner Endlage stehen bleibt — auch nach einem Sprung per Anker oder Ende-Taste.
  const imBild = new Set(), nachlauf = new Set();
  const sicht = "IntersectionObserver" in window ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) imBild.add(e.target); else { imBild.delete(e.target); nachlauf.add(e.target); } });
    wecken(true);
  }, { rootMargin: "25% 0px 25% 0px" }) : null;
  const beobachten = el => { if (sicht) sicht.observe(el); else imBild.add(el); };
  const aktiv = el => imBild.has(el) || nachlauf.has(el);

  /* ------------------------------------------------------------ Reveal ----- */
  // 🔴 Ein Reveal-System für die ganze Seite (03.10.2026):
  //    · die Sektion (.rv) blendet weich ein,
  //    · Raster (.st) zählen SELBST — ihre Kinder kommen gestaffelt, wenn das Raster
  //      ins Bild kommt, nicht wenn die Sektion oben anstößt (sonst ist die letzte
  //      Kachelreihe einer langen Sektion längst fertig, bevor jemand hinsieht),
  //    · Überschriften steigen Wort für Wort auf,
  //    · Bilder im Inhalt ziehen sich beim Erscheinen aus 1,12 auf 1 zusammen.
  //    Der Elternblock bewegt sich nicht, wenn seine Kinder es tun (Klasse `hat-st`) —
  //    zwei Bewegungen übereinander lesen sich als Ruckeln, nicht als Choreografie.
  document.querySelectorAll(
    ".lz-liste,.lk-gitter,.dk-gitter,.masch-gitter,.mosaik,.hs-bilder,.ap-gitter,.qs-liste," +
    ".weiter-liste,.schritte,.entfernung,.laufschiene,.kennwerte,.wa-liste,.zahlen,.br-liste," +
    ".staerken,.wegmarken,.werkstoffe,.faq-liste,.st-liste,.kb-liste,.tf-gitter," +
    ".ub-eck,.an-werte,.dicke-stoffe,.lr-gitter,.fb-zahlen").forEach(g => {
    g.classList.add("st");
    [...g.children].forEach((k, i) => k.style.setProperty("--i", Math.min(i, 9)));
    const rv = g.closest(".rv");
    if (rv && !rv.classList.contains("hero")) rv.classList.add("hat-st");
  });
  document.querySelectorAll(".naht").forEach(n => n.classList.add("rv"));

  // Überschriften Wort für Wort — nur Textknoten teilen (Skill scroll-text, Irlbacher-
  // Lernakte), und nur an normalen Leerzeichen: das geschützte Leerzeichen des
  // Waisenschutzes bindet zwei Wörter und bleibt im Wort.
  const worteTeilen = (knoten, zaehler) => {
    [...knoten.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        if (!n.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/( +|\n+)/).forEach(t => {
          if (!t) return;
          if (/^[ \n]+$/.test(t)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span");
          w.className = "wz"; w.textContent = t;
          w.style.setProperty("--w", Math.min(zaehler.n++, 14));
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !/^(SVG|BR)$/i.test(n.tagName)) worteTeilen(n, zaehler);
    });
  };
  if (!wenigerBewegung) {
    document.querySelectorAll("main section:not(.hero) h2").forEach(h => {
      if (h.closest("[data-fuell]") || h.hasAttribute("data-fuell")) return;
      worteTeilen(h, { n: 0 });
      h.classList.add("worte");
    });
  }

  const rvs = [...document.querySelectorAll(".rv")];
  const sts = [...document.querySelectorAll(".st")];
  if ("IntersectionObserver" in window && !wenigerBewegung) {
    const beo = new IntersectionObserver((eintraege) => {
      eintraege.forEach(e => { if (e.isIntersecting) { e.target.classList.add("da"); beo.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.04 });
    rvs.forEach(el => beo.observe(el));
    sts.forEach(el => beo.observe(el));
    // Sicherheitsnetz: was nach 2,2 s noch verdeckt ist, wird sichtbar gemacht —
    // aber nur, was schon über dem unteren Bildrand steht oder darüber hinaus gescrollt ist.
    // Ein Raster weiter unten soll seinen Auftritt behalten.
    const netz = () => [...rvs, ...sts].forEach(el => {
      if (!el.classList.contains("da") && el.getBoundingClientRect().top < innerHeight) el.classList.add("da");
    });
    setTimeout(netz, 2200);
    addEventListener("scroll", () => { clearTimeout(netz.t); netz.t = setTimeout(netz, 900); }, { passive: true });
  } else {
    rvs.forEach(el => el.classList.add("da"));
    sts.forEach(el => el.classList.add("da"));
  }

  /* --------------------------------------------- Bilder: Parallaxe ------------
     Große Bilder neben Text und das Hallenband bewegen sich beim Scrollen leicht
     gegen den Text — nur über `translate`, das Bild ist dafür 12 % höher als sein
     Rahmen, damit nie eine Kante sichtbar wird. Gerechnet nur, solange das Bild im
     Fenster steht. */
  const parallaxe = [...document.querySelectorAll(
    ".zk-bild img,.st-bild img,.id-bild img,.br-bild img,.wa-bild img,.ub-bild")];
  if (parallaxe.length && !wenigerBewegung) {
    parallaxe.forEach(img => beobachten(img.parentElement));
    anmelden({
      lesen: neu => neu ? parallaxe.map(img => aktiv(img.parentElement) ? img.parentElement.getBoundingClientRect() : null) : null,
      schreiben: rahmenAlle => {
        if (!rahmenAlle) return;
        const h = innerHeight;
        parallaxe.forEach((img, i) => {
          const rahmen = rahmenAlle[i];
          if (!rahmen) return;
          const c = spann(((rahmen.top + rahmen.height / 2) - h / 2) / (h / 2 + rahmen.height / 2), -1, 1);
          const weit = Math.min(rahmen.height * 0.05, img.classList.contains("ub-bild") ? 44 : 26);
          const t = "0 " + (c * weit).toFixed(1) + "px";
          if (img._t !== t) { img._t = t; img.style.translate = t; }
        });
      }
    });
  }

  /* ------------------------------------- Fotoband: Zoom beim Durchscrollen ------
     🔴 15.10.2026: Das vollbreite Foto zieht sich beim Durchscrollen von 1,14 auf 1,0
     zusammen und läuft leicht gegen den Text. `scale` und `translate` als eigene
     Eigenschaften — `transform` bleibt frei. Das Bild ist 14 % höher als sein Rahmen,
     damit beim Versatz nie eine Kante sichtbar wird. */
  const baender = [...document.querySelectorAll(".fb-bild")];
  if (baender.length && !wenigerBewegung) {
    baender.forEach(img => beobachten(img.parentElement));
    anmelden({
      lesen: neu => neu ? baender.map(img => aktiv(img.parentElement) ? img.parentElement.getBoundingClientRect() : null) : null,
      schreiben: rAlle => {
        if (!rAlle) return;
        const h = innerHeight;
        baender.forEach((img, i) => {
          const r = rAlle[i];
          if (!r) return;
          const p = spann((h - r.top) / (h + r.height));          // 0 = kommt unten rein, 1 = oben raus
          img.style.setProperty("--fb-z", (1.14 - 0.14 * spann(p * 1.6)).toFixed(4));
          img.style.translate = "0 " + ((p - 0.5) * -Math.min(r.height * 0.1, 60)).toFixed(1) + "px";
        });
      }
    });
  }

  /* ---------------------------------------- Bilder: weich einblenden + vorladen ----
     🔴 15.10.2026: „Teile, die längst im Einsatz sind“ zeigte leere dunkelblaue Kacheln.
     Ursache: Bilder mit loading=lazy werden erst angefragt, wenn sie fast im Bild sind —
     wer schnell scrollt oder springt (Anker, Ende-Taste), sieht so lange nur die
     Kachelfläche. Bei einem langsamen Server (gemessen: der lokale Vorschau-Server
     braucht bis 5 s je Bild) bleiben die Flächen sekundenlang leer.
     Zwei Gegenmittel: (1) Nach dem Laden der Seite werden alle späteren Bilder im
     Leerlauf nacheinander vorgeladen — das LCP bleibt unberührt, aber bis jemand unten
     ankommt, sind sie da. (2) Ein Bild, das noch lädt, ist unsichtbar und blendet weich
     ein, statt als Kante aufzuploppen. */
  const spaete = [...document.querySelectorAll('main img[loading="lazy"]')];
  spaete.forEach(img => {
    if (img.complete && img.naturalWidth) return;
    img.classList.add("laedt");
    const fertig = () => { img.classList.remove("laedt"); img.classList.add("geladen"); };
    img.addEventListener("load", fertig, { once: true });
    img.addEventListener("error", fertig, { once: true });
  });
  const vorladen = () => {
    const leer = window.requestIdleCallback || (f => setTimeout(f, 120));
    let i = 0;
    const naechste = () => {
      // je Leerlauf zwei Bilder — so bleibt die Leitung für Klicks frei
      for (let k = 0; k < 2 && i < spaete.length; k++, i++) spaete[i].loading = "eager";
      if (i < spaete.length) leer(naechste);
    };
    leer(naechste);
  };
  if (document.readyState === "complete") setTimeout(vorladen, 800);
  else addEventListener("load", () => setTimeout(vorladen, 800), { once: true });

  /* -------------------------------------------------------------- Kopf ----- */
  const balken = document.querySelector(".fortschritt");
  // Kopf und Fortschrittsbalken laufen im Takt mit (lesen vor schreiben) — vorher las der
  // Scroll-Handler scrollHeight, nachdem andere schon geschrieben hatten.
  let kopfWar = null, spWar = "";
  anmelden({
    lesen: neu => neu ? document.documentElement.scrollHeight - innerHeight : null,
    schreiben: weit => {
      if (weit === null) return;
      const g = scrollY > 40;
      if (g !== kopfWar) { kopfWar = g; document.body.classList.toggle("gescrollt", g); }
      if (balken) {
        const sp = weit > 0 ? (scrollY / weit).toFixed(4) : "0";
        if (sp !== spWar) { spWar = sp; balken.style.setProperty("--sp", sp); }
      }
    }
  });

  const burger = document.querySelector(".burger");
  const mobil = document.getElementById("mobilmenu");
  if (mobil) [...mobil.querySelectorAll("a")].forEach((a, i) => a.style.setProperty("--i", i));
  document.querySelectorAll(".drop a").forEach((a, i) => a.style.setProperty("--i", i));
  if (burger && mobil) {
    burger.addEventListener("click", () => {
      const offen = document.body.classList.toggle("menu-offen");
      mobil.hidden = !offen;
      burger.setAttribute("aria-expanded", String(offen));
      burger.querySelector(".auf").hidden = offen;
      burger.querySelector(".zu").hidden = !offen;
      burger.setAttribute("aria-label", offen ? "Menü schließen" : "Menü öffnen");
    });
    addEventListener("keydown", e => {
      if (e.key === "Escape" && document.body.classList.contains("menu-offen")) burger.click();
    });
  }

  /* -------------------------------------------------- Hero-Montage --------- */
  const montage = document.querySelector(".film.folge");
  if (montage && !wenigerBewegung) {
    const clips = [...montage.querySelectorAll("video")];
    if (clips.length > 1) {
      // 🔴 Gewechselt wird am LOOP-PUNKT des laufenden Clips, nie mittendrin.
      //    Die Clips sind 4–8 s lang; bei einem festen Intervall springt der Clip
      //    sichtbar zurück, während er im Bild steht — genau der „Hänger", den Noah
      //    am 22.09.2026 bei W&W gemeldet hat. Deshalb: kleinstes Vielfaches der
      //    eigenen Dauer, das über 5,5 s liegt (Regelwerk M24: nie schneller als 4 s).
      //    Der Rücksprung fällt damit in die 1,1-s-Blende und ist unsichtbar.
      // 🔴 GENAU EINE Cliplänge: so läuft jeder Clip einmal durch und wird
      //    gewechselt, bevor er zurückspringt. Zwei Durchläufe (8 s bei einem
      //    4-s-Clip) hätten den Rücksprung mitten in die sichtbare Zeit gelegt —
      //    gemessen am 23.09.2026 über einen 16-Sekunden-Mitschnitt: der Loop lag
      //    bei Sekunde 4, die Blende erst bei 8. Untergrenze 4 s (Regelwerk M24).
      const standzeit = v => {
        const d = v.duration;
        if (!d || !isFinite(d) || d <= 0) return 5000;
        return Math.round(Math.max(d, 4) * 1000);
      };
      let i = 0, uhr = null;
      const weiter = () => {
        clips[i].classList.remove("an");
        i = (i + 1) % clips.length;
        const v = clips[i];
        v.classList.add("an");
        try { v.currentTime = 0; } catch (e) {}
        v.play && v.play().catch(() => {});
        uhr = setTimeout(weiter, standzeit(v));
      };
      const start = () => { uhr = setTimeout(weiter, standzeit(clips[0])); };
      if (clips[0].readyState >= 1) start();
      else clips[0].addEventListener("loadedmetadata", start, { once: true });
      // Im verborgenen Tab nicht weiterwechseln — sonst stapeln sich Zeitgeber.
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && uhr) { clearTimeout(uhr); uhr = null; }
        else if (!document.hidden && !uhr) uhr = setTimeout(weiter, 1200);
      });
    }
  }

  /* ------------------------------- Hero-Film ruht, wenn er aus dem Bild ist --
     🔴 16.10.2026: Der Hintergrundfilm lief samt 40-s-Zoom weiter, während man längst
     weiter unten las — Video dekodieren und Zoom rechnen kosteten in jedem Frame mit.
     Außer Sicht: Video pausiert, Zoom angehalten (Klasse `ruht`). Wieder im Bild: weiter
     an derselben Stelle, man sieht keinen Unterschied. */
  if (!wenigerBewegung && "IntersectionObserver" in window) {
    document.querySelectorAll(".film").forEach(film => {
      const videos = [...film.querySelectorAll("video")];
      if (!videos.length) return;
      new IntersectionObserver(es => es.forEach(e => {
        film.classList.toggle("ruht", !e.isIntersecting);
        videos.forEach(v => {
          if (!e.isIntersecting) { if (!v.paused) v.pause(); }
          else if (v.paused && (v.classList.contains("an") || !film.classList.contains("folge"))) {
            const p = v.play && v.play(); if (p && p.catch) p.catch(() => {});
          }
        });
      }), { rootMargin: "60px 0px" }).observe(film);
    });
  }

  /* ------------------------------------------- Signatur „Vom Stapel" ------- */
  // 🔴 03.10.2026 (Noah: „überall geilere Animationen"): Die Bahn bleibt eine Bahn ohne
  //    klebende Bühne, aber sie zeigt jetzt, WAS passiert — ein Lichtkegel fährt mit der
  //    Tafel, die Spur und der Hallenboden ziehen sich hinter ihr auf, unter dem Strahl
  //    sprühen Funken, eine Oberwange drückt beim Kanten auf die Mitte, und das Teil
  //    setzt mit einem kurzen Nachfedern auf der Palette auf. Alles hängt am selben p.
  const stapel = document.querySelector(".stapel");
  if (stapel) {
    const svg = stapel.querySelector("svg");
    const tafel = stapel.querySelector(".tafel");
    const flapL = stapel.querySelector(".flap.l");
    const flapR = stapel.querySelector(".flap.r");
    const sauger = stapel.querySelector(".sauger");
    const laser = stapel.querySelector(".kopf-laser");
    const licht = stapel.querySelector(".licht");
    const wange = stapel.querySelector(".oberwange");
    const spurVoll = stapel.querySelector(".spur-voll");
    const boden = stapel.querySelector(".boden-voll");
    const funken = [...stapel.querySelectorAll(".funke")];
    const loecher = [...stapel.querySelectorAll(".loch")];
    const marken = [...stapel.querySelectorAll(".wegmarken li")];
    const stmarken = [...stapel.querySelectorAll(".st-mark")];
    const spurL = spurVoll ? spurVoll.getTotalLength() : 0;
    if (spurVoll) spurVoll.style.strokeDasharray = spurL + " " + spurL;
    let letzte = -1, schnittPunkt = null;

    const bahn = stapel.querySelector(".bahn");
    // Aufsetzen: die Tafel sinkt, setzt bei 75 % auf und federt einmal kurz nach oben
    // zurück — sie taucht nie in die Palette ein und endet exakt bei 1 (der Prüfer misst
    // die Ablage auf ±6 px).
    const aufsetzen = t => {
      if (t >= 1) return 1;
      if (t < 0.75) { const u = t / 0.75; return u * (2 - u) * 0.35 + u * u * 0.65; }
      return 1 - 0.035 * Math.sin(Math.PI * (t - 0.75) / 0.25);
    };
    const wegmarken = stapel.querySelector(".wegmarken");
    const zeichnenLesen = neu => {
      if (!neu || !aktiv(bahn)) return null;
      return { r: bahn.getBoundingClientRect(),
               weit: istMobil() ? bahn.scrollWidth - bahn.clientWidth : 0 };
    };
    const zeichnen = (m) => {
      // 🔴 Der Fortschritt haengt an der BAHN, nicht an der ganzen Sektion. Mit der
      //    Sektionshoehe war p erst dann 1, wenn die Bahn laengst oben aus dem Bild
      //    gescrollt war — der Besucher sah das Teil nie auf der Palette ankommen,
      //    waehrend die Wegmarke „Teil" schon leuchtete (20.09.2026, im Screenshot gesehen,
      //    von keiner Messung gemeldet).
      if (!m) return;
      const r = m.r;
      const p = spann((innerHeight * 0.85 - r.top) / (r.height * 0.5 + innerHeight * 0.55));
      if (Math.abs(p - letzte) < 0.0015) return;
      letzte = p;
      // 🔴 16.10.2026: --p steht an der Wegmarken-Leiste (ihr ::after liest es), nicht mehr
      //    an der ganzen .stapel — eine geerbte Variable am Container ließ in jedem Frame
      //    die Stile des kompletten SVG neu rechnen. Der Prüfer liest dataset.p.
      stapel.dataset.p = p.toFixed(4);
      if (wegmarken) wegmarken.style.setProperty("--p", p.toFixed(4));

      const heben = spann(p / 0.16);
      const fahrt = glaetten(spann((p - 0.10) / 0.70));
      const schnitt = spann((p - 0.22) / 0.32);
      const falten = spann((p - 0.58) / 0.26);
      const landen = aufsetzen(spann((p - 0.82) / 0.18));

      const x = 66 + fahrt * 812;
      const y = 228 - heben * 58 + landen * 122;
      tafel.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

      const w = falten * 90;
      flapL.setAttribute("transform", `rotate(${w.toFixed(2)} 70 4)`);
      flapR.setAttribute("transform", `rotate(${(-w).toFixed(2)} 190 4)`);

      sauger.setAttribute("transform", `translate(${(x - 20).toFixed(1)} ${(y - 120).toFixed(1)})`);
      sauger.style.opacity = spann(heben * 1.6) * (1 - spann((p - 0.18) / 0.1));

      const lx = x + 70 + schnitt * 122;
      laser.setAttribute("transform", `translate(${lx.toFixed(1)} ${y.toFixed(1)})`);
      const strahlAn = schnitt > 0.01 && schnitt < 0.99;
      laser.style.opacity = strahlAn ? 1 : 0;
      schnittPunkt = strahlAn ? { x: lx, y: y + 4 } : null;
      loecher.forEach((c, i) => {
        c.setAttribute("opacity", schnitt > (i + 0.6) / loecher.length ? 1 : 0);
      });

      // Oberwange: kommt beim Kanten von oben auf die Mitte und geht danach wieder hoch
      if (wange) {
        const da = falten > 0 && falten < 1 ? 1 : 0;
        const hub = Math.sin(spann(falten) * Math.PI);       // runter und wieder rauf
        wange.setAttribute("opacity", da ? Math.min(1, hub * 3).toFixed(2) : 0);
        wange.setAttribute("transform", `translate(${(x + 72).toFixed(1)} ${(y - 26 + hub * 22).toFixed(1)})`);
      }
      if (licht) licht.setAttribute("transform", `translate(${(x + 131).toFixed(1)} 0)`);
      if (spurVoll) spurVoll.style.strokeDashoffset = (spurL * (1 - fahrt)).toFixed(1);
      if (boden) boden.setAttribute("transform", `translate(20 0) scale(${Math.max(0.0001, (x + 131 - 20) / 1200).toFixed(4)} 1) translate(-20 0)`);
      marken.forEach(li => li.classList.toggle("an", p >= parseFloat(li.dataset.ab)));
      stmarken.forEach(g => g.classList.toggle("an", p >= parseFloat(g.dataset.ab)));
      stapel.classList.toggle("fertig", p >= 0.995);

      // Am Handy ist die Bahn 900 px breit und seitlich schiebbar — ohne Mitführung
      // liefe die Tafel in den Teil, den niemand sieht. Der Ausschnitt folgt ihr.
      if (m.weit > 0) bahn.scrollLeft = m.weit * fahrt;
    };
    // Funken: flackern, solange der Strahl an ist — auch wenn gerade niemand scrollt.
    let funkZeit = 0;
    const spruehen = () => {
      if (!schnittPunkt || !aktiv(bahn)) {
        if (funkZeit) { funken.forEach(c => c.setAttribute("opacity", 0)); funkZeit = 0; }
        return;
      }
      funkZeit++;
      funken.forEach((c, i) => {
        const t = ((funkZeit * 0.09 + i * 0.37) % 1);
        const dx = Math.sin(i * 2.3 + funkZeit * 0.05) * 16 * t;
        c.setAttribute("cx", (schnittPunkt.x + dx).toFixed(1));
        c.setAttribute("cy", (schnittPunkt.y + 6 + t * 30).toFixed(1));
        c.setAttribute("opacity", (1 - t).toFixed(2));
      });
      return true;                       // solange der Strahl schneidet, weiter flackern
    };

    if (wenigerBewegung) {
      tafel.setAttribute("transform", "translate(878 292)");
      flapL.setAttribute("transform", "rotate(90 70 4)");
      flapR.setAttribute("transform", "rotate(-90 190 4)");
      loecher.forEach(c => c.setAttribute("opacity", 1));
      marken.forEach(li => li.classList.add("an"));
      stmarken.forEach(g => g.classList.add("an"));
      stapel.style.setProperty("--p", 1);
      stapel.classList.add("fertig");
      if (spurVoll) spurVoll.style.strokeDashoffset = 0;
    } else {
      beobachten(bahn);
      anmelden({ lesen: zeichnenLesen, schreiben: zeichnen });
      anmelden(spruehen);
    }
  }

  /* --------------------------------------- kleine Mechanik je Leistung ----- */
  const griff = document.querySelector(".handgriff");
  if (griff) {
    const art = griff.dataset.griff;
    const out = griff.querySelector("#hg-out");
    const einheit = (griff.querySelector(".hg-wert .lbl").textContent || "").trim();
    // Die Teile werden einmal gesucht, nicht in jedem Frame neu.
    const _q = {}, _qa = {};
    const q = s => (s in _q ? _q[s] : (_q[s] = griff.querySelector(s)));
    const qa = s => (_qa[s] || (_qa[s] = [...griff.querySelectorAll(s)]));

    const kontur = q(".kontur"), naht = q(".naht-linie");
    // 🔴 Längen einmal messen: getTotalLength/getPointAtLength erzwingen eine Stil-
    //    berechnung — im Schreib-Teil des Takts kostete das in jedem Frame ein Layout.
    const konturL = kontur ? kontur.getTotalLength() : 0, nahtL = naht ? naht.getTotalLength() : 0;
    if (kontur) { kontur.style.setProperty("--len", konturL); kontur.style.setProperty("--off", konturL); }
    if (naht) { naht.style.setProperty("--len", nahtL); naht.style.setProperty("--off", nahtL); }

    let letzteG = -1;
    const mechanik = (p, pt) => {
      switch (art) {
        case "laserschneiden": {
          const L = konturL;
          kontur.style.setProperty("--off", (L * (1 - p)).toFixed(1));
          pt = pt || kontur.getPointAtLength(L * p);
          q(".duese").setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
          q(".duese").style.opacity = p > 0.01 && p < 0.995 ? 1 : 0;
          qa(".pk").forEach((c, i) => c.setAttribute("opacity", p > 0.55 + i * 0.1 ? 1 : 0));
          return Math.round(p * 100) + " %";
        }
        case "abkanten": {
          const w = p * 90;
          q(".stempel").setAttribute("transform", `translate(0 ${(p * 82).toFixed(1)})`);
          q(".bl").setAttribute("transform", `rotate(${(w / 2).toFixed(2)} 260 196)`);
          q(".br").setAttribute("transform", `rotate(${(-w / 2).toFixed(2)} 260 196)`);
          return Math.round(w) + " °";
        }
        case "zerspanung": {
          const zc = q(".zclip");
          zc.setAttribute("x", (88 + p * 300).toFixed(1));
          zc.setAttribute("width", (300 - p * 300).toFixed(1));
          q(".meissel").setAttribute("transform", `translate(${(88 + p * 300).toFixed(1)} 92)`);
          qa(".span").forEach((s, i) => {
            const ab = i / 9;
            const t = spann((p - ab) / 0.12);
            s.setAttribute("opacity", (t > 0 && t < 1 ? 1 - t : 0).toFixed(2));
            s.setAttribute("transform",
              `translate(${(100 + ab * 300 + t * 26).toFixed(1)} ${(84 - t * 44).toFixed(1)})`);
          });
          return Math.round(p * 100) + " %";
        }
        case "schweissen": {
          const d = (1 - p) * 40;
          q(".tl").setAttribute("transform", `translate(${(-d).toFixed(1)} 0)`);
          q(".tr").setAttribute("transform", `translate(${d.toFixed(1)} 0)`);
          const L = nahtL;
          naht.style.setProperty("--off", (L * (1 - p)).toFixed(1));
          q(".brenner").setAttribute("transform", `translate(${(120 + p * 280).toFixed(1)} 120)`);
          q(".brenner").style.opacity = p > 0.02 && p < 0.99 ? 1 : 0;
          return Math.round(p * 100) + " %";
        }
        case "stanzen": {
          const hub = Math.abs(Math.sin(p * Math.PI * 3.2));
          q(".stempelblock").setAttribute("transform", `translate(0 ${(hub * 56).toFixed(1)})`);
          const n = qa(".lr").length;
          let da = 0;
          qa(".lr").forEach((c, i) => {
            const an = p > (i + 0.5) / n;
            c.setAttribute("opacity", an ? 1 : 0);
            if (an) da++;
          });
          return String(da);
        }
        case "baugruppen": {
          const teile = qa(".st-teil");
          let da = 0;
          // 🔴 Die Staffelung läuft über den ganzen Weg des Blocks durchs Fenster.
          //    Mit 0,13 Versatz war die Baugruppe schon auf halber Strecke fertig —
          //    der Zähler sprang von 4/6 direkt auf 6/6 und stand dann still.
          teile.forEach((g, i) => {
            const t = spann((p - 0.10 - i * 0.14) / 0.16);
            g.setAttribute("opacity", t.toFixed(2));
            g.setAttribute("transform", `translate(0 ${((1 - t) * -80).toFixed(1)})`);
            if (t > 0.98) da++;
          });
          return da + " / " + teile.length;
        }
      }
      return "";
    };

    const laufGLesen = neu => {
      if (!neu || !aktiv(griff)) return null;
      const r = griff.getBoundingClientRect();
      const p = spann((innerHeight * 0.9 - r.top) / (r.height * 0.7 + innerHeight * 0.3));
      if (Math.abs(p - letzteG) < 0.002) return null;
      // der Punkt auf der Kontur ist eine Messung — gehört in den Lese-Teil
      return { p, pt: art === "laserschneiden" && kontur ? kontur.getPointAtLength(konturL * p) : null };
    };
    const laufG = m => {
      if (!m) return;
      letzteG = m.p;
      const txt = mechanik(m.p, m.pt);
      if (out && out.textContent !== txt) out.textContent = txt;
    };
    if (wenigerBewegung) { const t = mechanik(1); if (out) out.textContent = t; }
    else { beobachten(griff); anmelden({ lesen: laufGLesen, schreiben: laufG }); }
  }

  /* ------------------------------------------------------- Tafelrechner ---- */
  /* ---- Die Dickenleiste: eine Blechkante, die wirklich dicker wird -------------
     Der Querschnitt ist maßstäblich (1 mm = 3,2 px, 30 mm = 96 px), das Gewicht
     rechnet mit derselben Dichte wie der Tafelrechner: 3,0 m × 1,5 m × Dicke × ρ. */
  /* ---- Die Anlage: der Schneidkopf faehrt ueber die Tafel ----------------------
     🔴 Der Fortschritt haengt an der ZEICHNUNG, nicht an der Sektion — dieselbe
     Lehre wie bei der Signatur-Bahn (20.09.2026): mit der Sektionshoehe waere der
     Kopf erst am Ende angekommen, wenn die Zeichnung schon aus dem Bild ist. */
  const anlage = document.querySelector(".anlage");
  if (anlage) {
    const bild = anlage.querySelector("svg");
    let vorige = -1;
    // im gemeinsamen Takt: lesen vor schreiben, nur solange die Zeichnung nahe am Bild ist
    beobachten(bild);
    anmelden({
      lesen: neu => neu && aktiv(bild) ? bild.getBoundingClientRect() : null,
      schreiben: r => {
        if (!r) return;
        let p = (innerHeight * 0.82 - r.top) / (r.height * 0.55 + innerHeight * 0.45);
        p = Math.min(1, Math.max(0, p));
        if (Math.abs(p - vorige) < 0.002) return;
        vorige = p;
        anlage.style.setProperty("--p", p.toFixed(4));
      }
    });
  }

  const dkLeiste = document.querySelector(".dicke-leiste");
  if (dkLeiste) {
    const blech = document.getElementById("dicke-blech");
    const marke = document.getElementById("dicke-marke");
    const satz  = document.getElementById("dicke-satz");
    const KANT_MAX = 20, PX_JE_MM = 3.2;
    const setzen = mm => {
      dkLeiste.querySelectorAll(".dicke").forEach(k => {
        const an = +k.dataset.mm === mm;
        k.setAttribute("aria-checked", String(an));
        k.tabIndex = an ? 0 : -1;
      });
      // 🔴 Nur `transform`: das Blech ist 96 px (30 mm) hoch und wird von unten gestaucht —
      //    eine wachsende `height` hätte bei jedem Wechsel das Layout neu berechnet.
      if (blech) blech.style.transform = "scaleY(" + (mm * PX_JE_MM / 96).toFixed(4) + ")";
      if (marke) marke.textContent = mm + " mm";
      if (satz) satz.textContent = mm <= KANT_MAX
        ? "Schneiden und kanten — beides im Haus, ohne Transport dazwischen."
        : "Schneiden ja, kanten nicht mehr: über 20 mm ist die Kantgrenze erreicht.";
      document.querySelectorAll(".ws").forEach(w => {
        const d = parseFloat(w.dataset.dichte) || 7.85;
        const kg = 3.0 * 1.5 * (mm / 1000) * d * 1000;      // m × m × m × g/cm³ → kg
        const z = w.querySelector(".ws-gew");
        if (z) z.textContent = Math.round(kg).toLocaleString("de-DE") + " kg";
      });
    };
    dkLeiste.addEventListener("click", e => {
      const k = e.target.closest(".dicke");
      if (k) setzen(parseFloat(k.dataset.mm));
    });
    dkLeiste.addEventListener("pointerover", e => {
      const k = e.target.closest(".dicke");
      if (k) setzen(parseFloat(k.dataset.mm));
    });
    // Pfeiltasten wählen die Nachbardicke — was eine radiogroup können muss.
    dkLeiste.addEventListener("keydown", e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const alle = [...dkLeiste.querySelectorAll(".dicke")];
      const i = alle.findIndex(k => k.getAttribute("aria-checked") === "true");
      let z = e.key === "Home" ? 0 : e.key === "End" ? alle.length - 1
            : e.key === "ArrowLeft" ? i - 1 : i + 1;
      z = Math.max(0, Math.min(alle.length - 1, z));
      e.preventDefault();
      setzen(parseFloat(alle[z].dataset.mm));
      alle[z].focus();
    });
    setzen(10);
  }

  const rf = document.getElementById("tafelrechner");
  if (rf) {
    const DICHTE = { "Stahl": 7.85, "Edelstahl": 7.90, "Aluminium": 2.70 };
    const TAFEL_L = 3000, TAFEL_B = 1500, MAX_S = 30, KANT_L = 3000, KANT_S = 20;
    const $ = id => document.getElementById(id);
    const zahl = n => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

    const rechnen = () => {
      const mat = $("r-mat").value;
      const s = parseFloat($("r-s").value) || 0;
      const l = parseFloat($("r-l").value) || 0;
      const b = parseFloat($("r-b").value) || 0;
      const n = Math.max(1, parseInt($("r-n").value, 10) || 1);
      const spalt = 4;                       // Schnittspalt und Steg zwischen den Teilen
      // 🔴 Die Schachtelung liefert REIHEN UND SPALTEN, nicht nur ein Produkt — die
      //    Tafel links zeichnet genau diese Anordnung. Eine Zahl ohne Bild ist der
      //    Grund, warum die Sektion vorher leer wirkte (Noah, 24.09.2026).
      const legen = (a, c) => ({
        sp: Math.floor((TAFEL_L + spalt) / (a + spalt)),
        re: Math.floor((TAFEL_B + spalt) / (c + spalt)), a, c });
      const quer = legen(l, b), hoch = legen(b, l);
      const lage = quer.sp * quer.re >= hoch.sp * hoch.re ? quer : hoch;
      const jeTafel = lage.sp * lage.re;
      const gewicht = (l / 10) * (b / 10) * (s / 10) * (DICHTE[mat] || 7.85) / 1000;  // kg

      const gruende = [];
      if (s > MAX_S) gruende.push("über 30 mm Blechdicke");
      if (Math.max(l, b) > TAFEL_L || Math.min(l, b) > TAFEL_B) gruende.push("größer als das Tafelformat");
      if (!l || !b || !s) gruende.push("Maße fehlen");

      const u = $("r-urteil");
      if (gruende.length) {
        u.className = "urteil nein";
        u.textContent = "Nicht direkt auf unserer Anlage: " + gruende.join(", ") +
          ". Rufen Sie an — geteilt und im Haus gefügt geht oft trotzdem etwas.";
        $("r-jetafel").textContent = "–";
        $("r-tafeln").textContent = "–";
      } else {
        u.className = "urteil";
        u.textContent = "Passt: " + mat + " mit " + zahl(s) + " mm auf unsere Anlage" +
          (s <= KANT_S && Math.max(l, b) <= KANT_L ? " — und abkanten können wir es auch." : ".");
        $("r-jetafel").textContent = jeTafel > 0 ? zahl(jeTafel) : "–";
        $("r-tafeln").textContent = jeTafel > 0 ? zahl(Math.ceil(n / jeTafel)) : "–";
      }
      $("r-gew").textContent = gewicht > 0 ? zahl(gewicht) + " kg" : "–";
      $("r-ges").textContent = gewicht > 0 ? zahl(gewicht * n) + " kg" : "–";
      tafelZeichnen(gruende.length ? null : lage, n, jeTafel);
    };

    /* Zeichnet die Teile auf die Tafel — 600 × 300 Einheiten sind 3000 × 1500 mm,
       also genau ein Fünftel. Gezeigt wird die ERSTE Tafel: so viele Teile, wie
       darauf liegen, höchstens aber die bestellte Stückzahl. */
    const tafelZeichnen = (lage, n, jeTafel) => {
      const g = document.getElementById("tafel-teile");
      const bel = document.getElementById("tafel-bel");
      if (!g) return;
      const mm = 600 / TAFEL_L;                  // Einheiten je Millimeter
      g.textContent = "";
      if (!lage || lage.sp < 1 || lage.re < 1) {
        if (bel) bel.textContent = "passt nicht auf die Tafel";
        g.setAttribute("data-leer", "1");
        return;
      }
      g.removeAttribute("data-leer");
      const spalt = 4, drauf = Math.min(n, jeTafel);
      let i = 0;
      for (let r = 0; r < lage.re && i < drauf; r++) {
        for (let c = 0; c < lage.sp && i < drauf; c++, i++) {
          const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          el.setAttribute("x", ((c * (lage.a + spalt)) * mm).toFixed(2));
          el.setAttribute("y", ((r * (lage.c + spalt)) * mm).toFixed(2));
          el.setAttribute("width", Math.max(1, lage.a * mm).toFixed(2));
          el.setAttribute("height", Math.max(1, lage.c * mm).toFixed(2));
          el.setAttribute("class", "tafel-teil");
          el.style.setProperty("--i", i);        // gestaffeltes Erscheinen
          g.appendChild(el);
        }
      }
      if (bel) {
        const rest = Math.max(0, n - drauf);
        bel.textContent = drauf + (drauf === 1 ? " Teil" : " Teile") + " auf dieser Tafel" +
          (rest ? " · " + rest + " auf weiteren" : "");
      }
    };
    // Ein geänderter Wert leuchtet kurz auf — sonst sieht niemand, dass gerechnet wurde.
    const aufleuchten = () => {
      ["r-jetafel", "r-tafeln", "r-gew", "r-ges"].forEach(id => {
        const el = $(id); if (!el) return;
        el.classList.remove("frisch");
        void el.offsetWidth;                 // Neustart der Übergangsfarbe erzwingen
        el.classList.add("frisch");
        setTimeout(() => el.classList.remove("frisch"), 700);
      });
    };
    rf.addEventListener("input", () => { rechnen(); aufleuchten(); });
    rf.addEventListener("change", () => { rechnen(); aufleuchten(); });
    rechnen();
  }

  /* ------------------------------------------------ Statement scroll-gefüllt --
     Skill `scroll-text`: gemessen am TEXTELEMENT, Start bei 78 % der Fensterhöhe,
     voll bei 32 % — und in BEIDE Richtungen (toggle, nicht add). */
  document.querySelectorAll("[data-fuell]").forEach(el => {
    const woerter = [...el.querySelectorAll(".w")];
    if (!woerter.length) return;
    if (wenigerBewegung) { woerter.forEach(w => w.classList.add("an")); return; }
    beobachten(el);
    const lauf = r => {
      if (!r) return;
      const h = innerHeight;
      // 🔴 Start bei 80 % statt 78 % — beides liegt im „~78 %" des Skills, aber mit
      //    78 % lag der Fortschritt bei einer Oberkante von genau 500 px knapp unter
      //    der Schwelle des dritten Wortes: der Timing-Prüfer maß 33 % statt 50 %.
      //    Zwei Prozentpunkte Reserve, damit die Bildmitte sicher die Satzmitte ist.
      // 🔴 79 % ist der Wert, der BEIDE Enden trifft (gemessen 24.09.2026 über alle
      //    sechs Fülltexte der Seite): mit 78 % blieb ein Sechs-Wort-Satz bei einer
      //    Oberkante von 500 px knapp unter der Satzmitte, mit 80 % leuchtete bei
      //    einem Fünfzehn-Wort-Satz schon bei 700 px das erste Wort. Der Skill nennt
      //    „~78 %" als Richtwert — die genaue Zahl gehört gemessen, nicht geraten.
      const p = spann((h * 0.79 - r.top) / (h * 0.46));
      woerter.forEach((w, i) => w.classList.toggle("an", (i + 1) / woerter.length <= p + 0.02));
    };
    anmelden({ lesen: neu => neu && aktiv(el) ? el.getBoundingClientRect() : null, schreiben: lauf });
  });

  /* ------------------------------------------------------------- Zähler ----
     Zahlen zählen hoch, sobald sie im Bild stehen. 🔴 Der Text wird zerlegt, statt
     ihn zu ersetzen: „3000 × 1500 mm" hat zwei Zahlen und eine Einheit, und
     „1.000+" muss mit Punkt und Plus wieder herauskommen. */
  const zaehler = [...document.querySelectorAll("[data-zaehler]")];
  if (zaehler.length && !wenigerBewegung && "IntersectionObserver" in window) {
    const format = (n, muster) => {
      const s = muster.includes(".") ? Math.round(n).toLocaleString("de-DE") : String(Math.round(n));
      return s;
    };
    const starten = el => {
      const roh = el.textContent;
      // Jede Zahlengruppe einzeln, Text dazwischen bleibt stehen
      const teile = roh.split(/(\d[\d.]*)/);
      if (!teile.some(t => /^\d/.test(t))) return;
      const ziele = [];
      el.textContent = "";
      teile.forEach(t => {
        if (/^\d/.test(t)) {
          const span = document.createElement("span");
          span.textContent = "0";
          el.appendChild(span);
          ziele.push({ span, wert: parseFloat(t.replace(/\./g, "")), muster: t });
        } else if (t) {
          el.appendChild(document.createTextNode(t));
        }
      });
      // 🔴 Im gemeinsamen Takt (Schreib-Teil) statt mit eigenem rAF: ein eigener Frame-
      //    Aufruf vor dem Takt hätte Text geändert, den der Takt danach wieder misst.
      //    Text nur setzen, wenn sich die Ziffer ändert — sonst Layout für nichts.
      const dauer = 1250, start = performance.now();
      const aufgabe = { schreiben: () => {
        const t = spann((performance.now() - start) / dauer);
        const e = 1 - Math.pow(1 - t, 3);            // ease-out, kein Überschwingen
        ziele.forEach(z => {
          const s = t < 1 ? format(z.wert * e, z.muster) : z.muster;
          if (z.span.textContent !== s) z.span.textContent = s;
        });
        if (t < 1) return true;
        takt.aufgaben.delete(aufgabe);
      } };
      anmelden(aufgabe);
    };
    const beo = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { starten(e.target); beo.unobserve(e.target); } });
    }, { threshold: 0.6 });
    zaehler.forEach(el => beo.observe(el));
  }

  /* -------------------------------------------------------------- Intro ----
     Die Lagen stapeln sich, das Zeichen steht darauf, dann fährt der Vorhang hoch.
     🔴 Nur beim ERSTEN Besuch der Sitzung — wer zwischen Seiten wechselt, will
     nicht jedes Mal warten (sessionStorage). */
  const intro = document.querySelector(".intro");
  if (intro) {
    let gesehen = false;
    try { gesehen = sessionStorage.getItem("wmb-intro") === "1"; } catch (e) { gesehen = false; }
    // 🔴 Nie auf dem Handy (Dauerregel 28.09.2026): ein Vorhang hält dort den Hero-Text
    //    zurück und kostet mobil PageSpeed. Das CSS blendet ihn unter 760 px aus, hier
    //    wird er gar nicht erst abgespielt.
    if (gesehen || wenigerBewegung || innerWidth < 760) {
      intro.remove();
    } else {
      document.documentElement.style.setProperty("--hero-start", "1.35s");
      try { sessionStorage.setItem("wmb-intro", "1"); } catch (e) {}
      setTimeout(() => {
        intro.classList.add("zu");
        setTimeout(() => intro.remove(), 900);
      }, 1250);
    }
  }

  /* ------------------------------------------------------------- Cursor ----
     Ein Laserpunkt mit nachlaufendem Ring. Nur bei echter Maus — am Touchgerät
     gibt es kein Drübergehen, und ein Punkt, der am Finger klebt, stört nur. */
  if (matchMedia("(hover:hover) and (pointer:fine)").matches && !wenigerBewegung) {
    const punkt = document.createElement("div"); punkt.className = "cur-punkt";
    const ring = document.createElement("div");  ring.className = "cur-ring";
    document.body.append(punkt, ring);
    // 🔴 Erst zeigen, wenn die Maus das erste Mal bewegt wurde. Sonst steht ein
    //    orangener Ring mitten auf der Seite, bevor jemand etwas getan hat — und der
    //    echte Zeiger ist schon ausgeblendet (gesehen im Screenshot, 23.09.2026).
    let bewegt = false;
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", e => {
      if (!bewegt) {
        bewegt = true;
        rx = e.clientX; ry = e.clientY;
        document.body.classList.add("cursor-eigen", "cursor-da");
      }
      mx = e.clientX; my = e.clientY;
      // Ziel nur neu bestimmen, wenn der Zeiger ein anderes Element betritt
      if (e.target !== zielWar) {
        zielWar = e.target;
        const z = e.target.closest && e.target.closest("a,button,summary,.kachel,.lz,.dk,.mk,.ap,.schritt,label");
        const tx = !!(e.target.closest && e.target.closest("input,textarea,select"));
        if (!!z !== anWar) { anWar = !!z; document.body.classList.toggle("cur-an", anWar); }
        if (tx !== textWar) { textWar = tx; document.body.classList.toggle("cur-text", tx); }
      }
      wecken();
    }, { passive: true });
    let zielWar = null, anWar = false, textWar = false, px = -1, py = -1;
    // 🔴 16.10.2026: Punkt und Ring schreiben im Takt (nach dem Lesen), und der Ring
    //    hält den Takt nur am Laufen, bis er den Punkt eingeholt hat — vorher lief ein
    //    Dauer-rAF, auch wenn die Maus seit Minuten stillstand.
    anmelden(() => {
      if (!bewegt) return;
      if (mx !== px || my !== py) {
        px = mx; py = my;
        punkt.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      }
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      const ruht = Math.abs(mx - rx) < 0.3 && Math.abs(my - ry) < 0.3;
      if (ruht) { rx = mx; ry = my; }
      const t = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) translate(-50%,-50%)`;
      if (t !== ring._t) { ring._t = t; ring.style.transform = t; }
      return !ruht;
    });
  }

  /* ------------------------------------------------------ Anfrageformular ---
     Das Formular geht per normalem POST an den Formular-Dienst der HandwerksManufaktur
     (Cloudflare Worker), der die Anfrage als Mail an das Postfach des Betriebs schickt und
     danach auf /kontakt zurückleitet: ?gesendet=1 (Danke) oder ?fehler=1 (Telefon + Mail).
     🔴 Bei einem Fehler steht die Telefonnummer in der Meldung. */
  const fq = new URLSearchParams(location.search);
  document.querySelectorAll("form.kb-form").forEach(form => {
    const hinweis = form.querySelector(".form-hinweis");
    const knopf = form.querySelector('button[type="submit"]');
    const TEL = "08772 803707";
    // Spam-Schutz ohne Cookie: Ladezeit ins Formular; der Dienst verwirft Absendungen unter 3 s.
    const tsFeld = form.querySelector('[name="ts"]');
    if (tsFeld) tsFeld.value = String(Date.now());
    const sage = (text, art) => {
      if (!hinweis) return;
      hinweis.textContent = text;
      hinweis.className = "form-hinweis " + (art || "");
    };
    form.addEventListener("submit", e => {
      const name = form.querySelector('[name="name"]');
      const mail = form.querySelector('[name="mail"]');
      const text = form.querySelector('[name="nachricht"]');
      const ok = form.querySelector('[name="einwilligung"]');
      if (!name.value.trim()) { e.preventDefault(); sage("Bitte tragen Sie noch Ihren Namen ein.", "fehler"); name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
        e.preventDefault(); sage("Bitte tragen Sie eine gültige E-Mail-Adresse ein, damit wir antworten können.", "fehler"); mail.focus(); return;
      }
      if (!text.value.trim()) { e.preventDefault(); sage("Bitte schreiben Sie kurz, worum es geht.", "fehler"); text.focus(); return; }
      if (ok && !ok.checked) { e.preventDefault(); sage("Bitte bestätigen Sie noch die Zeile zum Datenschutz.", "fehler"); ok.focus(); return; }
      if (knopf) { knopf.disabled = true; knopf.textContent = "Wird gesendet …"; }
      sage("");
    });
    // Rückmeldung des Formular-Dienstes (Rücksprung mit Parameter)
    if (location.hash === "#anfrage" && (fq.has("gesendet") || fq.has("fehler"))) {
      if (fq.has("gesendet")) {
        form.reset();
        sage("Danke, Ihre Anfrage ist raus. Wir melden uns — meist am selben oder nächsten Werktag.", "gut");
      } else {
        sage("Das Absenden hat gerade nicht funktioniert. Rufen Sie uns einfach an: " + TEL
          + " — oder schreiben Sie an info@weber-metalltechnik.com.", "fehler");
      }
      history.replaceState(null, "", location.pathname + location.hash);
    }
  });

  /* ── Seitenaufrufe zählen — ohne Cookies, ohne Speicher im Browser, ohne IP und ohne Kennung.
     Eigener Zähler der HandwerksManufaktur (Worker seiten-zaehler); gezählt wird nur: Seite, Zeitpunkt,
     Herkunfts-Website, Handy/Computer, Land. Beschrieben in der Datenschutzerklärung. */
  if (/(^|\.)weber-metalltechnik\.com$/.test(location.hostname)) {
    let r = "direkt";
    try {
      if (fq.get("utm_source")) r = "utm:" + fq.get("utm_source");
      else if (document.referrer) { const h = new URL(document.referrer).hostname.replace(/^www\./, ""); if (h && h !== location.hostname) r = h; }
    } catch (err) {}
    const d = JSON.stringify({ t: "v", s: location.hostname, p: location.pathname, g: innerWidth < 768 ? "m" : "d",
      id: Math.random().toString(36).slice(2, 12), r: r });
    const Z = "https://seiten-zaehler.handwerksmanufaktur.workers.dev/z";
    try { if (!(navigator.sendBeacon && navigator.sendBeacon(Z, new Blob([d], { type: "text/plain" })))) fetch(Z, { method: "POST", body: d, keepalive: true, mode: "no-cors" }); } catch (err) {}
  }

  /* --------------------------------------------------------- Seitenwisch --- */
  const wisch = document.querySelector(".wisch");
  if (wisch && !wenigerBewegung) {
    document.addEventListener("click", e => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")
          || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      // interne Seiten ohne .html („kontakt“, „./“) — keine Anker, keine Dateien, keine fremden Adressen
      if (!/^(\.\/|\.\.\/)?[a-z0-9-]*\/?$/.test(href)) return;
      e.preventDefault();
      document.body.classList.add("wischt");
      // 15.10.2026: die neue Seite startet verdeckt und zieht die Fläche nach oben weg (wie bei Inna)
      try { sessionStorage.setItem("wmb-wisch", "1"); } catch (err) {}
      setTimeout(() => { location.href = href; }, 300);
    });
    addEventListener("pageshow", () => document.body.classList.remove("wischt"));
  }
})();
