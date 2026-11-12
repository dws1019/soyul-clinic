/* 소율한의원 — 운영 정보(soyul-data.js)를 화면 조각으로 바꾸는 함수 모음.
   같은 함수를 빌드(미리 그려 넣기)와 브라우저(다시 그리기)에서 함께 씁니다. */
(function (root) {
  'use strict';
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* 줄바꿈과 [글자](주소) 링크만 허용하는 안전한 글 변환 */
  function rich(s, base) {
    var out = esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
      if (!/^(https?:|tel:|mailto:|#|[\w./-]+(#[\w-]+)?$)/.test(url)) return text;
      var ext = /^https?:/.test(url);
      var href = ext || /^(tel:|mailto:|#)/.test(url) ? url : (base || '') + url;
      return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
    });
    return out.replace(/\n/g, '<br>');
  }
  function icon(id, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>';
  }
  function t(hm) { return hm; }
  function range(a, b) { return t(a) + '<span class="dash" aria-hidden="true">–</span><span class="sr">부터 </span>' + t(b); }
  function mins(hm) { var p = String(hm).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function dayList(arr) { return arr.map(function (d) { return DAYS[d]; }).join('·'); }
  /* 평일 요일별 시간(byDay로 요일마다 다르게 지정 가능) */
  function wd(h, d) {
    var o = (h.weekday.byDay || {})[d] || {};
    return { open: o.open || h.weekday.open, close: o.close || h.weekday.close, lunch: o.lunch !== undefined ? o.lunch : (h.weekday.lunch || null) };
  }
  function wdGroups(h) {
    var g = [], idx = {};
    (h.weekday.days || []).slice().sort(function (a, b) { return (a || 7) - (b || 7); }).forEach(function (d) {
      var x = wd(h, d), k = x.open + '|' + x.close + '|' + (x.lunch ? x.lunch.join('-') : '');
      if (idx[k] === undefined) { idx[k] = g.length; g.push({ days: [], open: x.open, close: x.close, lunch: x.lunch }); }
      g[idx[k]].days.push(d);
    });
    return g;
  }
  function clock(hm) { /* '19:30' → '저녁 7시 30분' */
    var m = mins(hm), h = Math.floor(m / 60), mm = m % 60;
    var part = h < 12 ? '오전' : h < 18 ? '오후' : '저녁';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return part + ' ' + h12 + '시' + (mm ? ' ' + mm + '분' : '');
  }

  /* ---------- 한국 시간 기준 오늘/지금 ---------- */
  /* 시각을 9시간 밀어 UTC 읽기 함수로 읽으면 보는 사람의 시간대와 상관없이 한국 시간이 된다 */
  function pack(k, minutes) {
    var y = k.getUTCFullYear(), m = k.getUTCMonth() + 1, dd = k.getUTCDate();
    return { y: y, m: m, d: dd, dow: k.getUTCDay(), minutes: minutes,
      str: y + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd, date: k };
  }
  function kst(date) {
    var k = new Date((date || new Date()).getTime() + 9 * 3600000);
    return pack(k, k.getUTCHours() * 60 + k.getUTCMinutes());
  }
  function addDays(k, n) { return pack(new Date(k.date.getTime() + n * 86400000), 0); }
  function isOpened(data, k) {
    var od = data.clinic.openDate;
    return !!od && k.str >= od;
  }
  /* 그날의 진료 계획 */
  function plan(data, k) {
    var h = data.hours, holiday = (h.holidays || []).indexOf(k.str) > -1;
    if ((h.closedDates || []).indexOf(k.str) > -1) return { type: 'closed', why: '휴진' };
    if ((h.closedWeekdays || []).indexOf(k.dow) > -1 && !(holiday && h.holidayOnClosedWeekday === 'open'))
      return { type: 'closed', why: DAYS[k.dow] + '요일 정기 휴진' };
    if (holiday || k.dow === 0 || k.dow === 6)
      return { type: 'weekend', open: h.weekend.open, close: h.weekend.close, lunch: h.weekend.lunch || null,
        name: holiday ? '공휴일' : DAYS[k.dow] + '요일' };
    if ((h.weekday.days || []).indexOf(k.dow) > -1)
      return { type: 'weekday', open: wd(h, k.dow).open, close: wd(h, k.dow).close, lunch: wd(h, k.dow).lunch || null, name: DAYS[k.dow] + '요일' };
    return { type: 'closed', why: '휴진' };
  }
  function nextOpen(data, k) {
    for (var i = 1; i <= 14; i++) {
      var n = addDays(k, i), p = plan(data, n);
      if (p.type !== 'closed') return { when: (i === 1 ? '내일' : i === 2 ? '모레' : n.m + '월 ' + n.d + '일') + '(' + DAYS[n.dow] + ')', open: p.open };
    }
    return null;
  }
  /* 지금 상태: preopen | open | closing | lunch | before | after | closed */
  function status(data, date) {
    var k = kst(date), c = data.clinic;
    if (!isOpened(data, k)) {
      var label = c.openLabel || '개원 준비 중';
      if (c.openDate) { var od = c.openDate.split('-'); label = (+od[0]) + '년 ' + (+od[1]) + '월 ' + (+od[2]) + '일 개원'; }
      return { state: 'preopen', label: label, detail: '개원 후 진료시간을 미리 확인해 보세요.', short: label };
    }
    var p = plan(data, k), nx;
    if (p.type === 'closed') {
      nx = nextOpen(data, k);
      return { state: 'closed', label: '오늘은 휴진입니다', short: '오늘 휴진', detail: (p.why ? p.why + '. ' : '') + (nx ? nx.when + ' ' + nx.open + '부터 진료합니다.' : '') };
    }
    var now = k.minutes, o = mins(p.open), cl = mins(p.close);
    var today = p.open + ' – ' + p.close;
    if (now < o) return { state: 'before', label: '진료 전', short: '진료 전', detail: '오늘 ' + p.open + '부터 진료합니다.', today: today, plan: p };
    if (now >= cl) {
      nx = nextOpen(data, k);
      return { state: 'after', label: '오늘 진료가 끝났습니다', short: '진료 종료', detail: nx ? nx.when + ' ' + nx.open + '부터 진료합니다.' : '', today: today, plan: p };
    }
    if (p.lunch && now >= mins(p.lunch[0]) && now < mins(p.lunch[1]))
      return { state: 'lunch', label: '점심시간', short: '점심시간', detail: p.lunch[1] + '부터 다시 진료합니다.', today: today, plan: p };
    if (cl - now <= 30) return { state: 'closing', label: '곧 진료가 끝납니다', short: '진료 중', detail: '오늘은 ' + p.close + '까지 진료합니다.', today: today, plan: p };
    return { state: 'open', label: '진료 중', short: '진료 중', detail: '오늘은 ' + p.close + '까지 진료합니다.' + (p.lunch && now < mins(p.lunch[0]) ? ' 점심시간 ' + p.lunch[0] + ' – ' + p.lunch[1] : ''), today: today, plan: p };
  }

  /* ---------- 진료시간 ---------- */
  function hoursFacts(data) {
    var h = data.hours, g = wdGroups(h), lastClose = g.reduce(function (m, x) { return mins(x.close) > mins(m) ? x.close : m; }, g[0].close);
    var lunchG = g.filter(function (x) { return x.lunch; })[0];
    return {
      groups: g.map(function (x) { return { days: dayList(x.days), time: x.open + ' – ' + x.close, lunch: x.lunch ? x.lunch[0] + ' – ' + x.lunch[1] : '' }; }),
      weekdayDays: dayList(h.weekday.days), weekday: g.map(function (x) { return dayList(x.days) + ' ' + x.open + ' – ' + x.close; }).join(', '),
      lunch: lunchG ? lunchG.lunch[0] + ' – ' + lunchG.lunch[1] : '',
      weekend: h.weekend.open + ' – ' + h.weekend.close,
      closed: (h.closedWeekdays || []).map(function (d) { return DAYS[d] + '요일'; }).join('·'),
      closeClock: clock(lastClose), lateDays: dayList(g.filter(function (x) { return x.close === lastClose; }).reduce(function (a, x) { return a.concat(x.days); }, [])), weekendClose: clock(h.weekend.close), weekendOpen: clock(h.weekend.open)
    };
  }
  /* 화면 곳곳의 진료시간 조각 (빌드·브라우저 공통) */
  function hoursLine(data) { var f = hoursFacts(data); return f.groups.map(function (g) { return '<span>' + esc(g.days) + ' ' + g.time + '</span>'; }).join('') + '<span>토·일·공휴일 ' + f.weekend + '</span>' + (f.closed ? '<span>' + esc(f.closed) + ' 휴진</span>' : ''); }
  function hoursMenu(data) { var f = hoursFacts(data); return f.groups.map(function (g) { return esc(g.days) + ' ' + g.time; }).join('<br>') + '<br>토·일·공휴일 ' + f.weekend + (f.closed ? '<br>' + esc(f.closed) + ' 휴진' : ''); }
  function hoursMain(data) { var f = hoursFacts(data); return f.groups.map(function (g) { return esc(g.days) + ' ' + g.time; }).join('<br>'); }
  function hoursSub(data) { var f = hoursFacts(data); return '토·일·공휴일 <span class="nowrap">' + f.weekend + '</span>' + (f.lunch ? '<br>평일 점심 <span class="nowrap">' + f.lunch + '</span>' : '') + (f.closed ? '<br>' + esc(f.closed) + ' 휴진' : ''); }
  function hoursFoot(data) {
    var f = hoursFacts(data);
    return '<dl class="foot-hours">' + f.groups.map(function (g) { return '<div><dt>' + esc(g.days) + '</dt><dd>' + g.time + '</dd></div>'; }).join('') +
      (f.lunch ? '<div><dt>평일 점심</dt><dd>' + f.lunch + '</dd></div>' : '') +
      '<div><dt>토·일·공휴일</dt><dd>' + f.weekend + '</dd></div>' + (f.closed ? '<div><dt>' + esc(f.closed) + '</dt><dd>휴진</dd></div>' : '') + '</dl>';
  }
  /* 공휴일 진료 안내 한 줄 */
  function holidayNote(data) {
    var h = data.hours, closed = (h.closedWeekdays || []).map(function (d) { return DAYS[d] + '요일'; }).join('·');
    var base = '설·추석 같은 공휴일에도 토·일요일과 같은 시간(' + h.weekend.open + ' – ' + h.weekend.close + ')에 진료합니다.';
    if (!closed) return base;
    return base + (h.holidayOnClosedWeekday === 'open' ? ' 공휴일이 ' + closed + '과 겹쳐도 진료합니다.' : ' 다만 공휴일이 휴진일인 ' + closed + '과 겹치면 쉽니다.');
  }
  function hoursTable(data) {
    var h = data.hours, f = hoursFacts(data);
    var rows = wdGroups(h).map(function (x) {
      return '<tr><th scope="row">' + esc(dayList(x.days)) + '</th><td><b>' + range(x.open, x.close) + '</b>' +
        (x.lunch ? '<small>점심시간 ' + range(x.lunch[0], x.lunch[1]) + '</small>' : '') + '</td></tr>';
    }).join('');
    rows += '<tr><th scope="row">토·일·공휴일</th><td><b>' + range(h.weekend.open, h.weekend.close) + '</b><small>점심시간 없이 진료</small></td></tr>';
    if (f.closed) rows += '<tr class="is-off"><th scope="row">' + esc(f.closed) + '</th><td><b>휴진</b></td></tr>';
    return '<table class="hours"><caption class="sr">진료시간</caption><tbody>' + rows + '</tbody></table>';
  }
  /* 요일별 막대 — 한 주의 리듬을 한눈에 */
  function weekChart(data, todayDow) {
    var h = data.hours, lo = 9 * 60, hi = 20 * 60;
    wdGroups(h).map(function (x) { return x.open; }).concat([h.weekend.open]).forEach(function (x) { lo = Math.min(lo, Math.floor(mins(x) / 60) * 60); });
    wdGroups(h).map(function (x) { return x.close; }).concat([h.weekend.close]).forEach(function (x) { hi = Math.max(hi, Math.ceil(mins(x) / 60) * 60); });
    var span = hi - lo;
    function pct(m) { return ((m - lo) / span * 100).toFixed(2) + '%'; }
    function bar(a, b, cls) { return '<span class="week__bar' + (cls ? ' ' + cls : '') + '" style="left:' + pct(mins(a)) + ';width:' + ((mins(b) - mins(a)) / span * 100).toFixed(2) + '%"></span>'; }
    var order = [1, 2, 3, 4, 5, 6, 0], out = '';
    order.forEach(function (d) {
      var closed = (h.closedWeekdays || []).indexOf(d) > -1, wk = d === 0 || d === 6;
      var p = closed ? null : wk ? h.weekend : ((h.weekday.days || []).indexOf(d) > -1 ? wd(h, d) : null);
      var text = p ? p.open + ' – ' + p.close + (p.lunch ? ', 점심시간 ' + p.lunch[0] + ' – ' + p.lunch[1] : '') : '휴진';
      out += '<li class="week__row' + (p ? '' : ' is-off') + (d === todayDow ? ' is-today' : '') + '">' +
        '<span class="week__day">' + DAYS[d] + (d === todayDow ? '<span class="sr"> (오늘)</span>' : '') + '</span>' +
        '<span class="week__track" role="img" aria-label="' + DAYS[d] + '요일 ' + esc(text) + '">' +
        (p ? (p.lunch ? bar(p.open, p.lunch[0]) + bar(p.lunch[0], p.lunch[1], 'is-lunch') + bar(p.lunch[1], p.close) : bar(p.open, p.close)) : '<span class="week__off">휴진</span>') +
        '</span><span class="week__time">' + (p ? esc(p.open + ' – ' + p.close) : '휴진') + '</span></li>';
    });
    var ticks = '';
    for (var m = lo; m <= hi; m += 120) ticks += '<span style="left:' + pct(m) + '">' + (m / 60) + '시</span>';
    return '<div class="week"><ol class="week__rows">' + out + '</ol><div class="week__axis" aria-hidden="true"><span class="week__day"></span><span class="week__ticks">' + ticks + '</span><span class="week__time"></span></div>' +
      (wdGroups(h).some(function (x) { return x.lunch; }) ? '<p class="week__legend"><span class="week__swatch"></span>진료 <span class="week__swatch is-lunch"></span>점심시간</p>' : '') + '</div>';
  }

  /* ---------- 자주 묻는 질문 ---------- */
  function faqList(data, opt) {
    opt = opt || {};
    var items = (data.faq || []).filter(function (f) { return f && f.q && (!opt.featured || f.featured); });
    if (opt.limit) items = items.slice(0, opt.limit);
    if (!items.length) return '<p class="empty">등록된 질문이 아직 없습니다. 궁금한 점은 전화로 편하게 물어봐 주세요.</p>';
    return '<div class="faq">' + items.map(function (f, i) {
      return '<details class="faq__item" data-cat="' + esc(f.cat || '') + '"' + (opt.open === i ? ' open' : '') + '>' +
        '<summary><span class="faq__q">' + esc(f.q) + '</span></summary>' +
        '<div class="faq__a"><p>' + rich(f.a, opt.base) + '</p></div></details>';
    }).join('') + '</div>';
  }
  function faqCats(data) {
    var seen = [];
    (data.faq || []).forEach(function (f) { if (f.cat && seen.indexOf(f.cat) < 0) seen.push(f.cat); });
    return seen;
  }

  /* ---------- 비급여 진료비 ---------- */
  function feeTable(data) {
    var fees = data.fees || {}, items = (fees.items || []).filter(function (x) { return x && x.name; });
    if (!items.length) return '<p class="empty">비급여 진료비는 개원에 맞춰 게시합니다.</p>';
    return '<table class="table fee"><caption class="sr">비급여 진료비</caption><thead><tr><th scope="col">항목</th><th scope="col">구분</th><th scope="col">비용</th></tr></thead><tbody>' +
      items.map(function (x) {
        return '<tr><th scope="row">' + esc(x.name) + '</th><td>' + esc(x.unit || '') + '</td><td>' + (x.price ? esc(x.price) : '<span class="soon">게시 예정</span>') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- 블로그 글 ---------- */
  function postList(data, opt) {
    opt = opt || {};
    var posts = (data.posts || []).filter(function (p) { return p && p.title && p.url && (!opt.cat || p.cat === opt.cat); });
    if (opt.limit) posts = posts.slice(0, opt.limit);
    if (!posts.length) return '';
    return '<ul class="posts' + (opt.cls ? ' ' + opt.cls : '') + '">' + posts.map(function (p) {
      return '<li data-cat="' + esc(p.cat || '') + '"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
        '<span class="posts__meta">' + (p.cat && !opt.cat ? '<span class="posts__cat">' + esc(p.cat) + '</span>' : '') +
        (p.date ? '<time datetime="' + esc(p.date) + '">' + esc(p.date.replace(/-/g, '.')) + '</time>' : '') + '</span>' +
        '<span class="posts__title">' + esc(p.title) + '</span>' +
        (p.excerpt && !opt.brief ? '<span class="posts__excerpt">' + esc(p.excerpt) + '</span>' : '') +
        '<span class="sr"> (새 창)</span></a></li>';
    }).join('') + '</ul>';
  }

  /* ---------- 공간 사진 ---------- */
  function photoGrid(data, opt) {
    opt = opt || {};
    var base = opt.base || '', list = (data.photos || []).filter(function (p) { return p && p.src; });
    if (opt.limit) list = list.slice(0, opt.limit);
    if (!list.length) return '<p class="empty">공간 사진은 개원과 함께 공개합니다.</p>';
    return '<ul class="photos' + (opt.cls ? ' ' + opt.cls : '') + '">' + list.map(function (p) {
      var src = /^https?:/.test(p.src) ? p.src : base + p.src;
      return '<li class="photo"><figure><div class="photo__img"><img src="' + esc(src) + '" alt="' + esc(p.alt || p.title || '') + '" loading="lazy" decoding="async" width="800" height="600">' +
        (p.sample ? '<span class="photo__tag">예시 이미지</span>' : '') + '</div>' +
        '<figcaption><b>' + esc(p.title || '') + '</b>' + (p.caption ? '<span>' + esc(p.caption) + '</span>' : '') + '</figcaption></figure></li>';
    }).join('') + '</ul>';
  }
  /* 블로그 카테고리 순서 그대로 */
  var CAT_ORDER = ['ABOUT 소율', '소율의 진료', '귀 질환 클리닉', '척추·통증 클리닉', '비만·체형 클리닉', '몸과 마음의 리듬', '소율의 하루', '개원일기'];
  function postCats(data) {
    var seen = [];
    (data.posts || []).forEach(function (p) { if (p && p.title && p.url && p.cat && seen.indexOf(p.cat) < 0) seen.push(p.cat); });
    function rank(c) { var i = CAT_ORDER.indexOf(c); return i < 0 ? 99 : i; }
    return seen.sort(function (a, b) { return rank(a) - rank(b); });
  }
  function hasSample(data) { return (data.photos || []).some(function (p) { return p && p.sample; }); }

  function equipmentList(data) {
    var list = (data.equipment || []).filter(function (e) { return e && e.name; });
    if (!list.length) return '';
    return '<ul class="equip">' + list.map(function (e) {
      return '<li><b>' + esc(e.name) + '</b>' + (e.desc ? '<p>' + esc(e.desc) + '</p>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- 주소·지도 앱 ---------- */
  function links(data) {
    var p = data.place, c = data.clinic, name = c.name;
    var q = encodeURIComponent(p.address), n = encodeURIComponent(name);
    return {
      tel: 'tel:' + String(c.phone).replace(/[^0-9+]/g, ''),
      fullAddress: p.address + ', ' + p.building + ' ' + p.floor,
      google: 'https://www.google.com/maps/dir/?api=1&destination=' + p.lat + '%2C' + p.lng + '&travelmode=transit',
      googleEmbed: 'https://www.google.com/maps?q=' + p.lat + ',' + p.lng + '&z=17&hl=ko&output=embed',
      naver: p.naverPlaceUrl || 'https://map.naver.com/p/search/' + q,
      kakao: 'https://map.kakao.com/link/to/' + n + ',' + p.lat + ',' + p.lng,
      tmapScheme: 'tmap://route?rGoName=' + n + '&rGoX=' + p.lng + '&rGoY=' + p.lat,
      tmapIntent: 'intent://route?rGoName=' + n + '&rGoX=' + p.lng + '&rGoY=' + p.lat + '#Intent;scheme=tmap;package=com.skt.tmap.ku;end',
      tmapStore: 'https://apps.apple.com/kr/app/id431589174'
    };
  }

  /* ---------- 검색엔진용 구조화 정보 ---------- */
  function jsonLd(data, siteUrl) {
    var c = data.clinic, p = data.place, h = data.hours, ch = data.channels || {};
    var en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var spec = wdGroups(h).map(function (x) { return { '@type': 'OpeningHoursSpecification', dayOfWeek: x.days.map(function (d) { return en[d]; }), opens: x.open, closes: x.close }; });
    var wk = [6, 0].filter(function (d) { return (h.closedWeekdays || []).indexOf(d) < 0; });
    if (wk.length) spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: wk.map(function (d) { return en[d]; }).concat(['PublicHolidays']), opens: h.weekend.open, closes: h.weekend.close });
    var o = {
      '@context': 'https://schema.org', '@type': 'MedicalClinic', name: c.name, alternateName: c.nameEn,
      url: siteUrl, image: siteUrl + 'assets/img/og-image.jpg', logo: siteUrl + 'assets/img/icon-512.png',
      telephone: '+82-' + String(c.phone).replace(/^0/, ''),
      description: '몸의 근본을 살피고 나다운 리듬을 찾는 한의원. 귀 질환·척추통증·비만체형 진료. 구의역 2번 출구에서 걸어서 2분.',
      address: { '@type': 'PostalAddress', streetAddress: p.address.replace(/^서울특별시 광진구 /, '') + ', ' + p.building + ' ' + p.floor, addressLocality: '광진구', addressRegion: '서울특별시', postalCode: p.zip, addressCountry: 'KR' },
      geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
      openingHoursSpecification: spec,
      sameAs: [ch.blog, ch.instagram, ch.kakao, p.naverPlaceUrl].filter(Boolean)
    };
    return JSON.stringify(o);
  }
  function faqLd(data) {
    return JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: (data.faq || []).filter(function (f) { return f && f.q; }).map(function (f) {
        return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: String(f.a).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n/g, ' ') } };
      }) });
  }

  root.SoyulRender = {
    DAYS: DAYS, esc: esc, rich: rich, icon: icon, mins: mins, clock: clock, kst: kst, plan: plan, status: status, isOpened: isOpened,
    hoursFacts: hoursFacts, hoursLine: hoursLine, hoursMenu: hoursMenu, hoursMain: hoursMain, hoursSub: hoursSub, hoursFoot: hoursFoot, holidayNote: holidayNote, hoursTable: hoursTable, weekChart: weekChart, faqList: faqList, faqCats: faqCats, feeTable: feeTable,
    postList: postList, postCats: postCats, photoGrid: photoGrid, hasSample: hasSample, equipmentList: equipmentList, links: links, jsonLd: jsonLd, faqLd: faqLd
  };
})(typeof window !== 'undefined' ? window : globalThis);
