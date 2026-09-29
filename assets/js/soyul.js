/* 소율한의원 — site behaviour (no dependencies). Exposes window.Soyul for reuse. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  root.classList.add('js');

  /* ---------- config ---------- */
  var DEFAULTS = {
    name: '소율한의원', phone: '010-5156-7504',
    blog: 'https://blog.naver.com/soriyul_', instagram: 'https://www.instagram.com/5zhyun_',
    kakaoChannel: '', naverBooking: '', heroVideo: '', openDate: '', openLabel: '2026년 11월 개원 예정',
    address: '서울특별시 광진구 아차산로 405 벨라로사오피스텔 3층', lat: 37.537786, lng: 127.087614,
    hours: { weekday: ['09:00', '20:00'], weekend: ['10:00', '15:00'], lunch: ['14:00', '15:00'] }, holidays: [], notice: '', photos: {}, photoNote: ''
  };
  function readConfig() {
    var el = doc.getElementById('soyul-config'), cfg = {};
    if (el) { try { cfg = JSON.parse(el.textContent); } catch (e) { /* keep defaults */ } }
    var out = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    for (k in cfg) if (cfg[k] !== undefined && cfg[k] !== null) out[k] = cfg[k];
    return out;
  }
  var C = readConfig();

  /* ---------- time (always Korea time) ---------- */
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function kst(date) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
    var p = {}; f.formatToParts(date || new Date()).forEach(function (x) { p[x.type] = x.value; });
    var h = +p.hour; if (h === 24) h = 0;
    return { y: +p.year, m: +p.month, d: +p.day, dow: DOW[p.weekday], min: h * 60 + (+p.minute), iso: p.year + '-' + p.month + '-' + p.day };
  }
  function toMin(hhmm) { var a = hhmm.split(':'); return (+a[0]) * 60 + (+a[1]); }
  function addDays(iso, n) {
    var a = iso.split('-'), dt = new Date(Date.UTC(+a[0], +a[1] - 1, +a[2] + n, 3));
    return kst(dt);
  }
  function lunchRange() { var l = C.hours && C.hours.lunch; return (l && l.length === 2) ? l : null; }
  function hoursFor(day) {
    var holiday = (C.holidays || []).indexOf(day.iso) > -1;
    var weekend = day.dow === 0 || day.dow === 6, rest = weekend || holiday;
    /* weekday lunch break only — weekends and public holidays run straight through */
    return { holiday: holiday, rest: rest, range: rest ? C.hours.weekend : C.hours.weekday, lunch: rest ? null : lunchRange() };
  }
  function status(date) {
    var now = kst(date), h = hoursFor(now), open = toMin(h.range[0]), close = toMin(h.range[1]);
    var res = { day: now, hours: h, today: h.range[0] + ' – ' + h.range[1], lunch: h.lunch ? h.lunch[0] + ' – ' + h.lunch[1] : '' };
    if (C.openDate && now.iso < C.openDate) { res.state = 'soon'; res.text = C.openLabel + ' · 개원 후 365일 진료'; res.short = C.openLabel; return res; }
    var l0 = h.lunch ? toMin(h.lunch[0]) : -1, l1 = h.lunch ? toMin(h.lunch[1]) : -1;
    if (now.min < open) { res.state = 'before'; res.text = '진료 전 · 오늘 ' + h.range[0] + '부터 진료'; }
    else if (h.lunch && now.min >= l0 && now.min < l1) { res.state = 'lunch'; res.text = '점심시간 · ' + h.lunch[1] + '부터 다시 진료'; }
    else if (now.min < close) {
      res.state = 'open';
      res.text = (h.lunch && now.min < l0 && l0 - now.min <= 60) ? '지금 진료 중 · ' + h.lunch[0] + '부터 점심시간' : '지금 진료 중 · 오늘 ' + h.range[1] + '까지';
    }
    else {
      var next = hoursFor(addDays(now.iso, 1));
      res.state = 'closed'; res.text = '오늘 진료 마감 · 내일 ' + next.range[0] + '부터 진료';
    }
    return res;
  }

  function paintStatus() {
    var s = status();
    doc.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.remove('is-open', 'is-closed', 'is-soon', 'is-before', 'is-lunch');
      el.classList.add('is-' + s.state);
      var t = el.querySelector('[data-status-text]');
      if (t) t.textContent = (el.hasAttribute('data-status-short') && s.short) ? s.short : s.text;
      if (el.hasAttribute('data-hide-soon')) el.hidden = s.state === 'soon';
    });
    doc.querySelectorAll('[data-today-hours]').forEach(function (el) { el.textContent = s.today; });
    doc.querySelectorAll('[data-today-lunch]').forEach(function (el) { el.textContent = s.lunch ? '점심시간 ' + s.lunch : '점심시간 없이 진료'; });
    var L = lunchRange();
    doc.querySelectorAll('[data-lunch-text]').forEach(function (el) { el.hidden = !L; if (L) el.textContent = '점심시간 ' + L[0] + ' – ' + L[1]; });
    doc.querySelectorAll('[data-hours-row]').forEach(function (row) {
      row.classList.toggle('is-today', row.getAttribute('data-hours-row') === (s.hours.rest ? 'weekend' : 'weekday'));
    });
    doc.querySelectorAll('[data-week] li').forEach(function (li) {
      var dow = +li.getAttribute('data-dow'), today = dow === s.day.dow, track = li.querySelector('.sy-week__track');
      li.classList.toggle('is-today', today);
      if (!track) return;
      /* bars on the 09–20 scale, split at the weekday lunch break; a weekday public holiday today uses holiday hours */
      var rest = dow === 0 || dow === 6 || (today && s.hours.holiday);
      var r = rest ? C.hours.weekend : C.hours.weekday, lb = rest ? null : lunchRange();
      var h = function (t) { return toMin(t) / 60 - 9; }, segs = lb ? [[h(r[0]), h(lb[0])], [h(lb[1]), h(r[1])]] : [[h(r[0]), h(r[1])]];
      track.innerHTML = segs.map(function (g) { return '<span class="sy-week__bar" style="--s:' + g[0] + ';--e:' + g[1] + '"></span>'; }).join('');
    });
    var wk = doc.querySelector('[data-week]');
    if (wk) wk.setAttribute('aria-label', '요일별 진료시간: 평일 ' + C.hours.weekday[0] + '–' + C.hours.weekday[1] + (L ? ', 점심시간 ' + L[0] + '–' + L[1] : '') +
      '. 토·일요일 ' + C.hours.weekend[0] + '–' + C.hours.weekend[1] + ', 점심시간 없음.');
    var chip = doc.querySelector('[data-opening-text]');
    if (chip && s.state !== 'soon' && C.openDate) chip.textContent = '구의역 이명·난청 특화 한의원';
    doc.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = s.day.y; });
    return s;
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(text, withCall) {
    var t = doc.querySelector('[data-toast]'); if (!t) return;
    t.querySelector('[data-toast-text]').textContent = text;
    var act = t.querySelector('[data-toast-action]'); if (act) act.hidden = !withCall;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-shown'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-shown'); setTimeout(function () { t.hidden = true; }, 300); }, 4800);
  }

  /* ---------- links: phone, channels, maps ---------- */
  var PENDING = {
    kakaoChannel: '카카오톡 채널은 곧 열립니다. 지금은 전화로 편하게 문의해 주세요.',
    naverBooking: '네이버 예약은 곧 열립니다. 지금은 전화로 예약해 주세요.'
  };
  function telHref() { return 'tel:' + String(C.phone).replace(/[^0-9+]/g, ''); }
  function wireLinks() {
    doc.querySelectorAll('[data-tel]').forEach(function (a) { a.setAttribute('href', telHref()); });
    doc.querySelectorAll('[data-link]').forEach(function (a) {
      var key = a.getAttribute('data-link'), url = C[key];
      if (url) {
        a.setAttribute('href', url); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
        a.classList.remove('is-pending');
      } else {
        a.classList.add('is-pending');
        a.setAttribute('href', '#');
        a.removeAttribute('target');
        var label = (a.textContent || '').replace(/\s+/g, ' ').trim() || a.getAttribute('aria-label') || '';
        a.setAttribute('aria-label', label + ' (오픈 예정)');
        if (!a.querySelector('.sy-pending-tag') && !a.closest('.sy-footer__sns') && !a.closest('.sy-channels')) {
          var tag = doc.createElement('span'); tag.className = 'sy-pending-tag'; tag.textContent = '오픈 예정'; tag.setAttribute('aria-hidden', 'true');
          a.appendChild(tag);
        }
        a.addEventListener('click', function (e) { e.preventDefault(); toast(PENDING[key] || '곧 열립니다. 지금은 전화로 문의해 주세요.', true); });
      }
    });
    doc.querySelectorAll('[data-pending-label]').forEach(function (el) {
      var a = el.closest('[data-link]'); if (a && C[a.getAttribute('data-link')]) el.textContent = '바로가기';
    });
    doc.querySelectorAll('[data-map]').forEach(function (a) {
      var kind = a.getAttribute('data-map');
      if (kind !== 'tmap') a.setAttribute('href', mapUrl(kind));
      else {
        a.setAttribute('href', mapUrl('tmap'));
        a.addEventListener('click', function (e) { e.preventDefault(); openTmap(); });
      }
    });
  }
  var UA = navigator.userAgent || '';
  var isAndroid = /Android/i.test(UA), isIOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function mapUrl(kind) {
    var n = encodeURIComponent(C.name), lat = C.lat, lng = C.lng;
    switch (kind) {
      case 'google': return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + '%2C' + lng + '&travelmode=transit';
      case 'google-view': return 'https://www.google.com/maps/search/?api=1&query=' + lat + '%2C' + lng;
      case 'naver': return 'https://map.naver.com/p/search/' + encodeURIComponent(C.address.replace(/\s*벨라로사오피스텔.*$/, ''));
      case 'kakao': return 'https://map.kakao.com/link/to/' + n + ',' + lat + ',' + lng;
      case 'tmap': return 'tmap://route?rGoName=' + n + '&rGoX=' + lng + '&rGoY=' + lat;
    }
    return '#';
  }
  function openTmap() {
    var scheme = mapUrl('tmap');
    if (isAndroid) {
      location.href = 'intent://route?rGoName=' + encodeURIComponent(C.name) + '&rGoX=' + C.lng + '&rGoY=' + C.lat + '#Intent;scheme=tmap;package=com.skt.tmap.ku;end';
    } else if (isIOS) {
      var start = Date.now();
      location.href = scheme;
      setTimeout(function () {
        if (!doc.hidden && Date.now() - start < 2600) location.href = 'https://apps.apple.com/kr/app/id431589174';
      }, 1800);
    } else {
      openModal('modal-tmap');
    }
  }

  /* ---------- modals ---------- */
  var lastFocus = null;
  function openModal(id) {
    var d = doc.getElementById(id); if (!d) return;
    lastFocus = doc.activeElement;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function wireModals() {
    doc.addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]');
      if (o) { e.preventDefault(); openModal(o.getAttribute('data-open')); return; }
      var c = e.target.closest('[data-close]');
      if (c) { var d = c.closest('dialog'); if (d) d.close(); }
    });
    doc.querySelectorAll('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
      d.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    });
  }

  /* ---------- header, menu, quick menu ---------- */
  function wireHeader() {
    var header = doc.getElementById('header'), qm = doc.querySelector('[data-quickmenu]');
    function onScroll() {
      var y = window.scrollY || 0;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (qm) qm.classList.toggle('is-top-visible', y > 640);
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    var sheet = doc.getElementById('menu'), openBtn = doc.querySelector('[data-menu-open]');
    function closeMenu(keepFocus) {
      if (!sheet || sheet.hidden) return;
      sheet.classList.remove('is-open'); root.style.overflow = '';
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      setTimeout(function () { sheet.hidden = true; if (openBtn && !keepFocus) openBtn.focus(); }, 320);
    }
    function openMenu() {
      if (!sheet) return;
      sheet.hidden = false; root.style.overflow = 'hidden';
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { sheet.classList.add('is-open'); var f = sheet.querySelector('a, button'); if (f) f.focus(); });
    }
    if (openBtn) openBtn.addEventListener('click', openMenu);
    if (sheet) {
      sheet.addEventListener('click', function (e) {
        if (e.target.closest('[data-menu-close]')) { closeMenu(); return; }
        var a = e.target.closest('a[href^="#"]');
        if (a && !a.closest('[data-link]') && a.getAttribute('href').length > 1) {
          var target = doc.getElementById(a.getAttribute('href').slice(1));
          e.preventDefault(); closeMenu(true);
          if (target) requestAnimationFrame(function () {
            var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            if (history.pushState) history.pushState(null, '', '#' + target.id);
            target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
          });
        }
      });
      sheet.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
        if (e.key === 'Tab') {
          var f = sheet.querySelectorAll('a[href], button:not([disabled])'), first = f[0], last = f[f.length - 1];
          if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    if (qm) {
      var toggle = qm.querySelector('[data-quickmenu-toggle]');
      var stored = null; try { stored = localStorage.getItem('soyul.qm'); } catch (e) {}
      var collapsed = stored ? stored === 'closed' : window.innerWidth < 1440;
      function setQm(c) {
        qm.classList.toggle('is-collapsed', c);
        if (toggle) { toggle.setAttribute('aria-expanded', String(!c)); toggle.querySelector('.sy-sr').textContent = c ? '바로가기 펼치기' : '바로가기 접기'; }
      }
      setQm(collapsed);
      if (toggle) toggle.addEventListener('click', function () {
        collapsed = !qm.classList.contains('is-collapsed'); setQm(collapsed);
        try { localStorage.setItem('soyul.qm', collapsed ? 'closed' : 'open'); } catch (e) {}
      });
    }
    // scrollspy
    var links = doc.querySelectorAll('.sy-nav a[href^="#"]');
    if ('IntersectionObserver' in window && links.length) {
      var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && map[en.target.id]) {
            links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
            map[en.target.id].classList.add('is-active'); map[en.target.id].setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) spy.observe(s); });
      var topSec = doc.getElementById('top');
      if (topSec) new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
      }, { rootMargin: '-45% 0px -50% 0px' }).observe(topSec);
    }
  }

  /* ---------- reveal on scroll ---------- */
  function wireReveal() {
    var els = doc.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(function (el) { el.classList.add('is-visible'); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-reveal'); }) : [el];
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 80 + 'ms';
        el.classList.add('is-visible'); io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- copy address ---------- */
  function wireCopy() {
    doc.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy'), label = btn.querySelector('span');
        function done() {
          btn.classList.add('is-done'); if (label) label.textContent = '복사했어요';
          toast('주소를 복사했어요. 지도 앱에 붙여 넣어 검색해 보세요.', false);
          setTimeout(function () { btn.classList.remove('is-done'); if (label) label.textContent = '주소 복사'; }, 2400);
        }
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
        function fallback() {
          var ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
          doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); done(); } catch (e) { toast(text, false); } doc.body.removeChild(ta);
        }
      });
    });
  }

  /* ---------- self check ---------- */
  function wireCheck() {
    var box = doc.querySelector('[data-selfcheck]'); if (!box) return;
    var inputs = box.querySelectorAll('input[type="checkbox"]'), result = box.querySelector('[data-check-result]');
    var count = box.querySelector('[data-check-count]'), msg = box.querySelector('[data-check-msg]'), actions = box.querySelector('[data-check-actions]');
    function update() {
      var n = 0, urgent = false;
      inputs.forEach(function (i) { if (i.checked) { n++; if (i.hasAttribute('data-urgent')) urgent = true; } });
      count.textContent = n;
      result.classList.toggle('is-urgent', urgent);
      var m;
      if (urgent) m = '갑자기 청력이 떨어졌다면 돌발성 난청일 수 있어요. 가능한 한 빨리 이비인후과 검사를 받으시고, 한방 치료를 함께 받으실지는 전화로 상의해 주세요.';
      else if (n === 0) m = '항목을 눌러 확인해 보세요.';
      else if (n <= 2) m = '가벼운 신호가 보여요. 충분히 쉬어도 증상이 2주 이상 이어진다면 상담을 받아 보세요.';
      else if (n <= 5) m = '여러 신호가 함께 보여요. 원인을 함께 살펴보는 상담을 권해 드려요.';
      else m = '불편함이 일상에 영향을 주고 있어요. 혼자 참지 마시고 가까운 시일 안에 진료를 받아 보세요.';
      msg.textContent = m;
      actions.hidden = n === 0;
    }
    inputs.forEach(function (i) { i.addEventListener('change', update); });
    var reset = box.querySelector('[data-check-reset]');
    if (reset) reset.addEventListener('click', function () { inputs.forEach(function (i) { i.checked = false; }); update(); inputs[0].focus(); });
    update();
  }

  /* ---------- map tabs + lazy live map ---------- */
  function wireMapTabs() {
    var tabs = doc.querySelectorAll('[data-map-tab]'); if (!tabs.length) return;
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        var p = doc.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (tab.getAttribute('data-map-tab') === 'live') {
        var holder = doc.querySelector('[data-live-map]');
        if (holder && !holder.querySelector('iframe')) {
          var f = doc.createElement('iframe');
          f.src = 'https://www.google.com/maps?q=' + C.lat + ',' + C.lng + '&z=17&hl=ko&output=embed';
          f.title = C.name + ' 위치 (구글 지도)'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
          holder.innerHTML = ''; holder.appendChild(f);
        }
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); select(n);
        }
      });
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
  }

  /* ---------- hero: video slot or animated route map ---------- */
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function back(t) { var c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function seg(t, a, b) { return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); }
  function wireHero() {
    var media = doc.querySelector('[data-hero-media]'); if (!media) return;
    var toggle = media.querySelector('[data-route-toggle]');
    if (C.heroVideo) {
      var slot = media.querySelector('[data-hero-video]'), mapWrap = media.querySelector('[data-route-anim]');
      var v = doc.createElement('video');
      v.src = C.heroVideo; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'metadata';
      v.setAttribute('aria-label', '소율한의원 오시는 길 영상');
      slot.appendChild(v); slot.hidden = false; if (mapWrap) mapWrap.hidden = true;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.autoplay = false; v.pause(); }
      if (toggle) toggle.addEventListener('click', function () {
        var paused = toggle.getAttribute('aria-pressed') === 'true';
        if (paused) { v.play(); toggle.setAttribute('aria-pressed', 'false'); } else { v.pause(); toggle.setAttribute('aria-pressed', 'true'); }
      });
      return;
    }
    var svg = media.querySelector('.soyul-map--hero'); if (!svg) return;
    var q = function (s) { return svg.querySelector(s); };
    var ring = q('.m-exit2-ring'), dots = svg.querySelectorAll('.m-dot'), walker = q('.m-walker'), route = q('.m-route');
    var pin = q('.m-pin'), plate = q('.m-plate-clinic'), f3 = q('.m-3f'), bus = q('.m-bus');
    var noteWalk = q('.m-note-walk'), noteHere = q('.m-note-here'), noteBus = q('.m-note-bus');
    var steps = media.querySelectorAll('[data-route-step]');
    var total = route ? route.getTotalLength() : 0, LOOP = 12000;
    function op(el, v) { if (el) el.style.opacity = v; }
    function render(t) {
      var s1 = seg(t, 400, 1700);
      if (ring) { var r = (t % 1300) / 1300; var on = t > 300 && t < 2000; ring.style.opacity = on ? (1 - r) * 0.9 : 0; ring.style.transform = 'scale(' + (1 + r * 1.3) + ')'; }
      var w = seg(t, 1800, 3800);
      dots.forEach(function (d, i) { var at = i / Math.max(dots.length - 1, 1); d.style.opacity = w >= at ? 1 : 0; });
      if (walker && route) {
        var p = route.getPointAtLength(total * ease(w));
        walker.setAttribute('cx', p.x.toFixed(1)); walker.setAttribute('cy', p.y.toFixed(1));
        walker.style.opacity = (t > 1700 && t < 4300) ? 1 : 0;
      }
      op(noteWalk, seg(t, 2300, 2800));
      var pp = seg(t, 3800, 4500);
      if (pin) { pin.style.opacity = pp; pin.style.transform = 'translateY(' + ((1 - back(pp)) * -28).toFixed(1) + 'px)'; }
      if (f3) f3.style.fill = t > 3900 ? 'var(--sage)' : '';
      op(plate, seg(t, 4300, 4800)); op(noteHere, seg(t, 4700, 5100));
      var b = seg(t, 5000, 6400), out = seg(t, 10400, 11600);
      if (bus) { bus.style.transform = 'translateX(' + ((1 - ease(b)) * 260 - ease(out) * 320).toFixed(1) + 'px)'; bus.style.opacity = t < 11600 ? 1 : 0; }
      op(noteBus, seg(t, 6200, 6700) * (1 - seg(t, 10400, 10800)));
      var fade = 1 - seg(t, 11000, 11800);
      if (t > 11000) { dots.forEach(function (d) { d.style.opacity = fade; }); op(pin, fade); op(plate, fade); op(noteHere, fade); op(noteWalk, fade); if (f3 && fade < .5) f3.style.fill = ''; }
      var active = t < 400 ? 0 : t < 1800 ? 1 : t < 3900 ? 2 : t < 11000 ? 3 : 0;
      steps.forEach(function (li) { li.classList.toggle('is-active', +li.getAttribute('data-route-step') === active); });
    }
    function finalFrame() {
      dots.forEach(function (d) { d.style.opacity = 1; });
      [pin, plate, noteWalk, noteHere, noteBus].forEach(function (el) { if (el) { el.style.opacity = 1; el.style.transform = ''; } });
      if (walker) walker.style.opacity = 0; if (ring) ring.style.opacity = 0;
      if (bus) { bus.style.transform = ''; bus.style.opacity = 1; } if (f3) f3.style.fill = 'var(--sage)';
      steps.forEach(function (li) { li.classList.remove('is-active'); });
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finalFrame(); if (toggle) toggle.hidden = true; return; }
    var t0 = null, elapsed = 0, raf = 0, userPaused = false, visible = true;
    function frame(ts) {
      if (t0 === null) t0 = ts - elapsed;
      elapsed = ts - t0; render(elapsed % LOOP);
      raf = requestAnimationFrame(frame);
    }
    function play() { if (raf || userPaused || !visible) return; t0 = null; svg.classList.remove('is-paused'); raf = requestAnimationFrame(frame); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; svg.classList.add('is-paused'); }
    if (toggle) toggle.addEventListener('click', function () {
      userPaused = !userPaused; toggle.setAttribute('aria-pressed', String(userPaused));
      if (userPaused) { stop(); } else { play(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) play(); else stop(); }, { threshold: 0.15 }).observe(media);
    }
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) stop(); else play(); });
    render(0); play();
  }

  /* ---------- illustrated maps: zoom in on small screens ---------- */
  function wireMapViewBox() {
    var maps = doc.querySelectorAll('.soyul-map[data-vb-sm]'); if (!maps.length) return;
    var mq = window.matchMedia('(max-width: 767px)');
    function apply() { maps.forEach(function (m) { m.setAttribute('viewBox', m.getAttribute(mq.matches ? 'data-vb-sm' : 'data-vb')); }); }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply); else if (mq.addListener) mq.addListener(apply);
  }

  /* ---------- optional notice + photos ---------- */
  function wireExtras() {
    var od = String(C.openDate || '').split('-');
    if (od.length === 3) doc.querySelectorAll('[data-open-date]').forEach(function (el) { el.textContent = (+od[0]) + '년 ' + (+od[1]) + '월 ' + (+od[2]) + '일'; });
    var n = doc.querySelector('[data-notice]');
    if (n && C.notice) { n.querySelector('[data-notice-text]').textContent = C.notice; n.hidden = false; }
    var photos = C.photos || {}, note = C.photoNote || '', shown = 0;
    doc.querySelectorAll('[data-photo]').forEach(function (slot) {
      var src = photos[slot.getAttribute('data-photo')]; if (!src) return;
      var cap = (slot.parentElement.querySelector('.sy-space__cap b') || {}).textContent || '';
      var img = doc.createElement('img'); img.src = src; img.alt = cap + (note ? ' (' + note + ')' : '');
      img.loading = 'lazy'; img.decoding = 'async';
      slot.innerHTML = ''; slot.appendChild(img); slot.classList.add('has-photo'); shown++;
      if (note) { var tag = doc.createElement('span'); tag.className = 'sy-photo-slot__tag'; tag.textContent = note; tag.setAttribute('aria-hidden', 'true'); slot.appendChild(tag); }
    });
    var sn = doc.querySelector('[data-space-note]');
    if (sn && shown) {
      /* sample photos keep an honest note; real photos need none */
      if (note) sn.querySelector('[data-space-note-text]').textContent = '사진은 분위기를 보여 드리기 위한 ' + note + '입니다. 실제 공간 사진은 개원과 함께 공개됩니다.';
      else sn.hidden = true;
    }
  }

  function init() {
    wireLinks(); wireModals(); wireHeader(); wireReveal(); wireCopy(); wireCheck(); wireMapTabs(); wireMapViewBox(); wireHero(); wireExtras();
    paintStatus(); setInterval(paintStatus, 60000);
  }
  window.Soyul = { config: C, status: status, mapUrl: mapUrl, toast: toast, init: init, paintStatus: paintStatus };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
