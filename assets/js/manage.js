/* 소율한의원 관리 도우미
   운영 정보(soyul-data.js)를 화면에서 고친 뒤 새 파일로 내려받습니다.
   서버가 없는 정적 홈페이지이므로, 내려받은 파일을 assets/js/soyul-data.js 자리에 바꿔 올리면 반영됩니다. */
(function () {
  'use strict';
  var R = window.SoyulRender;
  if (!window.SOYUL_DATA || !R) return;
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var ORIG = clone(window.SOYUL_DATA), D = clone(ORIG), dirty = false;
  var form = document.getElementById('mg-form'), nav = document.getElementById('mg-nav'), stateEl = document.getElementById('mg-state');
  var DAYS = R.DAYS, uid = 0;

  /* ---------- 작은 도구 ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, D); }
  function set(path, val) {
    var ks = path.split('.'), o = D;
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val; touch();
  }
  function touch() { dirty = true; paintState(); if (preview) preview(); }
  function field(label, control, hint) {
    var id = 'mg-f' + (++uid); control.id = id;
    return h('div', { class: 'mg-field' }, [h('label', { for: id, text: label }), control, hint ? h('p', { class: 'mg-hint', html: hint }) : null]);
  }
  function input(path, label, o) {
    o = o || {};
    var c = h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.type || 'text'), placeholder: o.ph || null, rows: o.area ? (o.rows || 3) : null, inputmode: o.mode || null });
    c.value = get(path) == null ? '' : get(path);
    c.addEventListener('input', function () { set(path, o.num ? +c.value : c.value.trim() === '' ? '' : c.value); check(c, o); });
    var f = field(label, c, o.hint); if (o.wide) f.className += ' is-wide';
    return f;
  }
  function check(c, o) {
    var v = c.value.trim(), bad = false;
    if (v && o.type === 'url') bad = !/^https?:\/\/\S+$/.test(v);
    c.classList.toggle('is-bad', bad); c.setAttribute('aria-invalid', bad ? 'true' : 'false');
  }
  function group(title, kids, desc) { return h('fieldset', { class: 'mg-group' }, [h('legend', { text: title }), desc ? h('p', { class: 'mg-hint', html: desc }) : null, h('div', { class: 'mg-grid' }, kids)]); }
  function dayChecks(path, label) {
    var cur = get(path) || [], box = h('div', { class: 'mg-days', role: 'group', 'aria-label': label });
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var id = 'mg-d' + (++uid), cb = h('input', { type: 'checkbox', id: id });
      cb.checked = cur.indexOf(d) > -1;
      cb.addEventListener('change', function () {
        var arr = (get(path) || []).filter(function (x) { return x !== d; }); if (cb.checked) arr.push(d);
        arr.sort(function (a, b) { return a - b; }); set(path, arr);
      });
      box.appendChild(h('span', { class: 'mg-day' }, [cb, h('label', { for: id, text: DAYS[d] })]));
    });
    return h('div', { class: 'mg-field is-wide' }, [h('span', { class: 'mg-label', text: label }), box]);
  }
  function dates(path, label, hint) {
    var c = h('textarea', { rows: 4, placeholder: '2027-01-01' });
    c.value = (get(path) || []).join('\n');
    var note = h('p', { class: 'mg-hint' });
    function parse() {
      var parts = c.value.split(/[\s,]+/).filter(Boolean), ok = [], bad = [];
      parts.forEach(function (p) { (/^\d{4}-\d{2}-\d{2}$/.test(p) && !isNaN(Date.parse(p)) ? ok : bad).push(p); });
      ok = ok.filter(function (x, i) { return ok.indexOf(x) === i; }).sort();
      note.textContent = ok.length + '일 등록' + (bad.length ? ' · 형식이 맞지 않아 빠진 값: ' + bad.join(', ') : '');
      note.classList.toggle('is-bad', !!bad.length);
      return ok;
    }
    c.addEventListener('input', function () { set(path, parse()); });
    var f = field(label, c, hint); f.className += ' is-wide'; f.appendChild(note); parse();
    return f;
  }
  /* 여러 줄 항목 편집기 */
  function list(path, o) {
    var wrap = h('div', { class: 'mg-list' });
    function draw() {
      wrap.innerHTML = '';
      var arr = get(path) || [];
      arr.forEach(function (item, i) {
        var card = h('div', { class: 'mg-item' });
        var head = h('div', { class: 'mg-item__head' }, [
          h('b', { text: (i + 1) + '. ' + (o.title(item) || o.blankTitle) }),
          h('span', { class: 'mg-item__tools' }, [
            h('button', { type: 'button', text: '위로', disabled: i === 0, 'aria-label': (i + 1) + '번 위로', onclick: function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); touch(); draw(); } }),
            h('button', { type: 'button', text: '아래로', disabled: i === arr.length - 1, 'aria-label': (i + 1) + '번 아래로', onclick: function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); touch(); draw(); } }),
            h('button', { type: 'button', text: '삭제', class: 'is-del', 'aria-label': (i + 1) + '번 삭제', onclick: function () { if (confirm('이 항목을 삭제할까요?')) { arr.splice(i, 1); touch(); draw(); } } })
          ])
        ]);
        var grid = h('div', { class: 'mg-grid' });
        o.fields.forEach(function (f) {
          var c;
          if (f.type === 'check') {
            var id = 'mg-c' + (++uid); c = h('input', { type: 'checkbox', id: id }); c.checked = !!item[f.key];
            c.addEventListener('change', function () { item[f.key] = c.checked; touch(); });
            grid.appendChild(h('div', { class: 'mg-field mg-check' }, [c, h('label', { for: id, text: f.label })]));
            return;
          }
          c = h(f.area ? 'textarea' : 'input', { type: f.area ? null : (f.type || 'text'), rows: f.area ? (f.rows || 3) : null, placeholder: f.ph || null, list: f.list || null });
          c.value = item[f.key] == null ? '' : item[f.key];
          c.addEventListener('input', function () { item[f.key] = c.value; touch(); check(c, f); if (f.inTitle) head.firstChild.textContent = (i + 1) + '. ' + (o.title(item) || o.blankTitle); });
          var fl = field(f.label, c, f.hint); if (f.wide) fl.className += ' is-wide';
          grid.appendChild(fl);
        });
        card.appendChild(head); card.appendChild(grid); wrap.appendChild(card);
      });
      if (!arr.length) wrap.appendChild(h('p', { class: 'mg-empty', text: o.empty || '아직 항목이 없습니다.' }));
      wrap.appendChild(h('button', { type: 'button', class: 'btn btn--line btn--sm', text: '+ ' + o.add, onclick: function () {
        if (!get(path)) set(path, []); get(path).push(clone(o.blank)); touch(); draw();
        var cards = wrap.querySelectorAll('.mg-item'), last = cards[cards.length - 1]; if (last) { var first = last.querySelector('input,textarea'); if (first) first.focus(); }
      } }));
    }
    draw();
    return wrap;
  }

  /* ---------- 미리보기 ---------- */
  var preview = null;
  function hoursPreview() {
    var box = h('div', { class: 'mg-preview', 'aria-live': 'polite' });
    preview = function () {
      var s; try { s = R.status(D); box.innerHTML = '<p class="mg-preview__now"><b>지금 홈페이지에 보일 상태</b> ' + R.esc(s.label) + (s.detail ? ' — ' + R.esc(s.detail) : '') + '</p>' + R.hoursTable(D) + R.weekChart(D, -1) + '<p class="mg-hint">' + R.esc(R.holidayNote(D)) + '</p>'; }
      catch (e) { box.innerHTML = '<p class="mg-hint is-bad">시간 형식을 확인해 주세요. (예: 09:30)</p>'; }
    };
    preview();
    return box;
  }

  /* ---------- 항목 구성 ---------- */
  var SECTIONS = [
    ['basic', '기본 정보', function () {
      return [group('연락처와 개원일', [
        input('clinic.phone', '전화번호', { ph: '010-0000-0000', mode: 'tel' }),
        input('clinic.openDate', '개원일', { type: 'date', hint: '날짜를 넣으면 그날부터 ‘진료 중/진료 종료’ 같은 실시간 상태가 표시됩니다. 비워 두면 아래 문구가 대신 보입니다.' }),
        input('clinic.openLabel', '개원 전 안내 문구', { ph: '2026년 12월 개원 예정' }),
        input('clinic.bizNo', '사업자등록번호', { ph: '000-00-00000', hint: '넣으면 바닥글에 표시됩니다.' })
      ]), group('주소', [
        input('place.address', '도로명 주소'), input('place.building', '건물 이름'), input('place.floor', '층·호수'), input('place.zip', '우편번호'),
        input('place.naverPlaceUrl', '네이버 플레이스 주소', { type: 'url', ph: 'https://naver.me/…', wide: true, hint: '넣으면 ‘네이버 지도’ 버튼이 한의원 페이지로 바로 연결됩니다.' })
      ], '위치가 바뀌면 지도 좌표(lat·lng)와 약도 그림도 함께 바꿔야 합니다. 이 경우에는 제작자에게 요청해 주세요.')];
    }],
    ['hours', '진료시간', function () {
      return [group('평일', [
        dayChecks('hours.weekday.days', '진료하는 요일'),
        input('hours.weekday.open', '시작', { type: 'time' }), input('hours.weekday.close', '종료', { type: 'time' }),
        lunch()
      ]), group('토·일·공휴일', [
        input('hours.weekend.open', '시작', { type: 'time' }), input('hours.weekend.close', '종료', { type: 'time' })
      ], '토요일·일요일과 아래 공휴일 목록의 날짜에 적용됩니다. 점심시간 없이 진료하는 것으로 표시됩니다.'), group('쉬는 날', [
        dayChecks('hours.closedWeekdays', '매주 쉬는 요일'),
        select('hours.holidayOnClosedWeekday', '공휴일이 쉬는 요일과 겹치면', [['closed', '쉽니다'], ['open', '토·일·공휴일 시간으로 진료합니다']]),
        dates('hours.closedDates', '임시 휴진일', '하루에 한 줄씩 적어 주세요. 예: 2027-02-07'),
        dates('hours.holidays', '공휴일 목록', '평일에 오는 공휴일(대체공휴일 포함)을 적어 두면 그날은 토·일·공휴일 시간으로 표시됩니다. 해마다 새로 채워 주세요.'),
        input('hours.note', '안내 문구', { wide: true })
      ]), hoursPreview()];
    }],
    ['notice', '공지 띠', function () {
      return [group('맨 위 공지', [
        input('notice.text', '공지 문구', { wide: true, ph: '예: 12월 25일(금)은 오전 9시 30분부터 오후 2시까지 진료합니다.' }),
        input('notice.link', '눌렀을 때 이동할 주소', { ph: 'guide.html#hours 또는 https://…', hint: '비워 두면 글자만 보입니다.' }),
        input('notice.until', '이 날짜까지만 보이기', { type: 'date' })
      ], '문구를 비워 두면 공지 띠가 보이지 않습니다.')];
    }],
    ['channels', '예약·연락 채널', function () {
      return [group('채널 주소', [
        input('channels.naverBooking', '네이버 예약', { type: 'url', ph: 'https://booking.naver.com/…', wide: true }),
        input('channels.kakao', '카카오톡 채널', { type: 'url', ph: 'https://pf.kakao.com/…', wide: true }),
        input('channels.blog', '네이버 블로그', { type: 'url', wide: true }),
        input('channels.instagram', '인스타그램', { type: 'url', wide: true })
      ], '주소가 비어 있는 채널은 홈페이지에서 ‘준비 중’으로 표시되고, 누르면 전화 문의를 안내합니다.')];
    }],
    ['faq', '자주 묻는 질문', function () {
      var dl = h('datalist', { id: 'mg-cats' }); R.faqCats(D).forEach(function (c) { dl.appendChild(h('option', { value: c })); });
      return [dl, list('faq', { add: '질문 추가', blank: { cat: '', featured: false, q: '', a: '' }, blankTitle: '(새 질문)', title: function (x) { return x.q; }, fields: [
        { key: 'q', label: '질문', wide: true, inTitle: true },
        { key: 'a', label: '답변', area: true, rows: 4, wide: true, hint: '링크를 넣으려면 <code>[보이는 글자](주소)</code> 형식으로 적습니다. 예: <code>[오시는 길 보기](location.html)</code>' },
        { key: 'cat', label: '분류', list: 'mg-cats', ph: '예: 진료시간' },
        { key: 'featured', label: '첫 화면에도 보이기', type: 'check' }
      ] })];
    }],
    ['fees', '비급여 진료비', function () {
      return [group('안내 문구', [input('fees.note', '표 아래 안내', { area: true, rows: 2, wide: true })]), list('fees.items', { add: '항목 추가', blank: { name: '', unit: '', price: '' }, blankTitle: '(새 항목)', title: function (x) { return x.name; }, fields: [
        { key: 'name', label: '항목', inTitle: true }, { key: 'unit', label: '구분', ph: '예: 1회' }, { key: 'price', label: '비용', ph: '예: 20,000원', hint: '비워 두면 ‘게시 예정’으로 보입니다.' }
      ] })];
    }],
    ['posts', '블로그 글', function () {
      return [h('p', { class: 'mg-hint', text: '블로그에 새 글을 올린 뒤 제목과 주소를 여기에 적어 두면 ‘소율 이야기’와 첫 화면, 진료 안내에 목록으로 보입니다. 위에 있는 글이 먼저 보입니다. 카테고리는 블로그와 같은 이름(예: 개원일기, 귀 질환 클리닉)으로 적어 주세요.' }),
        list('posts', { add: '글 추가', blank: { cat: '', title: '', date: '', url: '', excerpt: '' }, blankTitle: '(새 글)', title: function (x) { return x.title; }, empty: '등록한 글이 없으면 블로그 바로가기만 보입니다.', fields: [
          { key: 'title', label: '제목', wide: true, inTitle: true }, { key: 'cat', label: '카테고리', ph: '예: 개원일기' },
          { key: 'date', label: '날짜', type: 'date' }, { key: 'url', label: '글 주소', type: 'url', wide: true, ph: 'https://blog.naver.com/book7504/…', hint: '글을 연 뒤 주소창의 주소를 붙여 넣어 주세요. 블로그 첫 화면 주소를 넣으면 블로그로 연결됩니다.' },
          { key: 'excerpt', label: '한두 줄 소개', area: true, rows: 2, wide: true, hint: '비워 두면 제목만 보입니다.' }
        ] })];
    }],
    ['photos', '공간 사진', function () {
      return [h('p', { class: 'mg-hint', html: '실제 사진으로 바꿀 때는 사진 파일을 <code>assets/img</code> 폴더에 올리고, 아래 ‘파일 위치’를 그 파일 이름으로 바꾼 뒤 ‘예시 이미지’ 표시를 꺼 주세요. 가로 4 : 세로 3 비율의 사진이 가장 잘 어울립니다. 첫 번째 사진은 첫 화면 ‘문을 열기까지’에도 크게 쓰입니다.' }),
        list('photos', { add: '사진 추가', blank: { src: 'assets/img/', title: '', caption: '', alt: '', sample: false }, blankTitle: '(새 사진)', title: function (x) { return x.title; }, fields: [
          { key: 'title', label: '이름', ph: '예: 대기 공간', inTitle: true }, { key: 'src', label: '파일 위치', ph: 'assets/img/파일이름.jpg' },
          { key: 'caption', label: '한 줄 설명' }, { key: 'alt', label: '사진 설명(화면을 읽어 주는 프로그램용)' }, { key: 'sample', label: '예시 이미지 표시', type: 'check' }
        ] })];
    }],
    ['equipment', '장비 안내', function () {
      return [list('equipment', { add: '장비 추가', blank: { name: '', desc: '' }, blankTitle: '(새 장비)', title: function (x) { return x.name; }, empty: '등록한 장비가 없으면 ‘개원에 맞춰 소개하겠습니다’ 문구가 보입니다.', fields: [
        { key: 'name', label: '이름', inTitle: true }, { key: 'desc', label: '설명', area: true, rows: 2, wide: true, hint: '효능을 단정하는 표현은 의료광고 기준에 맞지 않을 수 있습니다. 용도를 사실대로 적어 주세요.' }
      ] })];
    }],
    ['hero', '첫 화면 영상', function () {
      return [group('영상 (선택)', [
        input('hero.video', '영상 파일 위치', { ph: 'assets/video/soyul.mp4', hint: '소리 없이 자동으로 반복 재생됩니다. 10~20초, 10MB 이하의 mp4를 권합니다.' }),
        input('hero.poster', '영상이 뜨기 전 보일 사진', { ph: 'assets/img/poster.jpg' })
      ], '비워 두면 첫 화면에 사진이 보입니다.')];
    }]
  ];
  function lunch() {
    var has = !!(get('hours.weekday.lunch') || []).length;
    var id = 'mg-l' + (++uid), cb = h('input', { type: 'checkbox', id: id }); cb.checked = has;
    var a = h('input', { type: 'time' }), b = h('input', { type: 'time' });
    var cur = get('hours.weekday.lunch') || ['14:00', '15:00']; a.value = cur[0]; b.value = cur[1];
    function sync() { a.disabled = b.disabled = !cb.checked; set('hours.weekday.lunch', cb.checked ? [a.value, b.value] : null); }
    [cb, a, b].forEach(function (x) { x.addEventListener('input', sync); });
    a.disabled = b.disabled = !has;
    a.setAttribute('aria-label', '점심 시작'); b.setAttribute('aria-label', '점심 끝');
    return h('div', { class: 'mg-field is-wide' }, [h('span', { class: 'mg-check' }, [cb, h('label', { for: id, text: '평일 점심시간 있음' })]), h('div', { class: 'mg-range' }, [a, h('span', { text: '부터' }), b, h('span', { text: '까지' })])]);
  }
  function select(path, label, opts) {
    var c = h('select', {}); opts.forEach(function (o) { c.appendChild(h('option', { value: o[0], text: o[1] })); });
    c.value = get(path) || opts[0][0]; c.addEventListener('change', function () { set(path, c.value); });
    var f = field(label, c); f.className += ' is-wide'; return f;
  }

  function draw() {
    form.innerHTML = ''; nav.innerHTML = ''; preview = null; uid = 0;
    SECTIONS.forEach(function (s) {
      var sec = h('section', { class: 'mg-sec', id: 'mg-' + s[0], 'aria-labelledby': 'mg-t-' + s[0] }, [h('h2', { id: 'mg-t-' + s[0], text: s[1] })]);
      s[2]().forEach(function (k) { sec.appendChild(k); });
      form.appendChild(sec);
      nav.appendChild(h('li', {}, [h('a', { href: '#mg-' + s[0], text: s[1] })]));
    });
    nav.appendChild(h('li', {}, [h('a', { href: '#mg-upload', text: '올리는 방법' })]));
    paintState();
  }
  function paintState() { stateEl.textContent = dirty ? '고친 내용이 있습니다. ‘새 파일 내려받기’를 눌러 파일로 저장하세요.' : '고친 내용이 없습니다.'; stateEl.classList.toggle('is-dirty', dirty); }

  /* ---------- 파일로 저장 / 불러오기 ---------- */
  var HEADER = '/* ============================================================\n   소율한의원 홈페이지 — 운영 정보 파일 (soyul-data.js)\n   ------------------------------------------------------------\n   진료시간·휴진일·공지·예약 주소·자주 묻는 질문·비급여 진료비처럼\n   자주 바뀌는 내용은 모두 이 파일 한 곳에 있습니다.\n   이 파일만 바꿔 올리면 모든 페이지에 한꺼번에 반영됩니다.\n\n   직접 고치기 어렵다면 홈페이지 주소 뒤에 /manage.html 을 붙여\n   \'관리 도우미\'를 열고, 화면에서 고친 뒤 새 파일을 내려받아\n   이 파일(assets/js/soyul-data.js)과 바꿔 주세요.\n\n   마지막으로 고친 때: {when}\n   ============================================================ */\n';
  function tidy(d) {
    d = clone(d);
    ['faq', 'posts', 'photos', 'equipment'].forEach(function (k) { d[k] = (d[k] || []).filter(function (x) { return x && Object.keys(x).some(function (f) { return typeof x[f] === 'string' && x[f].trim() && x[f] !== 'assets/img/'; }); }); });
    if (d.fees) d.fees.items = (d.fees.items || []).filter(function (x) { return x && x.name && x.name.trim(); });
    if (d.hours && d.hours.weekday && !d.hours.weekday.lunch) delete d.hours.weekday.lunch;
    return d;
  }
  function problems(d) {
    var out = [], t = /^\d{2}:\d{2}$/, hh = d.hours;
    [['평일 시작', hh.weekday.open], ['평일 종료', hh.weekday.close], ['토·일·공휴일 시작', hh.weekend.open], ['토·일·공휴일 종료', hh.weekend.close]].forEach(function (p) { if (!t.test(p[1] || '')) out.push(p[0] + ' 시간을 확인해 주세요.'); });
    if (t.test(hh.weekday.open) && t.test(hh.weekday.close) && hh.weekday.open >= hh.weekday.close) out.push('평일 종료 시간이 시작 시간보다 빠릅니다.');
    if (t.test(hh.weekend.open) && t.test(hh.weekend.close) && hh.weekend.open >= hh.weekend.close) out.push('토·일·공휴일 종료 시간이 시작 시간보다 빠릅니다.');
    if (hh.weekday.lunch && !(hh.weekday.lunch[0] < hh.weekday.lunch[1])) out.push('점심시간을 확인해 주세요.');
    if (!(hh.weekday.days || []).length) out.push('평일 진료 요일을 하나 이상 골라 주세요.');
    if (!String(d.clinic.phone || '').replace(/\D/g, '')) out.push('전화번호를 적어 주세요.');
    ['naverBooking', 'kakao', 'blog', 'instagram'].forEach(function (k) { var v = (d.channels || {})[k]; if (v && !/^https?:\/\//.test(v)) out.push('채널 주소는 https:// 로 시작해야 합니다: ' + v); });
    (d.faq || []).forEach(function (f, i) { if (!f.q || !f.a) out.push('자주 묻는 질문 ' + (i + 1) + '번에 질문이나 답변이 비어 있습니다.'); });
    return out;
  }
  document.getElementById('mg-save').addEventListener('click', function () {
    var d = tidy(D), bad = problems(d);
    if (bad.length && !confirm('확인이 필요한 내용이 있습니다.\n\n· ' + bad.join('\n· ') + '\n\n그래도 파일을 내려받을까요?')) return;
    var now = new Date(), when = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2) + ' ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    var text = HEADER.replace('{when}', when) + 'window.SOYUL_DATA = ' + JSON.stringify(d, null, 2) + ';\n';
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/javascript;charset=utf-8' })), download: 'soyul-data.js' });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    dirty = false; stateEl.textContent = 'soyul-data.js 파일을 내려받았습니다. 아래 ‘홈페이지에 올리는 방법’대로 바꿔 올려 주세요.'; stateEl.classList.remove('is-dirty');
  });
  document.getElementById('mg-load').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var s = String(fr.result), i = s.indexOf('{', s.indexOf('SOYUL_DATA')), j = s.lastIndexOf('}');
        var d = JSON.parse(s.slice(i, j + 1));
        if (!d.clinic || !d.hours) throw new Error('형식');
        D = d; dirty = true; draw(); stateEl.textContent = file.name + ' 파일을 불러왔습니다.';
      } catch (err) { alert('파일을 읽을 수 없습니다. soyul-data.js 파일이 맞는지 확인해 주세요.'); }
      e.target.value = '';
    };
    fr.readAsText(file, 'utf-8');
  });
  document.getElementById('mg-reset').addEventListener('click', function () {
    if (dirty && !confirm('고친 내용을 모두 버리고 처음 상태로 되돌릴까요?')) return;
    D = clone(ORIG); dirty = false; draw();
  });
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  draw();
})();
