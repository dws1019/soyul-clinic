/* 소율한의원 — 화면 동작
   운영 정보(soyul-data.js)를 읽어 진료 상태·진료시간·연락 채널·자주 묻는 질문 등을 채우고,
   메뉴·예약 창·지도 앱 연결 같은 동작을 맡습니다. */
(function () {
  'use strict';
  var D = window.SOYUL_DATA, R = window.SoyulRender;
  if (!D || !R) return;
  var doc = document, body = doc.body, root = body.getAttribute('data-root') || '';
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var L = R.links(D), F = R.hoursFacts(D);

  /* ---------- 알림 한 줄 ---------- */
  var toastEl = $('.toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3600);
  }

  /* ---------- 글자·주소 채우기 ---------- */
  function fill(name, text) { $$('[data-soyul="' + name + '"]').forEach(function (el) { el.textContent = text; }); }
  fill('phone', D.clinic.phone);
  fill('address', D.place.address);
  fill('building', D.place.building + ' ' + D.place.floor);
  fill('full-address', L.fullAddress);
  $$('[data-soyul="tel"]').forEach(function (a) { a.setAttribute('href', L.tel); });
  [['map-google', L.google], ['map-naver', L.naver], ['map-kakao', L.kakao]].forEach(function (p) {
    $$('[data-soyul="' + p[0] + '"]').forEach(function (a) { a.setAttribute('href', p[1]); });
  });
  $$('[data-soyul="bizno"]').forEach(function (el) {
    if (D.clinic.bizNo) { el.hidden = false; el.textContent = '사업자등록번호 ' + D.clinic.bizNo; } else el.hidden = true;
  });

  /* ---------- 연락 채널: 주소가 비어 있으면 '준비 중' ---------- */
  var CH = { kakao: '카카오톡 채널', naverBooking: '네이버 예약', blog: '블로그', instagram: '인스타그램' };
  $$('[data-channel]').forEach(function (a) {
    var key = a.getAttribute('data-channel'), url = (D.channels || {})[key];
    if (url) {
      a.setAttribute('href', url); a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
      a.classList.remove('is-pending'); a.removeAttribute('aria-disabled');
    } else {
      a.setAttribute('href', '#'); a.classList.add('is-pending'); a.setAttribute('aria-disabled', 'true');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        toast(CH[key] + '은 개원에 맞춰 열립니다. 지금은 전화로 문의해 주세요.');
      });
    }
  });

  /* ---------- 진료 상태 (한국 시간) ---------- */
  function paintStatus() {
    var s = R.status(D);
    $$('[data-soyul="status"]').forEach(function (el) {
      el.setAttribute('data-state', s.state);
      var label = $('.status__label', el);
      if (label) label.textContent = s.short;
      var more = $('.status__more', el);
      if (el.classList.contains('status--lg')) {
        if (!more) { more = doc.createElement('span'); more.className = 'status__more'; el.appendChild(more); }
        more.textContent = s.state === 'preopen' ? '' : (s.today ? '오늘 ' + s.today : (s.detail || ''));
        more.hidden = !more.textContent;
      }
      el.setAttribute('title', s.label + (s.detail ? ' — ' + s.detail : ''));
    });
    $$('[data-soyul="status-line"]').forEach(function (el) { el.textContent = s.state === 'preopen' ? s.label : s.label + (s.detail ? ' · ' + s.detail : ''); });
    $$('[data-soyul="status-detail"]').forEach(function (el) {
      if (s.state === 'preopen') return;
      el.innerHTML = '<b>' + R.esc(s.label) + '</b><br>' + R.esc(s.detail || '');
    });
    $$('[data-soyul="status-big"]').forEach(function (el) {
      el.setAttribute('data-state', s.state);
      el.innerHTML = '<span class="status__dot" aria-hidden="true"></span><span><b>' + R.esc(s.label) + '</b>' + (s.detail ? '<small>' + R.esc(s.detail) + '</small>' : '') + '</span>';
    });
  }
  paintStatus();
  setInterval(paintStatus, 60000);
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) paintStatus(); });

  /* ---------- 진료시간·질문·비용·사진 등 다시 그리기 ---------- */
  var today = R.kst().dow;
  function each(name, fn) { $$('[data-soyul="' + name + '"]').forEach(fn); }
  each('hours-table', function (el) { el.innerHTML = R.hoursTable(D); });
  each('week', function (el) { el.innerHTML = R.weekChart(D, R.isOpened(D, R.kst()) ? today : -1); });
  each('hours-line', function (el) { el.innerHTML = '<span>평일 ' + F.weekday + '</span><span>토·일·공휴일 ' + F.weekend + '</span>' + (F.closed ? '<span>' + F.closed + ' 휴진</span>' : ''); });
  each('hours-menu', function (el) { el.innerHTML = '평일(' + F.weekdayDays + ') ' + F.weekday + '<br>토·일·공휴일 ' + F.weekend + (F.closed ? '<br>' + F.closed + ' 휴진' : ''); });
  each('hours-main', function (el) { el.textContent = '평일 ' + F.weekday; });
  each('hours-sub', function (el) { el.innerHTML = '토·일·공휴일 <span class="nowrap">' + F.weekend + '</span>' + (F.lunch ? '<br>평일 점심 <span class="nowrap">' + F.lunch + '</span>' : '') + (F.closed ? '<br>' + F.closed + ' 휴진' : ''); });
  each('hours-foot', function (el) {
    el.innerHTML = '<dl class="foot-hours"><div><dt>평일 <small>' + F.weekdayDays + '</small></dt><dd>' + F.weekday + '</dd></div>' +
      (F.lunch ? '<div><dt>평일 점심</dt><dd>' + F.lunch + '</dd></div>' : '') +
      '<div><dt>토·일·공휴일</dt><dd>' + F.weekend + '</dd></div>' + (F.closed ? '<div><dt>' + F.closed + '</dt><dd>휴진</dd></div>' : '') + '</dl>';
  });
  each('holiday-note', function (el) { el.textContent = R.holidayNote(D); });
  each('hours-note', function (el) { el.textContent = D.hours.note || ''; el.hidden = !D.hours.note; });
  each('faq', function (el) {
    el.innerHTML = R.faqList(D, { featured: el.hasAttribute('data-featured'), limit: +el.getAttribute('data-limit') || 0, base: root });
  });
  each('fees', function (el) { el.innerHTML = R.feeTable(D); });
  each('fees-note', function (el) { el.textContent = (D.fees || {}).note || ''; });
  each('photos', function (el) { el.innerHTML = R.photoGrid(D, { base: root, limit: +el.getAttribute('data-limit') || 0, cls: el.getAttribute('data-cls') || '' }); });
  each('sample-note', function (el) { el.hidden = !R.hasSample(D); });
  each('posts', function (el) {
    var html = R.postList(D, { limit: +el.getAttribute('data-limit') || 0, cat: el.getAttribute('data-cat') || '', brief: el.hasAttribute('data-brief'), cls: el.getAttribute('data-cls') || '' });
    el.innerHTML = html;
    var wrap = el.closest('[data-posts-wrap]'); if (wrap) wrap.setAttribute('data-empty', html ? '0' : '1');
  });
  each('equipment', function (el) {
    var html = R.equipmentList(D); el.innerHTML = html;
    var wrap = el.closest('[data-equip-wrap]'); if (wrap) wrap.setAttribute('data-empty', html ? '0' : '1');
  });
  var ld = doc.getElementById('ld-clinic');
  if (ld) { try { var site = ld.textContent.match(/"url":"([^"]+)"/); ld.textContent = R.jsonLd(D, site ? site[1] : location.origin + '/'); } catch (e) {} }

  /* ---------- 공지 띠 ---------- */
  (function () {
    var n = D.notice || {}, el = $('[data-soyul="notice"]');
    if (!el || !n.text) return;
    if (n.until && R.kst().str > n.until) return;
    var key = 'soyul-notice:' + n.text;
    try { if (sessionStorage.getItem(key)) return; } catch (e) {}
    var href = n.link ? (/^https?:/.test(n.link) ? n.link : root + n.link) : '';
    el.innerHTML = '<div class="wrap notice__in"><p>' + (href ? '<a href="' + R.esc(href) + '">' + R.esc(n.text) + '</a>' : R.esc(n.text)) + '</p><button type="button" aria-label="공지 닫기">' + R.icon('i-x') + '</button></div>';
    el.hidden = false;
    $('button', el).addEventListener('click', function () { el.hidden = true; try { sessionStorage.setItem(key, '1'); } catch (e) {} });
  })();

  /* ---------- 첫 화면 영상 (soyul-data.js의 hero.video를 채우면 사진 대신 재생) ---------- */
  (function () {
    var box = $('[data-soyul="hero-media"]'), h = D.hero || {};
    if (!box || !h.video) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var src = /^https?:/.test(h.video) ? h.video : root + h.video;
    var v = doc.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'metadata';
    if (h.poster) v.poster = /^https?:/.test(h.poster) ? h.poster : root + h.poster;
    v.src = src; v.setAttribute('aria-label', '소율한의원 공간 영상(소리 없음)');
    var btn = doc.createElement('button');
    btn.type = 'button'; btn.className = 'hero__pause';
    function sync() { btn.innerHTML = R.icon(v.paused ? 'i-play' : 'i-pause') + '<span class="sr">' + (v.paused ? '영상 재생' : '영상 멈춤') + '</span>'; }
    btn.addEventListener('click', function () { if (v.paused) v.play(); else v.pause(); });
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    v.addEventListener('loadeddata', function () { var img = $('img', box), tag = $('.photo__tag', box); if (img) img.remove(); if (tag) tag.remove(); });
    box.appendChild(v); box.appendChild(btn); sync();
    if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  })();

  /* ---------- 창 열고 닫기 ---------- */
  var lastFocus = null;
  function openDlg(id) {
    var d = doc.getElementById(id); if (!d || d.open) return;
    lastFocus = doc.activeElement;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    body.classList.add('is-locked');
  }
  function closeDlg(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  doc.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) { e.preventDefault(); openDlg(opener.getAttribute('data-open')); return; }
    var closer = e.target.closest('[data-close]');
    if (closer) { var d = closer.closest('dialog'); if (d) closeDlg(d); return; }
    if (e.target.tagName === 'DIALOG') closeDlg(e.target);            /* 바깥을 누르면 닫힘 */
    var inDlgLink = e.target.closest('dialog a[href]');
    if (inDlgLink && !inDlgLink.classList.contains('is-pending')) { var dl = inDlgLink.closest('dialog'); if (dl) closeDlg(dl); }
  });
  $$('dialog').forEach(function (d) {
    d.addEventListener('close', function () { body.classList.remove('is-locked'); if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  });

  /* ---------- 머리글 · 맨 위로 ---------- */
  var headEl = $('.site-head'), topBtn = $('[data-top]');
  function onScroll() {
    var y = window.pageYOffset || 0;
    if (headEl) headEl.classList.toggle('is-stuck', y > 8);
    if (topBtn) topBtn.classList.toggle('is-on', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- 주소 복사 ---------- */
  doc.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy-address]'); if (!b) return;
    var text = L.fullAddress;
    function done() { toast('주소를 복사했습니다. ' + text); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      body.appendChild(ta); ta.select();
      try { doc.execCommand('copy'); done(); } catch (err) { toast(text); }
      body.removeChild(ta);
    }
  });

  /* ---------- 티맵: 휴대폰에서는 앱으로, 컴퓨터에서는 안내 창 ---------- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-tmap]'); if (!a) return;
    e.preventDefault();
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) { location.href = L.tmapIntent; return; }
    if (/iPhone|iPad|iPod/i.test(ua)) {
      var t = Date.now();
      location.href = L.tmapScheme;
      setTimeout(function () { if (!doc.hidden && Date.now() - t < 2600) location.href = L.tmapStore; }, 1800);
      return;
    }
    openDlg('dlg-tmap');
  });

  /* ---------- 약도 / 실제 지도 ---------- */
  $$('[data-maptabs]').forEach(function (box) {
    var tabs = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
    function select(i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      var frame = $('[data-map-frame]', panels[i]);
      if (frame && !frame.firstChild) {
        var f = doc.createElement('iframe');
        f.src = L.googleEmbed; f.title = '소율한의원 위치 지도'; f.loading = 'lazy'; f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade'); f.setAttribute('allowfullscreen', '');
        frame.appendChild(f);
      }
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select((i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length, true); }
      });
    });
  });

  /* ---------- 자주 묻는 질문: 분류와 검색 ---------- */
  (function () {
    var tools = $('[data-faq-tools]'); if (!tools) return;
    var list = $('[data-soyul="faq"]'), input = $('input', tools), chips = $('[data-faq-cats]', tools), count = $('[data-faq-count]');
    var cats = R.faqCats(D), cur = '';
    chips.innerHTML = ['전체'].concat(cats).map(function (c, i) {
      return '<button type="button" class="chip" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" data-cat="' + (i === 0 ? '' : R.esc(c)) + '">' + R.esc(c) + '</button>';
    }).join('');
    function apply() {
      var q = (input.value || '').trim().toLowerCase(), n = 0;
      $$('.faq__item', list).forEach(function (it) {
        var ok = (!cur || it.getAttribute('data-cat') === cur) && (!q || it.textContent.toLowerCase().indexOf(q) > -1);
        it.hidden = !ok; if (ok) n++;
      });
      if (count) count.textContent = n ? '질문 ' + n + '개' : '맞는 질문이 없습니다. 다른 낱말로 찾아보거나 전화로 물어봐 주세요.';
    }
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      cur = b.getAttribute('data-cat');
      $$('.chip', chips).forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      apply();
    });
    input.addEventListener('input', apply);
    apply();
    /* 주소에 #질문 번호가 있으면 그 질문을 펼친다 */
    if (location.hash) { var t = doc.getElementById(location.hash.slice(1)); if (t && t.tagName === 'DETAILS') t.open = true; }
  })();

  /* ---------- 블로그 글: 카테고리 고르기 ---------- */
  (function () {
    var chips = $('[data-post-cats]'); if (!chips) return;
    var list = chips.parentNode.querySelector('[data-soyul="posts"]'), cats = R.postCats(D);
    if (!list || cats.length < 2) { chips.hidden = true; return; }
    chips.innerHTML = ['전체'].concat(cats).map(function (c, i) {
      var n = i === 0 ? $$('li', list).length : $$('li', list).filter(function (li) { return li.getAttribute('data-cat') === c; }).length;
      return '<button type="button" class="chip" aria-pressed="' + (i === 0 ? 'true' : 'false') + '" data-cat="' + (i === 0 ? '' : R.esc(c)) + '">' + R.esc(c) + ' <span class="chip__n">' + n + '</span></button>';
    }).join('');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      var cur = b.getAttribute('data-cat');
      $$('.chip', chips).forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      $$('li', list).forEach(function (li) { li.hidden = !!cur && li.getAttribute('data-cat') !== cur; });
    });
  })();

  /* ---------- 귀 건강 자가 체크 ---------- */
  (function () {
    var box = $('[data-check]'); if (!box) return;
    var items = $$('input[type="checkbox"]', box), out = $('[data-check-result]', box), num = $('[data-check-count]', box), reset = $('[data-check-reset]', box);
    var urgentIdx = items.length - 1;
    function paint() {
      var n = items.filter(function (i) { return i.checked; }).length, urgent = items[urgentIdx].checked;
      num.textContent = n;
      var cls = 'is-0', title, text;
      if (urgent) { cls = 'is-urgent'; title = '먼저 이비인후과 검사를 받아 보세요'; text = '갑자기 한쪽 귀가 잘 들리지 않는 증상은 돌발성 난청일 수 있어 빠른 검사가 중요합니다. 가능한 한 빨리 이비인후과에서 청력 검사를 받으시고, 한방 치료는 그와 함께 상의해 주세요.'; }
      else if (n === 0) { title = '해당하는 항목을 눌러 보세요'; text = '고르는 대로 안내가 바로 바뀝니다.'; }
      else if (n <= 2) { cls = 'is-1'; title = '가볍게 살펴볼 때입니다'; text = '증상이 가끔 나타나는 정도라면 수면과 피로, 소음 환경을 먼저 돌아봐 주세요. 증상이 이어지거나 잦아진다면 상담을 받아 보시길 권합니다.'; }
      else if (n <= 5) { cls = 'is-2'; title = '상담을 받아 보시길 권합니다'; text = '여러 증상이 함께 나타나고 있습니다. 언제부터, 어떤 때 심해지는지 메모해 오시면 진료에 도움이 됩니다.'; }
      else { cls = 'is-3'; title = '가까운 시일 안에 진료를 권합니다'; text = '일상에 불편이 클 수 있는 상태입니다. 혼자 참지 마시고, 편한 시간에 내원해 자세히 살펴보세요.'; }
      out.className = 'check__result ' + cls;
      out.innerHTML = '<h3>' + title + '</h3><p>' + text + '</p>';
    }
    items.forEach(function (i) { i.addEventListener('change', paint); });
    if (reset) reset.addEventListener('click', function () { items.forEach(function (i) { i.checked = false; }); paint(); items[0].focus(); });
    paint();
  })();

  /* ---------- 하위 메뉴: 지금 보고 있는 구역 표시 ---------- */
  (function () {
    var nav = $('.subnav[data-spy]'); if (!nav) return;
    var pairs = $$('a[href*="#"]', nav).map(function (a) { return [a, doc.getElementById(a.getAttribute('href').split('#')[1])]; }).filter(function (p) { return p[1]; });
    if (!pairs.length) return;
    var ticking = false;
    function mark() {
      ticking = false;
      var line = (headEl ? headEl.offsetHeight : 0) + nav.offsetHeight + 48, cur = null;
      pairs.forEach(function (p) { if (p[1].getBoundingClientRect().top <= line) cur = p[0]; });
      pairs.forEach(function (p) { p[0].classList.toggle('is-on', p[0] === cur); });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
    mark();
  })();
})();
