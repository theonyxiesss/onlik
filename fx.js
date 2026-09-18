/* MATRIX AGENCY — Interactive FX v1 */
(function () {
  'use strict';

  /* ── Page detection ─────────────────────────────────────── */
  const IS_M01 = !!document.getElementById('m01-btn');
  const IS_M02 = !!document.querySelector('.forbidden-item');
  const IS_M03 = !!document.querySelector('.chat-flow');
  const IS_IDX = !IS_M01 && !IS_M02 && !IS_M03;

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Webhook → Google Sheet + Telegram ──────────────────── */
  /* Вставь сюда URL веб-приложения Apps Script (…/exec). Пусто = отправка выключена. */
  var FX_WEBHOOK = '';

  function fxNotify(payload) {
    if (!FX_WEBHOOK) return;
    payload.name = localStorage.getItem('operator_name') || '';
    payload.shift = localStorage.getItem('operator_shift') || '';
    payload.ua = navigator.userAgent || '';
    try {
      fetch(FX_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {}
  }

  function fxNotifyRegister() {
    if (localStorage.getItem('fx_registered')) return;
    if (!localStorage.getItem('operator_name')) return;
    localStorage.setItem('fx_registered', '1');
    fxNotify({ type: 'register' });
  }

  function fxNotifyResult(module, extra) {
    var k = 'fx_sent_m' + module;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, '1');
    var p = { type: 'result', module: module };
    if (extra) { for (var key in extra) { p[key] = extra[key]; } }
    fxNotify(p);
  }

  /* ── 1. Scroll progress bar ─────────────────────────────── */
  function initProgress() {
    const bar = document.createElement('div');
    bar.id = 'fx-progress';
    document.body.appendChild(bar);
    function upd() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) bar.style.width = (window.scrollY / max * 100).toFixed(1) + '%';
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ── 2. Reveal on scroll ────────────────────────────────── */
  function initReveal() {
    const sel = '.slide,.anno,.step,.tip,.status-card,.check-item,.htable';
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        const delay = Number(e.target.dataset.ri || 0);
        setTimeout(function () { e.target.classList.add('fx-revealed'); }, delay);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.07 });

    document.querySelectorAll(sel).forEach(function (el) {
      // Stagger siblings of the same type within same parent
      const siblings = Array.from(
        (el.parentElement || document.body).querySelectorAll(':scope > ' + el.tagName + '.anno,' +
          ':scope > .anno,:scope > .step,:scope > .tip,:scope > .check-item')
      );
      const idx = siblings.indexOf(el);
      el.dataset.ri = Math.max(0, idx) * 65;
      el.classList.add('fx-reveal');
      obs.observe(el);
    });
  }

  /* ── 3. Flip cards — module 02 forbidden items ──────────── */
  function initFlipCards() {
    document.querySelectorAll('.forbidden-item').forEach(function (item) {
      var iconEl = item.querySelector('.forbidden-icon');
      var pEl    = item.querySelector('p');
      var boldEl = pEl ? pEl.querySelector('b') : null;

      var iconHTML  = iconEl ? iconEl.outerHTML : '';
      var nameHTML  = boldEl ? boldEl.innerHTML : (pEl ? pEl.innerHTML : '');
      // Description = p content minus the <b>...</b> and the leading dash
      var descHTML  = pEl ? pEl.innerHTML.replace(/<b>[\s\S]*?<\/b>\s*[—–-]\s*/i, '') : '';

      item.classList.add('fx-flip');
      item.style.height = '150px';

      var inner = document.createElement('div');
      inner.className = 'fx-flip-inner';

      inner.innerHTML =
        '<div class="fx-flip-front">' +
          iconHTML +
          '<p style="margin:0;font-size:1.05rem;font-weight:700;color:#e05050;line-height:1.3;">' +
            nameHTML +
          '</p>' +
          '<span style="position:absolute;bottom:0.35rem;right:0.55rem;font-family:\'Share Tech Mono\',monospace;font-size:0.57rem;color:rgba(224,80,80,0.35);pointer-events:none;">↻ нажми</span>' +
        '</div>' +
        '<div class="fx-flip-back">' +
          '<div class="fx-flip-back-x">✕</div>' +
          '<div class="fx-flip-back-label">НАРУШЕНИЕ ПРАВИЛ OF</div>' +
          '<div class="fx-flip-back-text">' + descHTML + '</div>' +
          '<div class="fx-flip-back-warn">// Бан аккаунта без предупреждения</div>' +
        '</div>';

      item.innerHTML = '';
      item.appendChild(inner);

      item.addEventListener('click', function () {
        item.classList.toggle('flipped');
      });
    });
  }

  /* ── 3b. Objection flip cards — module 03 ──────────────── */
  function initObjFlipCards() {
    var items = document.querySelectorAll('.obj-list .obj-item');
    if (!items.length) return;

    items.forEach(function (item, idx) {
      var fanEl     = item.querySelector('.obj-fan');
      var answerEls = item.querySelectorAll('.obj-answer');
      var dontEl    = item.querySelector('.obj-dont');

      var fanText   = fanEl  ? fanEl.textContent.trim()  : '';
      var dontText  = dontEl ? dontEl.textContent.trim() : '';
      var answersHTML = Array.from(answerEls).map(function (el) {
        return '<div class="objf-answer-row">' + el.textContent.trim() + '</div>';
      }).join('');

      item.className = 'objf-card';
      item.innerHTML =
        '<div class="objf-front" id="objf-front-' + idx + '">' +
          '<div class="objf-fan-row">' + fanText + '</div>' +
          '<div class="objf-input-area">' +
            '<div class="objf-input-label">// Твой вариант ответа:</div>' +
            '<textarea class="objf-textarea" id="objf-ta-' + idx + '" ' +
              'placeholder="Напиши как бы ответил(а) фану..." rows="3"></textarea>' +
          '</div>' +
          '<button class="objf-check-btn" id="objf-check-' + idx + '">Проверить ответ</button>' +
        '</div>' +
        '<div class="objf-back" id="objf-back-' + idx + '">' +
          '<div class="objf-answer-label">✓ ПРАВИЛЬНЫЙ ОТВЕТ</div>' +
          answersHTML +
          '<div class="objf-dont-row">' + dontText + '</div>' +
          '<div class="objf-compare-box" id="objf-cmp-' + idx + '">' +
            '<div class="objf-compare-label">// Твой вариант:</div>' +
            '<div class="objf-compare-text" id="objf-cmp-text-' + idx + '"></div>' +
          '</div>' +
          '<button class="objf-retry-btn" id="objf-retry-' + idx + '">↩ Попробовать снова</button>' +
        '</div>';

      var checkBtn  = document.getElementById('objf-check-'    + idx);
      var retryBtn  = document.getElementById('objf-retry-'    + idx);
      var frontDiv  = document.getElementById('objf-front-'    + idx);
      var backDiv   = document.getElementById('objf-back-'     + idx);
      var cmpBox    = document.getElementById('objf-cmp-'      + idx);
      var cmpText   = document.getElementById('objf-cmp-text-' + idx);
      var ta        = document.getElementById('objf-ta-'       + idx);

      checkBtn.addEventListener('click', function () {
        var val = ta ? ta.value.trim() : '';
        if (cmpText) cmpText.textContent = val || '(пусто)';
        if (cmpBox)  cmpBox.style.display = 'block';
        frontDiv.style.display = 'none';
        backDiv.classList.add('visible');
        if (val) {
          fxNotify({
            type: 'objection_answer',
            module: '03',
            objection_idx: idx + 1,
            objection: fanText,
            answer: val
          });
        }
      });

      retryBtn.addEventListener('click', function () {
        backDiv.classList.remove('visible');
        frontDiv.style.display = '';
        if (cmpBox) cmpBox.style.display = 'none';
      });
    });
  }

  /* ── 4. Pill Choice — module 03 entry ──────────────────── */
  function initPillChoice() {
    if (localStorage.getItem('matrix_pill_chosen')) return;

    var overlay = document.createElement('div');
    overlay.id = 'fx-pill';

    overlay.innerHTML =
      '<div id="fx-pill-inner">' +
        '<div class="pill-morpheus">// МОРФЕУС · ОПЕРАТОР · МАТРИЦА АГЕНТСТВА</div>' +
        '<div class="pill-quote">' +
          'Я могу показать тебе только дверь.<br>' +
          'Войти должен(а) ты сам(а).' +
        '</div>' +
        '<div class="pill-sub-text">// Выбери таблетку — и узнай правду о продажах в чате</div>' +
        '<div id="fx-pill-main">' +
          '<div class="pill-buttons">' +
            '<button class="pill-btn pill-red" id="pill-red-btn">' +
              '<div class="pill-shape pill-shape-red">⬤</div>' +
              '<div class="pill-label">КРАСНАЯ</div>' +
              '<div class="pill-caption">Узнать как закрывать фанов на $45+ за сессию и видеть правду о продажах</div>' +
            '</button>' +
            '<button class="pill-btn pill-blue" id="pill-blue-btn">' +
              '<div class="pill-shape pill-shape-blue">⬤</div>' +
              '<div class="pill-label">СИНЯЯ</div>' +
              '<div class="pill-caption">Продолжить писать "привет как дела?" и получать $0 в день</div>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div id="fx-pill-consequence">' +
          '<div class="consequence-zero">$0</div>' +
          '<div class="consequence-text">' +
            'Ты пишешь: "привет, как дела?"<br>' +
            'Фан отвечает один раз. Потом молчит.<br>' +
            'Ты пишешь снова. Тишина.<br>' +
            '<br>// Аккаунт сливает лиды. Агентство теряет деньги.' +
          '</div>' +
          '<div class="consequence-reset">// Перезапуск через <span id="pill-countdown">3</span>...</div>' +
        '</div>' +
      '</div>';

    document.body.prepend(overlay);

    var redBtn  = document.getElementById('pill-red-btn');
    var blueBtn = document.getElementById('pill-blue-btn');
    var mainSec = document.getElementById('fx-pill-main');
    var consSec = document.getElementById('fx-pill-consequence');

    function enterMatrix() {
      localStorage.setItem('matrix_pill_chosen', 'red');
      overlay.classList.add('fx-pill-exit');
      setTimeout(function () { overlay.remove(); }, 560);
    }

    function showConsequence() {
      mainSec.style.display = 'none';
      consSec.style.display = 'block';
      var n = 3;
      var cd = document.getElementById('pill-countdown');
      var tmr = setInterval(function () {
        n--;
        if (cd) cd.textContent = n;
        if (n <= 0) {
          clearInterval(tmr);
          consSec.style.display = 'none';
          mainSec.style.display = 'block';
          if (blueBtn) blueBtn.style.cssText += ';animation:fxShake 0.45s ease;';
          setTimeout(function () { if (blueBtn) blueBtn.style.animation = ''; }, 500);
        }
      }, 1000);
    }

    if (redBtn)  redBtn.addEventListener('click', enterMatrix);
    if (blueBtn) blueBtn.addEventListener('click', showConsequence);
  }

  /* ── 4b. Chat cascade — module 03 ──────────────────────── */
  function initChatCascade() {
    var flow = document.querySelector('.chat-flow');
    if (!flow) return;
    var cards = flow.querySelectorAll('.chat-step-card');
    cards.forEach(function (c) { c.classList.add('fx-chat-out'); });

    var fired = false;
    function tryFire() {
      if (fired) return;
      var rect = flow.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        fired = true;
        cards.forEach(function (c, i) {
          setTimeout(function () { c.classList.add('fx-chat-in'); }, 80 + i * 200);
        });
        window.removeEventListener('scroll', tryFire);
      }
    }
    window.addEventListener('scroll', tryFire, { passive: true });
    setTimeout(tryFire, 120);
  }

  /* ── 5. Particle burst — shared utility ─────────────────── */
  function burst(cx, cy, count, distMul) {
    var colors = ['#4caf6e', '#b8d44a', '#7be89a', '#4a9ab8', '#d4f0de', '#ffe082'];
    count = count || 60;
    distMul = distMul || 1;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'fx-particle';
      var angle = Math.PI * 2 * i / count;
      var dist  = (55 + Math.random() * 130) * distMul;
      var size  = 3 + Math.random() * 5;
      p.style.cssText = [
        'left:' + cx + 'px',
        'top:' + cy + 'px',
        'width:' + size.toFixed(1) + 'px',
        'height:' + size.toFixed(1) + 'px',
        'background:' + colors[i % colors.length],
        '--tx:' + (Math.cos(angle) * dist).toFixed(1) + 'px',
        '--ty:' + (Math.sin(angle) * dist - 55).toFixed(1) + 'px',
        '--dur:' + (0.55 + Math.random() * 0.75).toFixed(2) + 's',
        '--dly:' + (Math.random() * 0.14).toFixed(2) + 's',
      ].join(';');
      document.body.appendChild(p);
      setTimeout(function () { p.remove(); }, 2200);
    }
  }

  /* Фейерверк модуля: 3 волны из разных точек экрана */
  function moduleFirework() {
    var W = window.innerWidth, H = window.innerHeight;
    var points = [
      [W * 0.25, H * 0.4],
      [W * 0.75, H * 0.4],
      [W * 0.5,  H * 0.3],
    ];
    points.forEach(function (pt, idx) {
      setTimeout(function () { burst(pt[0], pt[1], 70, 1.3); }, idx * 180);
    });
    // Финальный большой взрыв по центру
    setTimeout(function () { burst(W * 0.5, H * 0.45, 90, 1.6); }, 550);
  }

  function initParticles() {
    var btn = document.getElementById('m01-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      moduleFirework();
    });
  }

  /* ── 6. Boot sequence + operator name — index ───────────── */
  function initBoot() {
    var opName = localStorage.getItem('operator_name');

    if (opName) {
      showGreeting(opName);
      cardStagger();
      // Если смена ещё не выбрана — показываем тихий промпт
      if (!localStorage.getItem('operator_shift')) showShiftPrompt();
      return;
    }

    if (localStorage.getItem('boot_seen')) {
      showQuickForm();
      return;
    }

    // Full boot sequence
    var lines = [
      { t: '> MATRIX AGENCY TRAINING SYSTEM v2.4', c: '' },
      { t: '> ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...', c: 'dim' },
      { t: '> ПРОТОКОЛЫ ЧАТТЕРА......... [OK]', c: 'ok' },
      { t: '> БАЗА ДАННЫХ ОПЕРАТОРОВ.... [OK]', c: 'ok' },
      { t: '> ЗАШИФРОВАННОЕ СОЕДИНЕНИЕ.. [OK]', c: 'ok' },
      { t: '> ОБУЧАЮЩИЕ МОДУЛИ: 3 / 3 ДОСТУПНО', c: 'ok' },
      { t: '> ', c: '' },
      { t: '> АВТОРИЗАЦИЯ ТРЕБУЕТСЯ.', c: 'warn' },
    ];

    var overlay = document.createElement('div');
    overlay.id = 'fx-boot';
    overlay.innerHTML =
      '<div id="fx-boot-text"></div>' +
      '<div id="fx-boot-form">' +
        '<div id="fx-boot-form-label">> ВВЕДИ ПОЗЫВНОЙ, ОПЕРАТОР:</div>' +
        '<div id="fx-boot-form-row">' +
          '<input id="fx-boot-input" type="text" maxlength="20" placeholder="твой позывной" autocomplete="off" spellcheck="false">' +
          '<button id="fx-boot-submit">ВОЙТИ →</button>' +
        '</div>' +
      '</div>';
    document.body.prepend(overlay);

    var textEl  = document.getElementById('fx-boot-text');
    var form    = document.getElementById('fx-boot-form');
    var input   = document.getElementById('fx-boot-input');
    var submit  = document.getElementById('fx-boot-submit');

    var li = 0;
    function nextLine() {
      if (li >= lines.length) {
        form.style.display = 'flex';
        setTimeout(function () { input.focus(); }, 60);
        return;
      }
      var line = lines[li++];
      var el = document.createElement('div');
      el.className = 'fx-boot-line' + (line.c ? ' ' + line.c : '');
      textEl.appendChild(el);
      var ci = 0, txt = line.t;
      var spd = txt.includes('...') ? 20 : 13;
      var tmr = setInterval(function () {
        el.textContent = txt.slice(0, ++ci);
        if (ci >= txt.length) {
          clearInterval(tmr);
          setTimeout(nextLine, txt.includes('...') ? 90 : 55);
        }
      }, spd);
    }
    setTimeout(nextLine, 350);

    function doEnter() {
      var val = input.value.trim();
      if (!val) { input.focus(); return; }
      localStorage.setItem('operator_name', val);
      localStorage.setItem('boot_seen', '1');
      // Переходим к выбору смены внутри того же оверлея
      overlay.style.transition = 'opacity 0.22s';
      overlay.style.opacity = '0';
      setTimeout(function () {
        overlay.style.opacity = '1';
        overlay.innerHTML =
          '<div id="fx-boot-text">' +
            '<div class="fx-boot-line ok">> ПОЗЫВНОЙ: ' + val.toUpperCase() + ' — ПРИНЯТ</div>' +
            '<div class="fx-boot-line warn">> УКАЖИ РАБОЧУЮ СМЕНУ:</div>' +
          '</div>' +
          '<div id="fx-boot-shift">' +
            '<button class="fx-shift-btn" id="shift-morning">УТРО &nbsp;&nbsp; 08:00 – 16:00 &nbsp; → &nbsp; @Casper_cas</button>' +
            '<button class="fx-shift-btn" id="shift-evening">ВЕЧЕР &nbsp; 16:00 – 00:00 &nbsp; → &nbsp; @Casper_cas / @h4nmabak1</button>' +
            '<button class="fx-shift-btn" id="shift-night">НОЧЬ &nbsp;&nbsp; 00:00 – 08:00 &nbsp; → &nbsp; @h4nmabak1</button>' +
          '</div>';
        ['morning', 'evening', 'night'].forEach(function (s) {
          var btn = document.getElementById('shift-' + s);
          if (!btn) return;
          btn.addEventListener('click', function () {
            localStorage.setItem('operator_shift', s);
            fxNotifyRegister();
            overlay.classList.add('fx-boot-exit');
            setTimeout(function () {
              overlay.remove();
              showGreeting(val);
              cardStagger();
            }, 480);
          });
        });
      }, 260);
    }
    submit.addEventListener('click', doEnter);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doEnter(); });
  }

  /* Мини-промпт для уже авторизованных без смены */
  function showShiftPrompt() {
    var el = document.createElement('div');
    el.id = 'fx-shift-prompt';
    el.style.cssText =
      'position:fixed;bottom:1.8rem;right:1.8rem;z-index:9999;' +
      'background:#0d1610;border:1px solid rgba(76,175,110,0.35);' +
      'padding:1rem 1.4rem;border-radius:3px;font-family:"Share Tech Mono",monospace;' +
      'font-size:.72rem;color:#4caf6e;max-width:280px;' +
      'box-shadow:0 0 20px rgba(76,175,110,0.1);';
    el.innerHTML =
      '<div style="margin-bottom:.6rem;color:#2a6040;">> УКАЖИ СМЕНУ ДЛЯ ОТЧЁТОВ:</div>' +
      '<div style="display:flex;flex-direction:column;gap:.4rem;">' +
        '<button class="fx-shift-btn" id="sps-morning" style="font-size:.7rem;padding:.45rem .8rem;">УТРО 08–16 → @Casper_cas</button>' +
        '<button class="fx-shift-btn" id="sps-evening" style="font-size:.7rem;padding:.45rem .8rem;">ВЕЧЕР 16–00 → @Casper_cas / @h4nmabak1</button>' +
        '<button class="fx-shift-btn" id="sps-night"   style="font-size:.7rem;padding:.45rem .8rem;">НОЧЬ 00–08 → @h4nmabak1</button>' +
      '</div>';
    document.body.appendChild(el);
    ['morning', 'evening', 'night'].forEach(function (s) {
      var btn = document.getElementById('sps-' + s);
      if (!btn) return;
      btn.addEventListener('click', function () {
        localStorage.setItem('operator_shift', s);
        fxNotifyRegister();
        el.style.transition = 'opacity 0.3s';
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 320);
      });
    });
  }

  function showGreeting(name) {
    var h1 = document.querySelector('.hero h1');
    if (!h1) return;
    var g = document.createElement('div');
    g.className = 'fx-operator';
    g.innerHTML = '// ОПЕРАТОР: <span style="color:#4caf6e">' +
      name.toUpperCase() + '</span> — АВТОРИЗОВАН';
    h1.before(g);
  }

  function showQuickForm() {
    var desc = document.querySelector('.hero .desc');
    if (!desc) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:1.4rem;font-family:"Share Tech Mono",monospace;';
    wrap.innerHTML =
      '<div style="font-size:.68rem;color:#2a6040;margin-bottom:.5rem;">&gt; ВВЕДИ ПОЗЫВНОЙ:</div>' +
      '<div style="display:flex;gap:.6rem;">' +
        '<input id="fx-qn" type="text" maxlength="20" placeholder="позывной" autocomplete="off"' +
          ' style="background:transparent;border:none;border-bottom:1px solid #4caf6e;color:#4caf6e;' +
          'font-family:\'Share Tech Mono\',monospace;font-size:.82rem;padding:.25rem .4rem;outline:none;min-width:140px;">' +
        '<button id="fx-qb" style="font-family:\'Orbitron\',monospace;font-size:.68rem;background:#4caf6e;' +
          'color:#080e0b;border:none;padding:.4rem 1rem;border-radius:2px;cursor:pointer;">ВОЙТИ</button>' +
      '</div>';
    desc.after(wrap);
    var ni = document.getElementById('fx-qn');
    var nb = document.getElementById('fx-qb');
    function save() {
      var v = ni.value.trim(); if (!v) return;
      localStorage.setItem('operator_name', v);
      wrap.innerHTML = '<div style="font-family:\'Share Tech Mono\',monospace;font-size:.7rem;color:#4caf6e;">' +
        '// АВТОРИЗОВАН: ' + v.toUpperCase() + '</div>';
      cardStagger();
    }
    nb.addEventListener('click', save);
    ni.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); });
  }

  function cardStagger() {
    document.querySelectorAll('.mod-card:not(.mod-locked)').forEach(function (c, i) {
      c.classList.add('fx-card-in');
      c.style.setProperty('--ci-delay', (i * 0.13) + 's');
    });
    decodeHeroTitle();
  }

  /* ── Hero title decode-scramble (index) ─────────────────── */
  var heroDecoded = false;
  function decodeHeroTitle() {
    if (heroDecoded) return;
    var h1 = document.querySelector('.hero h1');
    if (!h1) return;
    heroDecoded = true;

    var raw = h1.innerHTML;
    var lines = raw.split(/<br\s*\/?>/i).map(function (s) {
      return s.replace(/<[^>]+>/g, '').trim();
    }).filter(Boolean);
    if (!lines.length) return;

    h1.setAttribute('aria-label', lines.join(' '));

    // Run the scramble once per session, and never with reduced motion —
    // on repeat home visits the title just appears, no replay fatigue.
    if (reduceMotion || sessionStorage.getItem('fx_hero_decoded')) return;
    sessionStorage.setItem('fx_hero_decoded', '1');

    var glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*<>/{}';
    function pick() { return glyphs.charAt((Math.random() * glyphs.length) | 0); }

    h1.innerHTML = '';
    var spans = [];
    lines.forEach(function (line, idx) {
      if (idx > 0) h1.appendChild(document.createElement('br'));
      var sp = document.createElement('span');
      sp.className = 'fx-decode';
      sp.setAttribute('aria-hidden', 'true');
      h1.appendChild(sp);
      spans.push({ el: sp, text: line, offset: idx * 90 });
    });

    var INTRO = 130, STEP = 48; // ms: scramble hold, then per-char reveal cadence
    var t0 = performance.now();
    function tick(now) {
      var elapsed = now - t0;
      var allDone = true;
      spans.forEach(function (s) {
        var local = elapsed - s.offset;
        var out = '';
        for (var i = 0; i < s.text.length; i++) {
          var ch = s.text.charAt(i);
          if (ch === ' ') { out += ' '; continue; }
          if (local >= INTRO + i * STEP) {
            out += ch;
          } else {
            out += pick();
            allDone = false;
          }
        }
        s.el.textContent = out;
      });
      if (allDone) {
        spans.forEach(function (s) {
          s.el.textContent = s.text;
          s.el.classList.add('fx-decode-done');
        });
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ── 7a. Shift → lead handle ────────────────────────────── */
  function getShiftLead() {
    var s = localStorage.getItem('operator_shift');
    if (s === 'morning') return '@Casper_cas (Лена)';
    if (s === 'evening') return '@Casper_cas (Лена) и @h4nmabak1 (Саша)';
    if (s === 'night')   return '@h4nmabak1 (Саша)';
    return '@Casper_cas (Лена) и @h4nmabak1 (Саша)';
  }

  /* ── 7b. Copy result button ──────────────────────────────── */
  function buildCopyText(num, scoreText) {
    var name  = (localStorage.getItem('operator_name') || 'неизвестен').toUpperCase();
    var id    = 'm0' + num;
    var t     = parseInt(localStorage.getItem(timerSavedKey(id)) || '0');
    var startMs = localStorage.getItem(timerStartKey(id));
    var endMs   = localStorage.getItem(timerEndKey(id));
    var date  = new Date().toLocaleDateString('ru-RU');
    var lines = [
      '✅ МОДУЛЬ 0' + num + ' ПРОЙДЕН — Matrix Agency Chatter School',
      '────────────────────────',
      '👤 Оператор: ' + name,
    ];
    var wrong = localStorage.getItem('matrix_' + id + '_wrong');
    if (scoreText) lines.push('🎯 Тест: ' + scoreText);
    if (wrong)     lines.push('❌ Ошибки в вопросах: ' + wrong);
    if (startMs)   lines.push('▶ Начало: ' + fmtClock(startMs));
    if (endMs)     lines.push('⏹ Конец: ' + fmtClock(endMs));
    if (t)         lines.push('⏱ Время: ' + fmtTime(t));
    lines.push('📅 ' + date);
    lines.push('────────────────────────');
    lines.push('📩 Тимлид смены: ' + getShiftLead());
    return lines.join('\n');
  }

  function showCopyBtn(containerId, num, scoreText) {
    var container = document.getElementById(containerId);
    if (!container || container.querySelector('.fx-copy-wrap')) return;
    var text = buildCopyText(num, scoreText);
    var lead = getShiftLead();
    var wrap = document.createElement('div');
    wrap.className = 'fx-copy-wrap';
    wrap.innerHTML =
      '<div class="fx-copy-lead">// Отправить результат: ' + lead + '</div>' +
      '<button class="fx-copy-btn" id="fx-cb-' + num + '">⎘ Скопировать результат для тимлида</button>';
    container.appendChild(wrap);
    var btn = document.getElementById('fx-cb-' + num);
    if (!btn) return;
    btn.addEventListener('click', function () {
      function onCopied() {
        btn.textContent = '✓ Скопировано!';
        btn.classList.add('copied');
        // Только после копирования — открываем следующий модуль
        if (num === 2) {
          localStorage.setItem('matrix_m02_done', '1');
          if (window.m02Activate) window.m02Activate();
        }
        setTimeout(function () {
          btn.textContent = '⎘ Скопировать результат для тимлида';
          btn.classList.remove('copied');
        }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onCopied).catch(function () {
          fallbackCopy(text); onCopied();
        });
      } else {
        fallbackCopy(text); onCopied();
      }
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }

  /* ── 7b2. Nav progress dots ─────────────────────────────── */
  function initNavProgress() {
    var links = document.querySelectorAll('.site-nav a[href]');
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var key = null;
      if (href.indexOf('01-') !== -1) key = 'matrix_m01_done';
      else if (href.indexOf('02-') !== -1) key = 'matrix_m02_done';
      else if (href.indexOf('03-') !== -1) key = 'matrix_m03_done';
      if (key && localStorage.getItem(key)) {
        a.style.position = 'relative';
        var dot = document.createElement('span');
        dot.style.cssText =
          'position:absolute;top:-3px;right:-3px;' +
          'width:6px;height:6px;border-radius:50%;' +
          'background:#4caf6e;box-shadow:0 0 6px rgba(76,175,110,0.85);';
        a.appendChild(dot);
      }
    });
  }

  /* ── 7b3. Table scroll wrapper ───────────────────────────── */
  function initTableWrap() {
    document.querySelectorAll('.htable').forEach(function (t) {
      if (t.parentElement.classList.contains('fx-table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'fx-table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
      t.style.marginTop = '0';
    });
  }

  /* ── 7c. Page transitions ────────────────────────────────── */
  function initPageTransition() {
    document.body.classList.add('fx-pg-in');
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('http') === 0 || href.indexOf('mailto') === 0) return;
      if (href.indexOf('.html') === -1) return;
      e.preventDefault();
      document.body.classList.add('fx-pg-out');
      setTimeout(function () { window.location.href = href; }, 280);
    });
  }

  /* ── 7. Module Timers ────────────────────────────────────── */
  var TIMER_MIN_SEC = { m01: 3 * 60, m02: 5 * 60, m03: 5 * 60 };

  function timerStartKey(id) { return 'matrix_' + id + '_start'; }
  function timerSavedKey(id) { return 'matrix_' + id + '_time'; }
  function timerDoneKey(id)  { return 'matrix_' + id + '_done'; }
  function timerEndKey(id)   { return 'matrix_' + id + '_end'; }

  function fmtClock(ms) {
    if (!ms) return '';
    var d = new Date(parseInt(ms));
    if (isNaN(d.getTime())) return '';
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var dd = pad(d.getDate());
    var mm = pad(d.getMonth() + 1);
    var hh = pad(d.getHours());
    var mn = pad(d.getMinutes());
    return hh + ':' + mn + ' (' + dd + '.' + mm + ')';
  }

  function startModuleTimer(id) {
    if (localStorage.getItem(timerDoneKey(id))) return;
    if (!localStorage.getItem(timerStartKey(id))) {
      localStorage.setItem(timerStartKey(id), Date.now().toString());
    }
  }

  function getElapsedSec(id) {
    var s = parseInt(localStorage.getItem(timerStartKey(id)) || '0');
    if (!s) return 0;
    return Math.floor((Date.now() - s) / 1000);
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    if (m === 0) return s + ' сек';
    return m + ' мин ' + (s < 10 ? '0' : '') + s + ' сек';
  }

  function showTimeLockToast(remaining) {
    var old = document.getElementById('fx-timelock');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'fx-timelock';
    el.innerHTML =
      '⏱ СЛИШКОМ БЫСТРО — прочитай модуль до конца<br>' +
      '<span style="font-size:.62rem;color:#4a7a5a;">Осталось минимум ≈ ' +
      Math.ceil(remaining / 60) + ' мин</span>';
    el.style.cssText =
      'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);' +
      'background:#0d1610;border:1px solid rgba(184,212,74,0.45);color:#b8d44a;' +
      'font-family:"Share Tech Mono",monospace;font-size:.75rem;' +
      'padding:.75rem 1.6rem;border-radius:2px;z-index:99999;' +
      'letter-spacing:.08em;text-align:center;white-space:nowrap;' +
      'box-shadow:0 0 20px rgba(184,212,74,0.15);';
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity 0.6s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 700);
    }, 3500);
  }

  function checkAndSaveTime(id) {
    if (localStorage.getItem(timerDoneKey(id))) return true; // already done
    var elapsed = getElapsedSec(id);
    var min = TIMER_MIN_SEC[id] || 0;
    if (elapsed < min) {
      showTimeLockToast(min - elapsed);
      return false;
    }
    if (!localStorage.getItem(timerSavedKey(id))) {
      localStorage.setItem(timerSavedKey(id), elapsed.toString());
    }
    if (!localStorage.getItem(timerEndKey(id))) {
      localStorage.setItem(timerEndKey(id), Date.now().toString());
    }
    return true;
  }

  function initModuleTimer() {
    if (IS_M01) {
      startModuleTimer('m01');
      var _orig01 = window.m01Complete;
      window.m01Complete = function () {
        if (!checkAndSaveTime('m01')) return;
        if (_orig01) _orig01();
        fxNotifyResult('01', {
          time: localStorage.getItem('matrix_m01_time'),
          started_at: fmtClock(localStorage.getItem('matrix_m01_start')),
          finished_at: fmtClock(localStorage.getItem('matrix_m01_end'))
        });
        var msg = document.getElementById('m01-msg');
        if (msg) {
          var t = localStorage.getItem(timerSavedKey('m01'));
          if (t) {
            var tEl = document.createElement('span');
            tEl.style.cssText = 'display:block;margin-top:.35rem;font-size:.68rem;color:#2a6040;';
            tEl.textContent = '// Время прохождения: ' + fmtTime(parseInt(t));
            msg.appendChild(tEl);
          }
          // Кнопка копирования для M01
          setTimeout(function () { showCopyBtn('m01-msg', 1, null); }, 200);
        }
      };
    }

    if (IS_M02) {
      startModuleTimer('m02');
      var _orig02 = window.qShowResult;
      window.qShowResult = function () {
        if (!checkAndSaveTime('m02')) return;
        if (_orig02) _orig02.apply(this, arguments);
        // Сохраняем балл теста
        var scoreText = null;
        var correct = 0;
        if (Array.isArray(window.qOk)) {
          correct = window.qOk.filter(Boolean).length;
          scoreText = correct + '/' + window.qOk.length;
          localStorage.setItem('matrix_m02_score', scoreText);
        }
        var passed = correct >= 16;
        var wrongList = Array.isArray(window.qOk)
          ? window.qOk.map(function(v,i){ return v?null:(i+1); }).filter(Boolean).join(', ')
          : '';
        if (wrongList) localStorage.setItem('matrix_m02_wrong', wrongList);
        fxNotifyResult('02', {
          score: scoreText || localStorage.getItem('matrix_m02_score'),
          time: localStorage.getItem('matrix_m02_time'),
          started_at: fmtClock(localStorage.getItem('matrix_m02_start')),
          finished_at: fmtClock(localStorage.getItem('matrix_m02_end')),
          wrong: wrongList,
          passed: passed ? 'да' : 'нет'
        });
        if (!passed) return; // ниже — только если тест сдан
        moduleFirework();
        // Кнопка копирования прямо под результатом
        setTimeout(function () {
          showCopyBtn('qfinal', 2, scoreText || localStorage.getItem('matrix_m02_score'));
        }, 300);
      };
    }

    if (IS_M03) {
      startModuleTimer('m03');
      var _orig03 = window.mqShowResult;
      window.mqShowResult = function () {
        if (!checkAndSaveTime('m03')) return;
        if (_orig03) _orig03.apply(this, arguments);
        moduleFirework();
        // Сохраняем балл теста
        var scoreText = null;
        if (Array.isArray(window.mqCorrect)) {
          scoreText = window.mqCorrect.filter(Boolean).length + '/' + window.mqCorrect.length;
          localStorage.setItem('matrix_m03_score', scoreText);
        }
        var wrongList3 = Array.isArray(window.mqCorrect)
          ? window.mqCorrect.map(function(v,i){ return v?null:(i+1); }).filter(Boolean).join(', ')
          : '';
        if (wrongList3) localStorage.setItem('matrix_m03_wrong', wrongList3);
        fxNotifyResult('03', {
          score: scoreText || localStorage.getItem('matrix_m03_score'),
          time: localStorage.getItem('matrix_m03_time'),
          started_at: fmtClock(localStorage.getItem('matrix_m03_start')),
          finished_at: fmtClock(localStorage.getItem('matrix_m03_end')),
          wrong: wrongList3
        });
        setTimeout(function () {
          showCopyBtn('mqfinal', 3, scoreText || localStorage.getItem('matrix_m03_score'));
        }, 300);
      };
    }
  }

  function appendTimeToResult(id, blockId) {
    setTimeout(function () {
      var block = document.getElementById(blockId);
      if (!block) return;
      var t = localStorage.getItem(timerSavedKey(id));
      if (!t || block.querySelector('.fx-time-badge')) return;
      var badge = document.createElement('div');
      badge.className = 'fx-time-badge';
      badge.style.cssText =
        'margin-top:1rem;font-family:"Share Tech Mono",monospace;' +
        'font-size:.7rem;color:#2a6040;letter-spacing:.08em;' +
        'border-top:1px solid rgba(76,175,110,0.1);padding-top:.75rem;';
      badge.textContent = '// Модуль пройден за: ' + fmtTime(parseInt(t));
      block.appendChild(badge);
    }, 200);
  }

  /* ── 8. Index: show completion times on cards ────────────── */
  function initIndexTimes() {
    ['m01', 'm02', 'm03'].forEach(function (id, i) {
      var t = localStorage.getItem(timerSavedKey(id));
      if (!t) return;
      var card = document.querySelector('[data-mod="' + (i + 1) + '"]');
      if (!card) return;
      if (card.querySelector('.fx-time-badge')) return;
      var badge = document.createElement('div');
      badge.className = 'fx-time-badge';
      badge.style.cssText =
        'font-family:"Share Tech Mono",monospace;font-size:.62rem;' +
        'color:#2a6040;margin-top:.55rem;letter-spacing:.06em;';
      badge.textContent = '// пройден за ' + fmtTime(parseInt(t));
      card.appendChild(badge);
    });
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    initPageTransition();
    initProgress();
    initReveal();
    initNavProgress();
    initTableWrap();
    if (IS_M01) initParticles();
    if (IS_M02) initFlipCards();
    if (IS_M03) { initPillChoice(); initChatCascade(); initObjFlipCards(); }
    if (IS_IDX) initBoot();
    if (IS_IDX && localStorage.getItem('operator_name')) cardStagger();
    if (IS_IDX && !document.getElementById('fx-boot')) decodeHeroTitle();
    initModuleTimer();
    if (IS_IDX) initIndexTimes();
  });

}());
