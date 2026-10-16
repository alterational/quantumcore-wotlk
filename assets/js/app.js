/* ==========================================================================
   QuantumCore Armory — приложение
   Данные: data/db.json (дамп item_template + справочники клиента 3.3.5a)
   ========================================================================== */
(function () {
  'use strict';

  var I = window.ArmoryI18n;
  var DB = null;               /* основная база: sql/item_template.sql */
  var QC = null;               /* отдельная база: sql/qc131.sql (ключи с префиксом qc) */
  var QC_PREFIX = 'qc';
  var QC_FILE = 'data/qc131.json';
  var SECTION_PASSWORD = '1337';
  /* Запароленные разделы: у каждого свой файл данных, свои ключи предметов и своя
     отметка «открыт». Пароль общий, данные читаются только после его ввода. */
  var SECTION_DEFS = {
    public: {
      key: 'public', prefix: 'pub', file: 'data/public.json', flag: 'armory.public',
      dumpFile: 'sql/public.sql',
      nav: 'nav-public', titleKey: 'pub_title', noteKey: 'pub_note', aboutKey: 'pub_about',
      badgeKey: 'pub_badge', badgeHintKey: 'pub_badge_hint', lockTitleKey: 'pub_locked_title'
    },
    wowdm: {
      key: 'wowdm', prefix: 'wowdm', file: 'data/wowdm.json', flag: 'armory.wowdm',
      dumpFile: 'sql/wowdm.sql',
      nav: 'nav-wowdm', titleKey: 'wowdm_title', noteKey: 'wowdm_note', aboutKey: 'wowdm_about',
      badgeKey: 'wowdm_badge', badgeHintKey: 'wowdm_badge_hint', lockTitleKey: 'wowdm_locked_title'
    }
  };
  var SECTION_KEYS = ['public', 'wowdm'];
  var SECTIONS = { public: null, wowdm: null };
  var ITEMS_BY_KEY = {};       /* ключ основной базы — id, отдельной — qc + id */
  var SPELLS = {};
  var SETS = {};
  var ICON_BASE = 'https://wow.zamimg.com/images/wow/icons/large/';
  var SOCKET_CSS = { 1: 'meta', 2: 'red', 4: 'yellow', 8: 'blue' };
  var TRIGGERS = {
    0: 'trigger_use', 1: 'trigger_equip', 2: 'trigger_chance',
    4: 'trigger_soulbound', 5: 'trigger_learn', 6: 'trigger_use'
  };

  /* какие типы слотов принимает каждый слот куклы */
  var SLOT_ACCEPTS = {
    head: [1], neck: [2], shoulders: [3], back: [16], chest: [5, 20], shirt: [4], tabard: [19],
    wrist: [9], hands: [10], waist: [6], legs: [7], feet: [8],
    finger1: [11], finger2: [11], trinket1: [12], trinket2: [12],
    mainhand: [13, 17, 21], offhand: [14, 22, 23], ranged: [15, 25, 26], relic: [28]
  };

  var DOLL_LAYOUT = [
    { key: 'head', ru: 'Голова', en: 'Head' }, { key: 'neck', ru: 'Шея', en: 'Neck' },
    { key: 'shoulders', ru: 'Плечи', en: 'Shoulders' }, { key: 'back', ru: 'Спина', en: 'Back' },
    { key: 'chest', ru: 'Грудь', en: 'Chest' }, { key: 'shirt', ru: 'Рубашка', en: 'Shirt' },
    { key: 'tabard', ru: 'Гербовая накидка', en: 'Tabard' }, { key: 'wrist', ru: 'Запястья', en: 'Wrist' },
    { key: 'hands', ru: 'Кисти рук', en: 'Hands' }, { key: 'waist', ru: 'Пояс', en: 'Waist' },
    { key: 'legs', ru: 'Ноги', en: 'Legs' }, { key: 'feet', ru: 'Ступни', en: 'Feet' },
    { key: 'finger1', ru: 'Первое кольцо', en: 'Finger 1' }, { key: 'finger2', ru: 'Второе кольцо', en: 'Finger 2' },
    { key: 'trinket1', ru: 'Первый аксессуар', en: 'Trinket 1' }, { key: 'trinket2', ru: 'Второй аксессуар', en: 'Trinket 2' },
    { key: 'mainhand', ru: 'Правая рука', en: 'Main hand' }, { key: 'offhand', ru: 'Левая рука', en: 'Off hand' },
    { key: 'ranged', ru: 'Дальний бой', en: 'Ranged' }, { key: 'relic', ru: 'Реликвия', en: 'Relic' }
  ];

  var state = {
    lang: 'ru',
    view: 'catalog',
    itemTab: 'summary',
    sort: 'ilvl',
    filters: { q: '', itemClass: '', subclass: '', slot: '', quality: '', ilvlMin: '', ilvlMax: '', set: false, spells: false, sockets: false },
    compare: [],
    char: { cls: 0, race: 0, level: 80, equipped: {} },
    limit: 80
  };

  /* ------------------------------ утилиты -------------------------------- */

  function t(key) {
    var v = I.UI[state.lang][key];
    return v === undefined ? key : v;
  }

  function qualityName(q) {
    return (I.QUALITY[state.lang] || I.QUALITY.ru)[q] || '';
  }

  function qClass(q) { return 'q' + (q || 0); }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function num(v, digits) {
    var n = Number(v) || 0;
    var s = digits ? n.toFixed(digits) : String(Math.round(n));
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    s = parts.join(state.lang === 'ru' ? ',' : '.');
    return s;
  }

  function iconUrl(icon) {
    return icon ? ICON_BASE + icon + '.jpg' : '';
  }

  function iconFrame(item, size, extra) {
    var cls = 'icon-frame' + (size ? ' ' + size : '');
    var style = item.icon ? 'background-image:url(' + iconUrl(item.icon) + ')' : '';
    return '<span class="' + cls + (extra ? ' ' + extra : '') + '" style="' + style + '">' +
      '<span class="q-border" style="box-shadow:inset 0 0 0 2px ' + qualityHex(item.quality) + '"></span></span>';
  }

  /* иконка заклинания (эффекта предмета, бонуса комплекта) */
  function spellIcon(spell, cls) {
    var icon = spell && spell.icon;
    var classes = 'spell-icon' + (cls ? ' ' + cls : '');
    if (!icon) return '<span class="' + classes + ' empty" title="—"></span>';
    return '<span class="' + classes + '" title="' + esc(icon) + '" style="background-image:url(' +
      iconUrl(icon) + ')"></span>';
  }

  function triggerLabel(trigger) {
    return t(TRIGGERS[trigger] || 'trigger_use');
  }

  function qualityHex(q) {
    return ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000', '#e6cc80', '#00ccff'][q] || '#9d9d9d';
  }

  function slotName(item) {
    return (I.SLOT[state.lang] || I.SLOT.ru)[item.inventoryType] || '—';
  }

  /* строка слота в тултипе: у щита в клиенте показана рука, в которую он надевается
     («Левая рука» / «Off Hand»), иначе слот и подкласс давали две строки «Щит» */
  var TOOLTIP_SLOT = { ru: { 14: 'Левая рука' }, en: { 14: 'Off Hand' } };

  function tooltipSlotName(item) {
    var table = TOOLTIP_SLOT[state.lang] || TOOLTIP_SLOT.ru;
    return table[item.inventoryType] || slotName(item);
  }

  function className(item) {
    return (I.CLASS[state.lang] || I.CLASS.ru)[item['class']] || '—';
  }

  function subclassName(item) {
    var key = item['class'] + ':' + item.subclass;
    var map = I.SUBCLASS[state.lang] || I.SUBCLASS.ru;
    var name = map[key] || (I.SUBCLASS.ru || {})[key];
    /* подклассы, которых нет в справочнике (кастомный контент), не должны ломать карточку */
    return name || (state.lang === 'ru' ? 'Разное (подкласс ' : 'Other (subclass ') + item.subclass + ')';
  }

  function statName(id) {
    var s = I.STAT[id];
    if (!s) return (state.lang === 'ru' ? 'Характеристика ' : 'Stat ') + id;
    return s[state.lang];
  }

  function statLine(id, value) {
    var p = I.STAT_PHRASE[id];
    var amount = num(value);
    if (!p) return '+' + amount + ' ' + statName(id);
    return state.lang === 'ru' ? '+' + amount + ' ' + p[0] : '+' + amount + ' ' + p[1];
  }

  function money(copper) {
    var value = Math.max(0, parseInt(copper, 10) || 0);
    var g = Math.floor(value / 10000);
    var s = Math.floor((value % 10000) / 100);
    var c = value % 100;
    var out = [];
    if (g) out.push('<span class="coin g">' + num(g) + (state.lang === 'ru' ? 'з' : 'g') + '</span>');
    if (s) out.push('<span class="coin s">' + s + (state.lang === 'ru' ? 'с' : 's') + '</span>');
    if (c || !out.length) out.push('<span class="coin c">' + c + (state.lang === 'ru' ? 'м' : 'c') + '</span>');
    return out.join(' ');
  }

  function durationText(ms) {
    if (!ms) return '';
    if (ms < 0) return state.lang === 'ru' ? 'до отмены' : 'until cancelled';
    var sec = ms / 1000;
    if (sec >= 3600) return num(sec / 3600, 0) + (state.lang === 'ru' ? ' ч.' : ' hr');
    if (sec >= 60) return num(sec / 60, 0) + (state.lang === 'ru' ? ' мин.' : ' min');
    if (sec % 1) return num(sec, 1) + (state.lang === 'ru' ? ' сек.' : ' sec');
    return num(sec) + (state.lang === 'ru' ? ' сек.' : ' sec');
  }

  function itemDps(item) {
    if (!item.damage || !item.damage.length || !item.delay) return 0;
    var d = item.damage[0];
    return ((d.min + d.max) / 2) / (item.delay / 1000);
  }

  function spellById(id) { return SPELLS[String(id)] || null; }
  function setById(id) { return SETS[String(id)] || null; }

  function spellName(spell) {
    if (!spell) return '';
    var v = spell.name[state.lang];
    return v || spell.name.ru || spell.name.en || ('Заклинание ' + spell.id);
  }

  function spellText(spell) {
    if (!spell) return '';
    var v = spell.text[state.lang];
    return v || spell.text.ru || spell.text.en || '';
  }

  function spellRank(spell) {
    if (!spell) return '';
    var v = spell.rank[state.lang];
    return v || spell.rank.ru || spell.rank.en || '';
  }

  /* -------------------------- проверка требований ------------------------- */

  function classNames(mask, lang) {
    var names = lang === 'ru' ? I.CLASS_MASK : I.CLASS_MASK_EN;
    var out = [];
    for (var i = 0; i < I.CLASS_BITS.length; i++) {
      if (mask & I.CLASS_BITS[i]) out.push(names[i]);
    }
    return out;
  }

  function raceNames(mask, lang) {
    var names = lang === 'ru' ? I.RACE_MASK : I.RACE_MASK_EN;
    var out = [];
    for (var i = 0; i < I.RACE_BITS.length; i++) {
      if (mask & I.RACE_BITS[i]) out.push(names[i]);
    }
    return out;
  }

  function charClassAllowed(item) {
    var m = item.allowableClass;
    if (!m || m < 0) return true;
    if (!state.char.cls) return true;
    var bit = I.CLASS_BITS[state.char.cls - 1];
    return !!(m & bit);
  }

  function charRaceAllowed(item) {
    var m = item.allowableRace;
    if (!m || m < 0) return true;
    if (!state.char.race) return true;
    var bit = I.RACE_BITS[state.char.race - 1];
    return !!(m & bit);
  }

  function charLevelAllowed(item) {
    if (!item.reqLevel) return true;
    if (!state.char.level) return true;
    return state.char.level >= item.reqLevel;
  }

  function equippable(item) {
    for (var key in SLOT_ACCEPTS) {
      if (SLOT_ACCEPTS[key].indexOf(item.inventoryType) >= 0) return true;
    }
    return false;
  }

  function compatible(item) {
    return charClassAllowed(item) && charRaceAllowed(item) && charLevelAllowed(item);
  }

  function itemFlagsList(item) {
    var out = [];
    for (var i = 0; i < I.FLAGS.length; i++) {
      if (item.flags & I.FLAGS[i][0]) out.push(state.lang === 'ru' ? I.FLAGS[i][1] : I.FLAGS[i][2]);
    }
    for (var j = 0; j < I.FLAGS_EXTRA.length; j++) {
      if (item.flagsExtra & I.FLAGS_EXTRA[j][0]) out.push(state.lang === 'ru' ? I.FLAGS_EXTRA[j][1] : I.FLAGS_EXTRA[j][2]);
    }
    return out;
  }


  /* сравнение предмета с тем, что уже надето в тот же слот */
  function equippedDiff(item) {
    var lang = state.lang;
    var slotKey = itemSlotKey(item);
    if (!slotKey) return '';
    var equippedId = state.char.equipped[slotKey];
    if (!equippedId || equippedId === item.id) return '';
    var prev = itemById(equippedId);
    if (!prev) return '';
    var rows = [];
    function deltaStat(src, dst, sid) {
      var a = src.stats.filter(function (s) { return s.t === sid; })[0];
      var b = dst.stats.filter(function (s) { return s.t === sid; })[0];
      return ((a ? a.v : 0) - (b ? b.v : 0));
    }
    var ids = {};
    item.stats.concat(prev.stats).forEach(function (s) { ids[s.t] = true; });
    Object.keys(ids).map(Number).sort(function (a, b) { return a - b; }).forEach(function (sid) {
      var d = deltaStat(item, prev, sid);
      rows.push({ label: statName(sid), from: (prev.stats.filter(function (s) { return s.t === sid; })[0] || { v: 0 }).v,
        to: (item.stats.filter(function (s) { return s.t === sid; })[0] || { v: 0 }).v, delta: d });
    });
    var dArmor = (item.armor || 0) - (prev.armor || 0);
    if (dArmor) rows.unshift({ label: t('armor_label'), from: prev.armor || 0, to: item.armor || 0, delta: dArmor });
    var dIlvl = item.ilvl - prev.ilvl;
    if (dIlvl) rows.unshift({ label: t('item_level'), from: prev.ilvl, to: item.ilvl, delta: dIlvl });
    var dDps = itemDps(item) - itemDps(prev);
    if (dDps) rows.push({ label: t('dps'), from: Math.round(itemDps(prev) * 10) / 10, to: Math.round(itemDps(item) * 10) / 10,
      delta: Math.round(dDps * 10) / 10 });

    var h = [];
    h.push('<div class="panel"><div class="panel-head"><h3>' +
      (lang === 'ru' ? 'Сравнение с надетым' : 'Versus equipped') + '</h3>' +
      '<span class="spacer"></span><span class="muted small">' + esc(prev.name) + '</span></div>');
    h.push('<div class="panel-body"><table class="data"><thead><tr><th>' + t('compare_param') + '</th><th>' +
      (lang === 'ru' ? 'Надето' : 'Equipped') + '</th><th>' + (lang === 'ru' ? 'Этот предмет' : 'This item') +
      '</th><th>' + (lang === 'ru' ? 'Разница' : 'Change') + '</th></tr></thead><tbody>');
    rows.slice(0, 14).forEach(function (r) {
      var sign = r.delta > 0 ? '+' : '';
      h.push('<tr><td class="param">' + esc(r.label) + '</td><td>' + num(r.from) + '</td><td>' + num(r.to) + '</td>' +
        '<td style="color:' + (r.delta > 0 ? 'var(--good)' : r.delta < 0 ? 'var(--bad)' : 'var(--text-dim)') + '">' +
        sign + num(r.delta) + '</td></tr>');
    });
    h.push('</tbody></table></div></div>');
    return h.join('');
  }

  /* прогресс комплектов на кукле */
  function setProgress() {
    var counters = {};
    Object.keys(state.char.equipped).forEach(function (key) {
      var item = itemById(state.char.equipped[key]);
      if (!item || !item.set) return;
      if (!counters[item.set]) counters[item.set] = 0;
      counters[item.set]++;
    });
    var out = [];
    Object.keys(counters).forEach(function (sid) {
      var set = setById(sid);
      if (!set) return;
      out.push({ set: set, count: counters[sid], total: set.items.length });
    });
    return out.sort(function (a, b) { return b.count - a.count; });
  }

  /* -------------------------------- тултип -------------------------------- */

  function itemTooltip(item, opts) {
    opts = opts || {};
    var lang = state.lang;
    var nameMain, nameSecond = [];
    if (lang === 'ru') {
      nameMain = item.nameRuServer || item.nameRu || item.name;
      if (item.nameRu && item.nameRu !== item.name) nameSecond.push(t('name_db') + ': ' + item.name);
      if (item.nameEnOfficial) nameSecond.push('Wowhead (EN): ' + item.nameEnOfficial);
    } else {
      nameMain = item.name;
      if (item.nameEnOfficial) nameSecond.push(t('name_wowhead_en') + ': ' + item.nameEnOfficial);
      if (item.nameRu) nameSecond.push('Wowhead (RU): ' + item.nameRu);
    }

    var h = [];
    h.push('<div class="tooltip-box' + (opts.wide ? ' wide' : '') + '">');
    h.push('<div class="tt-title ' + qClass(item.quality) + '">' + esc(nameMain) + '</div>');
    if (nameSecond.length) {
      h.push('<div class="tt-name-secondary">' + nameSecond.map(esc).join('<br>') + '</div>');
    }
    h.push('<div class="tt-line gold">' + t('item_level') + ' ' + num(item.ilvl) + '</div>');

    if (item.set && setById(item.set)) {
      var st = setById(item.set);
      var setNm = st.name[lang] || st.name.en || st.name.ru;
      h.push('<div class="tt-line gold">' + esc((lang === 'ru' ? 'Комплект: ' : 'Set: ') + setNm) + '</div>');
    }

    var bind = (I.BONDING[lang] || I.BONDING.ru)[item.bonding];
    if (bind) h.push('<div class="tt-line">' + esc(bind) + '</div>');
    if (item.unique === 1) h.push('<div class="tt-line">' + t('unique') + '</div>');
    if (item.flags & 0x00080000) h.push('<div class="tt-line">' + t('unique_equipped') + '</div>');

    var slotLine = tooltipSlotName(item);
    var subLine = subclassName(item);
    /* если строки совпадают (щит, сумка), показываем её одну */
    if (item.inventoryType !== 0 && slotLine && slotLine !== subLine) {
      h.push('<div class="tt-line">' + esc(slotLine) + '</div>');
    }
    h.push('<div class="tt-line">' + esc(subLine) + '</div>');

    if (item.damage && item.damage.length) {
      var d = item.damage[0];
      h.push('<div class="tt-line">' + num(d.min) + ' - ' + num(d.max) + ' ' +
        (lang === 'ru' ? 'ед. урона' : 'Damage') +
        (d.type ? ' (' + I.DAMAGE_TYPE[lang][d.type] + ')' : '') + '</div>');
      if (item.delay) {
        h.push('<div class="tt-line">' + t('speed') + ' ' + num(item.delay / 1000, 2) + '</div>');
        h.push('<div class="tt-line gray">(' + num(itemDps(item), 1) + ' ' +
          (lang === 'ru' ? 'ед. урона в секунду' : 'damage per second') + ')</div>');
      }
      if (item.rangeMod) {
        h.push('<div class="tt-line">' + t('range') + ' ' + num(item.rangeMod, 0) + '</div>');
      }
    }
    if (item.armor) h.push('<div class="tt-line">' + num(item.armor) + (lang === 'ru' ? ' ед. брони' : ' Armor') + '</div>');
    if (item.containerSlots) h.push('<div class="tt-line">' + num(item.containerSlots) + ' ' + t('container_slots') + '</div>');
    if (item.block) h.push('<div class="tt-line">' + num(item.block) + (lang === 'ru' ? ' ед. блокирования' : ' Block') + '</div>');

    var res = item.resist || {};
    ['holy', 'fire', 'nature', 'frost', 'shadow', 'arcane'].forEach(function (k) {
      if (res[k]) {
        h.push('<div class="tt-line">+' + num(res[k]) + ' ' + (lang === 'ru'
          ? 'к сопротивлению: ' + I.RESIST.ru[k].toLowerCase()
          : I.RESIST.en[k] + ' Resistance') + '</div>');
      }
    });

    item.stats.forEach(function (s) {
      h.push('<div class="tt-line">' + esc(statLine(s.t, s.v)) + '</div>');
    });

    if (item.sockets && item.sockets.length) {
      var gems = item.sockets.map(function (c) {
        return '<span class="gem ' + (SOCKET_CSS[c] || 'meta') + '"></span>';
      }).join('');
      h.push('<div class="tt-sockets">' + gems + '<span class="muted small" style="margin-left:6px">' +
        item.sockets.map(function (c) { return (I.SOCKET[c] || {})[lang] || ''; }).join(', ') + '</span></div>');
      var sbName = item.socketBonusName ? (item.socketBonusName[lang] || item.socketBonusName.en) : '';
      if (sbName) h.push('<div class="tt-line gold">' + t('set_bonus') + ': ' + esc(sbName) + '</div>');
      else if (item.socketBonus) h.push('<div class="tt-line gold">' + t('set_bonus') + ': #' + item.socketBonus + '</div>');
    }

    /* спецэффекты предмета */
    item.spells.forEach(function (s) {
      var spell = spellById(s.id);
      if (!spell) return;
      var label = t(TRIGGERS[s.trigger] || 'trigger_use');
      var text = spellText(spell);
      h.push('<div class="tt-spell">' + spellIcon(spell) + '<b>' + esc(label) + ':</b> <span class="tt-spell-text">' + esc(text) + '</span>');
      var meta = [];
      if (s.cooldown > 0) meta.push(t('cooldown') + ' ' + durationText(s.cooldown));
      if (s.charges) meta.push(t('charges') + ' ' + s.charges);
      if (s.ppm) meta.push(t('ppm') + ' ' + num(s.ppm, 1));
      if (spell.duration_ms > 0) meta.push(t('duration') + ' ' + durationText(spell.duration_ms));
      if (meta.length) h.push('<div class="muted small">' + esc(meta.join(' · ')) + '</div>');
      h.push('</div>');
    });

    /* комплект */
    if (item.set) {
      var set = setById(item.set);
      if (set && set.bonuses.length) {
        h.push('<div class="tt-sep"></div>');
        h.push('<div class="tt-line gold">' + esc((lang === 'ru' ? 'Комплект: ' : 'Set: ') +
          (set.name[lang] || set.name.en || '')) + '</div>');
        set.bonuses.forEach(function (b) {
          var txt = b.text[lang] || b.text.en || '';
          if (!txt) return;
          h.push('<div class="tt-line">(' + b.threshold + ') ' +
            esc((lang === 'ru' ? 'Комплект: ' : 'Set: ') + txt) + '</div>');
        });
      }
    }

    h.push('<div class="tt-sep"></div>');
    if (item.reqLevel) h.push('<div class="tt-line">' + t('requires_level') + ' ' + item.reqLevel + '</div>');
    var clsMask = item.allowableClass;
    if (clsMask && clsMask > 0) {
      var cn = classNames(clsMask, lang);
      if (cn.length && cn.length < 10) h.push('<div class="tt-line">' + t('classes') + ': ' + esc(cn.join(', ')) + '</div>');
    }
    var raceMask = item.allowableRace;
    if (raceMask && raceMask > 0) {
      var rn = raceNames(raceMask, lang);
      if (rn.length && rn.length < 10) h.push('<div class="tt-line">' + t('races') + ': ' + esc(rn.join(', ')) + '</div>');
    }
    if (item.durability) h.push('<div class="tt-line">' + t('durability') + ' ' + item.durability + ' / ' + item.durability + '</div>');
    if (item.sellPrice) h.push('<div class="tt-line">' + t('sell_price') + ': ' + money(item.sellPrice) + '</div>');
    var descShown = (state.lang === 'ru' && item.descriptionRu) ? item.descriptionRu : item.description;
    if (descShown) h.push('<div class="tt-line gold small">«' + esc(descShown) + '»</div>');
    if (item.qc) h.push('<div class="tt-line gray small">' + esc(t('qc_badge')) + '</div>');
    if (item.sectionKey) h.push('<div class="tt-line gray small">' +
      esc(t(SECTION_DEFS[item.sectionKey].badgeKey)) + '</div>');
    h.push('</div>');
    return h.join('');
  }

  /* ------------------------------- роутинг -------------------------------- */

  function parseHash() {
    var hash = (location.hash || '#/catalog').replace(/^#\/?/, '');
    var parts = hash.split('/');
    if (parts[0] === 'item' && parts[1]) return { view: 'item', id: String(parts[1]) };
    if (parts[0] === 'qc') return { view: 'qc' };
    if (SECTION_DEFS[parts[0]]) return { view: parts[0] };   /* запароленные разделы */
    if (parts[0] === 'doll') return { view: 'doll' };
    if (parts[0] === 'compare') return { view: 'compare' };
    if (parts[0] === 'about') return { view: 'about' };
    return { view: 'catalog' };
  }

  function navigate(route) {
    var hash = '#/catalog';
    if (route.view === 'item') hash = '#/item/' + route.id;
    else if (route.view !== 'catalog') hash = '#/' + route.view;
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* ------------------------------- вёрстка -------------------------------- */

  function render() {
    var route = parseHash();
    state.view = route.view;
    /* разметка ниже заменяется целиком — старая подсказка уже не актуальна */
    hideTooltip();
    var main = document.getElementById('view');
    if (!DB) { main.innerHTML = '<div class="panel panel-body">' + t('loading') + '</div>'; return; }

    if (route.view === 'item') main.innerHTML = viewItem(route.id);
    else if (route.view === 'qc') main.innerHTML = viewCatalog('qc');
    else if (SECTION_DEFS[route.view]) {
      main.innerHTML = (sectionUnlocked(route.view) && SECTIONS[route.view])
        ? viewCatalog(route.view) : viewLockPanel(route.view);
    }
    else if (route.view === 'doll') main.innerHTML = viewDoll();
    else if (route.view === 'compare') main.innerHTML = viewCompare();
    else if (route.view === 'about') main.innerHTML = viewAbout();
    else main.innerHTML = viewCatalog();

    updateNav();
    window.scrollTo({ top: 0, behavior: 'auto' });
    bindViewEvents();
  }

  function updateNav() {
    var btns = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-view') === state.view);
    }
    var cmp = document.querySelector('.nav-btn[data-view="compare"]');
    if (cmp) cmp.textContent = t('nav_compare') + (state.compare.length ? ' (' + state.compare.length + ')' : '');
  }

  /* ------------------------------- каталог -------------------------------- */

  /* предметы текущего каталога: основная база, отдельный дамп QC или Public */
  function catalogItems() {
    if (state.view === 'qc') return QC ? QC.items : [];
    if (SECTION_DEFS[state.view]) return SECTIONS[state.view] ? SECTIONS[state.view].items : [];
    return DB ? DB.items : [];
  }

  function filteredItems() {
    var f = state.filters;
    var q = (f.q || '').trim().toLowerCase();
    var out = catalogItems().filter(function (it) {
      if (f.itemClass !== '' && it['class'] !== +f.itemClass) return false;
      if (f.subclass !== '' && it.subclass !== +f.subclass) return false;
      if (f.slot !== '' && it.inventoryType !== +f.slot) return false;
      if (f.quality !== '' && it.quality !== +f.quality) return false;
      if (f.ilvlMin !== '' && it.ilvl < +f.ilvlMin) return false;
      if (f.ilvlMax !== '' && it.ilvl > +f.ilvlMax) return false;
      if (f.set && !it.set) return false;
      if (f.spells && !it.spells.length) return false;
      if (f.sockets && !it.sockets.length) return false;
      if (q) {
        var hay = [it.name, it.nameRu, it.nameEnOfficial, String(it.id), String(it.wowheadId || '')]
          .join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    out.sort(function (a, b) {
      switch (state.sort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'dps': return itemDps(b) - itemDps(a);
        case 'armor': return b.armor - a.armor;
        case 'id': return a.id - b.id;
        default: return (b.ilvl - a.ilvl) || a.name.localeCompare(b.name);
      }
    });
    return out;
  }

  function statSummary(item, count) {
    var parts = item.stats.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, count || 3);
    var out = parts.map(function (s) { return statLine(s.t, s.v); });
    if (!out.length && item.armor) out.push(num(item.armor) + (state.lang === 'ru' ? ' ед. брони' : ' Armor'));
    if (!out.length && item.damage.length) out.push(num(itemDps(item), 1) + (state.lang === 'ru' ? ' ед. урона в секунду' : ' dps'));
    return out.join('<br>');
  }

  /* Раздел Public закрыт: показываем бокс для пароля (данные при этом не загружаются) */
  function viewLockPanel(key) {
    var def = SECTION_DEFS[key];
    var h = [];
    h.push('<div class="panel"><div class="panel-head"><h2>' + t(def.lockTitleKey) + '</h2></div>');
    h.push('<div class="panel-body">');
    h.push('<p class="muted">' + t('lock_text') + '</p>');
    h.push('<form id="lock-form" class="lock-form" data-mode="' + esc(key) + '" autocomplete="off">');
    h.push('<input class="input" type="password" id="lock-pass" inputmode="numeric" ' +
      'maxlength="12" placeholder="' + esc(t('lock_placeholder')) + '" ' +
      'aria-label="' + esc(t('lock_placeholder')) + '">');
    h.push('<button class="btn primary" type="submit">' + t('lock_submit') + '</button>');
    h.push('</form>');
    h.push('<div class="lock-msg" id="lock-msg" role="status"></div>');
    h.push('<p class="small muted" style="margin-top:14px">' + t('lock_note') + '</p>');
    h.push('</div></div>');
    return h.join('');
  }

  function viewCatalog(mode) {
    var source = mode === 'qc' ? (QC ? QC.items : [])
      : SECTION_DEFS[mode] ? (SECTIONS[mode] ? SECTIONS[mode].items : [])
      : (DB ? DB.items : []);
    var items = filteredItems();
    var shown = items.slice(0, state.limit);
    var h = [];

    h.push('<div class="panel" style="margin-bottom:16px;">');
    h.push('<div class="toolbar">');
    h.push('<div class="search-row">');
    h.push('<input class="input" type="search" id="f-q" placeholder="' + esc(t('search_placeholder')) + '" value="' + esc(state.filters.q) + '">');
    h.push('<select class="input" id="f-sort">');
    [['ilvl', 'sort_ilvl'], ['name', 'sort_name'], ['dps', 'sort_dps'], ['armor', 'sort_armor'], ['id', 'sort_id']]
      .forEach(function (o) {
        h.push('<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + t(o[1]) + '</option>');
      });
    h.push('</select>');
    h.push('<button class="btn ghost" id="f-reset">' + t('reset_filters') + '</button>');
    h.push('</div>');

    h.push('<div class="filters">');
    var classOpts = [['', t('all')]];
    var seenClass = {};
    source.forEach(function (it) {
      if (seenClass[it['class']]) return;
      seenClass[it['class']] = true;
      classOpts.push([String(it['class']), className(it)]);
    });
    h.push(filterSelect('f-class', t('filter_class'), classOpts, state.filters.itemClass));

    var subOptions = [['', t('all')]];
    var seenSub = {};
    source.forEach(function (it) {
      if (state.filters.itemClass !== '' && it['class'] !== +state.filters.itemClass) return;
      var key = it['class'] + '|' + it.subclass;
      if (seenSub[key]) return;
      seenSub[key] = true;
      subOptions.push([key, subclassName(it)]);
    });
    var subValue = (state.filters.itemClass !== '' && state.filters.subclass !== '')
      ? state.filters.itemClass + '|' + state.filters.subclass : '';
    h.push(filterSelect('f-subclass', t('filter_subclass'), subOptions, subValue));

    var slotOpts = [['', t('all')]];
    var usedSlots = {};
    source.forEach(function (it) { usedSlots[it.inventoryType] = true; });
    Object.keys(usedSlots).sort(function (a, b) { return +a - +b; }).forEach(function (s) {
      slotOpts.push([s, (I.SLOT[state.lang] || I.SLOT.ru)[s] || ('Слот ' + s)]);
    });
    h.push(filterSelect('f-slot', t('filter_slot'), slotOpts, state.filters.slot));

    var qualOpts = [['', t('all')]];
    var seenQual = {};
    source.forEach(function (it) { seenQual[it.quality] = true; });
    Object.keys(seenQual).sort(function (a, b) { return b - a; }).forEach(function (q) {
      qualOpts.push([q, qualityName(+q) || (t('quality') + ' ' + q)]);
    });
    h.push(filterSelect('f-quality', t('filter_quality'), qualOpts, state.filters.quality));

    h.push('<div class="filter narrow"><label>' + esc(t('filter_ilvl_min')) + '</label>' +
      '<input class="input" id="f-ilvl-min" type="number" min="0" value="' + esc(state.filters.ilvlMin) + '"></div>');
    h.push('<div class="filter narrow"><label>' + esc(t('filter_ilvl_max')) + '</label>' +
      '<input class="input" id="f-ilvl-max" type="number" min="0" value="' + esc(state.filters.ilvlMax) + '"></div>');

    h.push('<div class="filter"><label>' + esc(t('filter_flags')) + '</label><div style="display:flex;gap:12px;flex-wrap:wrap">');
    h.push(checkBox('f-set', t('flag_has_set'), state.filters.set));
    h.push(checkBox('f-spells', t('flag_has_spells'), state.filters.spells));
    h.push(checkBox('f-sockets', t('flag_has_sockets'), state.filters.sockets));
    h.push('</div></div>');
    h.push('</div>');
    h.push('</div>');

    if (mode) {
      var def = mode === 'qc' ? null : SECTION_DEFS[mode];
      var extra = def
        ? { title: t(def.titleKey), note: t(def.noteKey), cls: 'qc-note pub-note' }
        : { title: t('qc_title'), note: t('qc_note'), cls: 'qc-note' };
      h.push('<div class="panel-head" style="border-top:1px solid var(--line-soft);border-radius:0;">');
      h.push('<h2>' + extra.title + '</h2><span class="muted small">' + t('found') + ' ' +
        num(items.length) + ' ' + t('of') + ' ' + num(source.length) + '</span>');
      h.push('</div>');
      h.push('<div class="panel-body ' + extra.cls + '">' + extra.note + '</div>');
      if (def) {
        h.push('<div class="panel-body" style="border-top:1px solid var(--line-soft);text-align:right">' +
          '<button class="btn tiny ghost" id="sec-lock-out" data-mode="' + esc(mode) + '">' +
          t('lock_btn') + '</button></div>');
      }
    } else {
      h.push('<div class="panel-head" style="border-top:1px solid var(--line-soft);border-radius:0;">');
      h.push('<h2>' + t('nav_catalog') + '</h2><span class="muted small">' + t('found') + ' ' +
        num(items.length) + ' ' + t('of') + ' ' + num(source.length) + '</span>');
      h.push('</div>');
    }

    if (!items.length) {
      h.push('<div class="panel-body muted">' + t('nothing_found') + '</div>');
    } else {
      h.push('<table class="items-table"><thead><tr>');
      h.push('<th>' + t('col_item') + '</th><th class="num">' + t('col_ilvl') + '</th>');
      h.push('<th>' + t('col_slot') + '</th><th>' + t('col_type') + '</th>');
      h.push('<th>' + t('col_stats') + '</th><th>' + t('col_actions') + '</th>');
      h.push('</tr></thead><tbody>');
      shown.forEach(function (it) {
        h.push('<tr data-id="' + it.key + '">');
        h.push('<td><div class="item-cell" data-open="' + it.key + '">' + iconFrame(it) +
          '<div><div class="item-name ' + qClass(it.quality) + '">' + esc(displayName(it)) + '</div>' +
          '<div class="item-sub">' + esc(displaySub(it)) + '</div></div></div></td>');
        h.push('<td class="num">' + num(it.ilvl) + '</td>');
        h.push('<td class="small">' + esc(slotName(it)) + '</td>');
        h.push('<td class="small">' + esc(subclassName(it)) + '</td>');
        h.push('<td class="small">' + statSummary(it) + '</td>');
        h.push('<td class="nowrap">' + actionsHtml(it) + '</td>');
        h.push('</tr>');
      });
      h.push('</tbody></table>');
      if (items.length > state.limit) {
        h.push('<div class="panel-body" style="text-align:center"><button class="btn" id="more">' +
          (state.lang === 'ru' ? 'Показать ещё' : 'Show more') + ' (' + num(items.length - state.limit) + ')</button></div>');
      }
    }
    h.push('</div>');
    return h.join('');
  }

  function displayName(item) {
    if (state.lang === 'ru') return item.nameRuServer || item.nameRu || item.name;
    return item.name;
  }

  function displaySub(item) {
    if (state.lang === 'ru') {
      if (item.nameRu && item.nameRu !== item.name) return item.name;
      return item.nameEnOfficial || '';
    }
    if (item.nameEnOfficial && item.nameEnOfficial !== item.name) return item.nameEnOfficial;
    return item.nameRu || '';
  }

  function checkBox(id, label, checked) {
    return '<label class="checkbox"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' + esc(label) + '</label>';
  }

  function filterSelect(id, label, options, value) {
    var h = ['<div class="filter"><label>' + esc(label) + '</label><select class="input" id="' + id + '">'];
    options.forEach(function (o) {
      var v = String(o[0]);
      h.push('<option value="' + esc(v) + '"' + (String(value) === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>');
    });
    h.push('</select></div>');
    return h.join('');
  }

  function actionsHtml(item) {
    var h = [];
    if (equippable(item)) {
      h.push('<button class="btn tiny" data-equip="' + item.key + '">' + t('action_equip') + '</button> ');
    }
    h.push('<button class="btn tiny" data-cmp="' + item.key + '">' + t('action_compare') + '</button> ');
    h.push('<button class="btn tiny ghost" data-open="' + item.key + '">' + t('action_open') + '</button>');
    return h.join('');
  }

  /* --------------------------- карточка предмета -------------------------- */

  function viewItem(id) {
    var item = itemById(id);
    if (!item) return '<div class="panel panel-body">' + t('nothing_found') + '</div>';
    var lang = state.lang;
    var h = [];
    h.push('<div class="item-layout">');

    /* левая колонка — сам предмет */
    h.push('<div style="display:grid;gap:16px">');
    h.push('<div class="panel"><div class="panel-body">');
    h.push('<div class="item-hero">' + iconFrame(item, 'xl') + '<div class="meta">');
    h.push('<h1 class="' + qClass(item.quality) + '">' + esc(displayName(item)) + '</h1>');
    h.push('<div class="muted small">' + esc(displaySub(item) || '') + '</div>');
    h.push('<div class="badge-row">');
    if (item.qc) h.push('<span class="badge qc" title="' + esc(t('qc_badge_hint')) + '">' + t('qc_badge') + '</span>');
    if (item.sectionKey) {
      var sdef = SECTION_DEFS[item.sectionKey];
      h.push('<span class="badge qc pub" title="' + esc(t(sdef.badgeHintKey)) + '">' +
        t(sdef.badgeKey) + '</span>');
    }
    h.push('<span class="badge">#' + item.id + '</span>');
    h.push('<span class="badge">' + esc(qualityName(item.quality)) + '</span>');
    h.push('<span class="badge">' + esc(slotName(item)) + '</span>');
    h.push('<span class="badge">' + esc(subclassName(item)) + '</span>');
    if (item.set) h.push('<span class="badge set">' + esc((setById(item.set) || { name: {} }).name[lang] || t('tab_set')) + '</span>');
    if (!compatible(item)) h.push('<span class="badge warn">' + t('incompatible') + '</span>');
    h.push('</div>');
    h.push('<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">');
    if (equippable(item)) h.push('<button class="btn primary" data-equip="' + item.key + '">' + t('action_equip') + '</button>');
    h.push('<button class="btn" data-cmp="' + item.key + '">' + t('action_compare') + '</button>');
    h.push('<button class="btn ghost" data-copy="' + item.key + '">' + t('copy_link') + '</button>');
    var whUrl = item.wowheadId
      ? 'https://www.wowhead.com/wotlk/ru/item=' + item.wowheadId
      : 'https://www.wowhead.com/wotlk/ru/search?q=' + encodeURIComponent(item.name);
    h.push('<a class="btn ghost" target="_blank" rel="noopener" href="' + whUrl + '">' +
      (item.wowheadId ? t('wowhead_open') : t('wowhead_search')) + '</a>');
    h.push('</div>');
    h.push('</div></div>');
    h.push('</div></div>');

    /* тултип предмета как в игре */
    h.push('<div class="panel"><div class="panel-head"><h3>' + (state.lang === 'ru' ? 'Тултип предмета' : 'Item tooltip') + '</h3></div>');
    h.push('<div class="panel-body" style="display:flex;justify-content:center">' + itemTooltip(item, { wide: true }) + '</div></div>');

    var diffHtml = equippedDiff(item);
    if (diffHtml) h.push(diffHtml);

    /* названия */
    h.push('<div class="panel"><div class="panel-head"><h3>' + t('names_title') + '</h3></div><div class="panel-body">');
    h.push('<dl class="kv">');
    h.push('<dt>' + t('name_db') + '</dt><dd>' + esc(item.name) + '</dd>');
    if (item.nameRuServer) h.push('<dt>' + t('name_ru_server') + '</dt><dd>' + esc(item.nameRuServer) + '</dd>');
    if (item.nameRu) h.push('<dt>' + t('name_wowhead_ru') + '</dt><dd>' + esc(item.nameRu) + '</dd>');
    h.push('<dt>' + t('name_wowhead_en') + '</dt><dd>' + esc(item.nameEnOfficial || item.name) + '</dd>');
    h.push('<dt>' + (state.lang === 'ru' ? 'Совпадение' : 'Match') + '</dt><dd>' +
      (item.match === 'id' ? t('name_matched_id') : item.match === 'name' ? t('name_matched_name') : t('name_custom')) + '</dd>');
    h.push('</dl>');
    if (item.descriptionRu && state.lang === 'ru') {
      h.push('<p class="small muted">' + t('desc_ru_hint') + ': ' + esc(item.descriptionRu) + '</p>');
    }
    if (item.entryConflict) {
      h.push('<div class="note warn small"><b>' + esc(t('entry_conflict_title')) + ' </b>' +
        esc(t('entry_conflict_text')
          .replace('{entry}', String(item.entryConflict.entry))
          .replace('{name}', item.entryConflict.nameEn + (item.entryConflict.nameRu ? ' / ' + item.entryConflict.nameRu : ''))) +
        '</div>');
      if (!item.qc) h.push('<div class="note small">' + esc(t('entry_conflict_hint')) + '</div>');
    }
    h.push('</div></div>');
    h.push('</div>');

    /* правая колонка — вкладки */
    h.push('<div class="panel"><div class="panel-body">');
    h.push('<div class="tabs">');
    [['summary', 'tab_summary'], ['spells', 'tab_spells'], ['set', 'tab_set'], ['params', 'tab_params']]
      .forEach(function (tb) {
        h.push('<button class="tab' + (state.itemTab === tb[0] ? ' active' : '') + '" data-tab="' + tb[0] + '">' + t(tb[1]) + '</button>');
      });
    h.push('</div>');
    h.push('<div id="tab-body">' + itemTabBody(item) + '</div>');
    h.push('</div></div>');

    h.push('</div>');
    return h.join('');
  }

  function itemTabBody(item) {
    var lang = state.lang;
    var h = [];
    if (state.itemTab === 'summary') {
      h.push('<div class="summary-grid" style="margin-bottom:14px">');
      h.push(cell(t('item_level'), num(item.ilvl)));
      h.push(cell(t('requires_level'), item.reqLevel ? num(item.reqLevel) : '—'));
      if (item.armor) h.push(cell(t('armor_label'), num(item.armor)));
      if (item.damage.length) h.push(cell(t('dps'), num(itemDps(item), 1)));
      if (item.durability) h.push(cell(t('durability'), num(item.durability)));
      if (item.sellPrice) h.push(cell(t('sell_price'), money(item.sellPrice)));
      h.push('</div>');

      if (item.stats.length) {
        var max = Math.max.apply(null, item.stats.map(function (s) { return s.v; })) || 1;
        h.push('<h4>' + t('stat_total') + '</h4><div class="stat-bars" style="margin-bottom:14px">');
        item.stats.slice().sort(function (a, b) { return b.v - a.v; }).forEach(function (s) {
          h.push('<div class="stat-bar"><span>' + esc(statName(s.t)) + '</span>' +
            '<span class="track"><span class="fill" style="width:' + Math.round(s.v / max * 100) + '%"></span></span>' +
            '<span class="val">' + num(s.v) + '</span></div>');
        });
        h.push('</div>');
      }

      var flags = itemFlagsList(item);
      if (flags.length) {
        h.push('<h4>' + (lang === 'ru' ? 'Особые свойства' : 'Special properties') + '</h4><div class="badge-row">');
        flags.forEach(function (f) { h.push('<span class="badge">' + esc(f) + '</span>'); });
        h.push('</div>');
      }
      h.push('<h4>' + (lang === 'ru' ? 'Итоги' : 'Details') + '</h4>');
      h.push('<dl class="kv">');
      h.push('<dt>' + t('col_type') + '</dt><dd>' + esc(className(item)) + ' — ' + esc(subclassName(item)) + '</dd>');
      h.push('<dt>' + t('col_slot') + '</dt><dd>' + esc(slotName(item)) + '</dd>');
      h.push('<dt>' + (lang === 'ru' ? 'Привязка' : 'Binding') + '</dt><dd>' +
        esc((I.BONDING[lang] || I.BONDING.ru)[item.bonding] || '—') + '</dd>');
      h.push('<dt>' + t('buy_price') + '</dt><dd>' + (item.buyPrice ? money(item.buyPrice) : '—') + '</dd>');
      h.push('<dt>' + t('display_id') + '</dt><dd>' + item.displayid + (item.icon ? ' (' + esc(item.icon) + ')' : '') + '</dd>');
      h.push('</dl>');
    }

    if (state.itemTab === 'spells') {
      if (!item.spells.length) {
        h.push('<div class="muted">' + (lang === 'ru' ? 'У предмета нет спецэффектов.' : 'No spell effects.') + '</div>');
      } else {
        item.spells.forEach(function (s, idx) {
          var spell = spellById(s.id);
          h.push('<div class="spell-card">');
          h.push('<div class="spell-head">' + spellIcon(spell, 'lg') + '<div>');
          h.push('<div class="trigger">' + esc(triggerLabel(s.trigger)) + '</div>');
          if (spell) {
            h.push('<div class="sname">' + esc(spellName(spell)) + (spellRank(spell) ? ' <span class="muted small">(' + esc(spellRank(spell)) + ')</span>' : '') + '</div>');
          } else {
            h.push('<div class="sname">#' + s.id + '</div>');
          }
          h.push('</div></div>');
          if (spell) {
            h.push('<div class="stext">' + esc(spellText(spell)) + '</div>');
            h.push('<div class="smeta">');
            h.push('<span>#' + s.id + '</span>');
            if (s.cooldown > 0) h.push('<span>' + t('cooldown') + ': ' + durationText(s.cooldown) + '</span>');
            if (s.charges) h.push('<span>' + t('charges') + ': ' + s.charges + '</span>');
            if (s.ppm) h.push('<span>' + t('ppm') + ': ' + num(s.ppm, 1) + '</span>');
            if (spell.duration_ms > 0) h.push('<span>' + t('duration') + ': ' + durationText(spell.duration_ms) + '</span>');
            if (spell.proc_chance && spell.proc_chance < 101) h.push('<span>' + t('proc_chance') + ': ' + spell.proc_chance + '%</span>');
            h.push('</div>');
            /* второй язык для полноты */
            var other = lang === 'ru' ? 'en' : 'ru';
            var otherName = spell.name[other] || '';
            var otherText = spell.text[other] || '';
            if (otherName || otherText) {
              h.push('<div class="muted small" style="margin-top:6px;border-top:1px solid rgba(120,140,165,.18);padding-top:6px">' +
                '<b>' + esc(otherName) + '</b> — ' + esc(otherText) + '</div>');
            }
            h.push('<div style="margin-top:6px"><a target="_blank" rel="noopener" href="https://www.wowhead.com/wotlk/ru/spell=' +
              s.id + '">' + (lang === 'ru' ? 'Заклинание на Wowhead' : 'Spell on Wowhead') + ' →</a></div>');
          }
          h.push('</div>');
        });
      }
    }

    if (state.itemTab === 'set') {
      var set = item.set ? setById(item.set) : null;
      if (!set) {
        h.push('<div class="muted">' + (lang === 'ru' ? 'Предмет не входит в комплект.' : 'Item is not part of a set.') + '</div>');
      } else {
        h.push('<h4>' + esc(set.name[lang] || set.name.en || '') + '</h4>');
        h.push('<p class="muted small">' + t('set_items') + ' (' + set.items.length + ')</p>');
        h.push('<div class="badge-row">');
        set.items.forEach(function (iid) {
          var it = itemById(iid);
          if (it) {
            h.push('<span class="badge ' + qClass(it.quality) + '" style="cursor:pointer" data-open="' + it.key + '">' +
              esc(displayName(it)) + '</span>');
          } else {
            h.push('<span class="badge">#' + iid + '</span>');
          }
        });
        h.push('</div>');
        h.push('<h4 style="margin-top:14px">' + t('set_bonuses') + '</h4>');
        if (!set.bonuses.length) h.push('<div class="muted">—</div>');
        set.bonuses.forEach(function (b) {
          var txt = b.text[lang] || b.text.en || '';
          var bSpell = spellById(b.spell);
          h.push('<div class="spell-card"><div class="spell-head">' + spellIcon(bSpell, 'lg') + '<div>' +
            '<div class="trigger">(' + b.threshold + ') ' + esc(t('tab_set')) + '</div>' +
            '<div class="sname">' + esc(spellName(bSpell) || ('#' + b.spell)) + '</div></div></div>' +
            '<div class="stext">' + esc(txt || ('#' + b.spell)) + '</div>' +
            '<div class="smeta"><a target="_blank" rel="noopener" href="https://www.wowhead.com/wotlk/ru/spell=' + b.spell + '">spell=' + b.spell + '</a></div></div>');
        });
      }
    }

    if (state.itemTab === 'params') {
      h.push('<p class="muted small">' + t('params_hint') + '</p>');
      h.push('<table class="data"><thead><tr><th>' + t('param_col') + '</th><th>' + t('param_value') + '</th><th>' + t('param_meaning') + '</th></tr></thead><tbody>');
      var meta = item.meta;
      Object.keys(meta).forEach(function (key) {
        if (I.isParamSkipped(key)) return;
        var value = meta[key];
        var desc = I.PARAM_DESC[key];
        var meaning = '';
        if (key === 'class' || key === 'subclass' || key === 'InventoryType' || key === 'Quality' || key === 'bonding') {
          meaning = '';
        }
        h.push('<tr><td class="code">' + esc(key) + '</td><td>' + esc(String(value)) + '</td><td class="param">' +
          (desc ? esc(desc[state.lang === 'ru' ? 0 : 1]) : '') + (meaning ? esc(meaning) : '') + '</td></tr>');
      });
      /* спецэффекты и статы тоже строками */
      item.stats.forEach(function (s, i) {
        h.push('<tr><td class="code">stat_type' + (i + 1) + '</td><td>' + s.t + '</td><td class="param">' + esc(statName(s.t)) + '</td></tr>');
        h.push('<tr><td class="code">stat_value' + (i + 1) + '</td><td>' + num(s.v) + '</td><td class="param">' + esc(t('stat_value')) + '</td></tr>');
      });
      item.spells.forEach(function (s, i) {
        h.push('<tr><td class="code">spellid_' + (i + 1) + '</td><td>' + s.id + '</td><td class="param">' +
          esc(spellName(spellById(s.id))) + '</td></tr>');
        h.push('<tr><td class="code">spelltrigger_' + (i + 1) + '</td><td>' + s.trigger + '</td><td class="param">' +
          esc(t(TRIGGERS[s.trigger] || 'trigger_use')) + '</td></tr>');
        if (s.cooldown) h.push('<tr><td class="code">spellcooldown_' + (i + 1) + '</td><td>' + s.cooldown + '</td><td class="param">' +
          esc(durationText(s.cooldown)) + '</td></tr>');
      });
      item.sockets.forEach(function (c, i) {
        h.push('<tr><td class="code">socketColor_' + (i + 1) + '</td><td>' + c + '</td><td class="param">' +
          esc(((I.SOCKET[c] || {})[state.lang] || '')) + '</td></tr>');
      });
      h.push('</tbody></table>');
    }
    return h.join('');
  }

  function cell(k, v) {
    return '<div class="summary-cell"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div></div>';
  }

  /* --------------------------------- кукла -------------------------------- */

  function itemSlotKey(item) {
    for (var key in SLOT_ACCEPTS) {
      if (SLOT_ACCEPTS[key].indexOf(item.inventoryType) >= 0) return key;
    }
    return null;
  }

  function equipItem(id, slotKey) {
    var item = itemById(id);
    if (!item) return;
    if (item.inventoryType === 17) {
      /* двуручное оружие занимает и правую, и левую руку */
      delete state.char.equipped.offhand;
    }
    var target = slotKey || itemSlotKey(item);
    if (!target) { toast(t('no_slot')); return; }
    if (!SLOT_ACCEPTS[target] || SLOT_ACCEPTS[target].indexOf(item.inventoryType) < 0) target = itemSlotKey(item);
    if (!target) { toast(t('no_slot')); return; }
    /* если занимаем правую руку двуручным — освобождаем левую */
    if (target === 'mainhand' && item.inventoryType === 17) delete state.char.equipped.offhand;
    if (target === 'offhand') {
      var mh = state.char.equipped.mainhand;
      if (mh) {
        var mhItem = itemById(mh);
        if (mhItem && mhItem.inventoryType === 17) { toast(t('incompatible')); return; }
      }
    }
    state.char.equipped[target] = id;
    saveState();
    toast(displayName(item) + ' → ' + (state.lang === 'ru' ? 'надето' : 'equipped'));
    render();
  }

  function unequip(slotKey) {
    delete state.char.equipped[slotKey];
    saveState();
    render();
  }

  function aggregate() {
    var sum = { stats: {}, armor: 0, resist: {}, ilvl: 0, count: 0, dps: 0 };
    Object.keys(state.char.equipped).forEach(function (key) {
      var item = itemById(state.char.equipped[key]);
      if (!item) return;
      sum.count++;
      sum.ilvl += item.ilvl;
      sum.armor += item.armor || 0;
      item.stats.forEach(function (s) { sum.stats[s.t] = (sum.stats[s.t] || 0) + s.v; });
      Object.keys(item.resist || {}).forEach(function (k) { sum.resist[k] = (sum.resist[k] || 0) + item.resist[k]; });
      if (key === 'mainhand') sum.dps = itemDps(item);
    });
    sum.avgIlvl = sum.count ? sum.ilvl / sum.count : 0;
    return sum;
  }

  function viewDoll() {
    var agg = aggregate();
    var lang = state.lang;
    var h = [];
    h.push('<div class="doll-layout">');

    /* кукла */
    h.push('<div class="panel"><div class="panel-head"><h2>' + t('doll_title') + '</h2>' +
      '<span class="muted small">' + t('doll_slots') + ': ' + agg.count + '</span>' +
      '<span class="spacer"></span><button class="btn tiny ghost" id="doll-clear">' + t('doll_clear') + '</button></div>');
    h.push('<div class="doll">');
    DOLL_LAYOUT.forEach(function (slot) {
      var itemId = state.char.equipped[slot.key];
      var item = itemById(itemId);
      h.push('<div class="doll-slot' + (item ? ' filled' : '') + (item && !compatible(item) ? ' warn' : '') +
        '" data-slot="' + slot.key + '">');
      if (item) {
        h.push(iconFrame(item, 'sm'));
        h.push('<div style="min-width:0"><div class="slot-label">' + esc(lang === 'ru' ? slot.ru : slot.en) + '</div>' +
          '<div class="slot-item ' + qClass(item.quality) + '">' + esc(displayName(item)) + '</div>' +
          '<div class="muted small">' + t('item_level') + ' ' + num(item.ilvl) + '</div></div>');
        h.push('<button class="remove" data-unequip="' + slot.key + '" title="' + t('action_unequip') + '">×</button>');
      } else {
        h.push('<div style="min-width:0"><div class="slot-label">' + esc(lang === 'ru' ? slot.ru : slot.en) + '</div>' +
          '<div class="empty-hint">' + t('doll_empty') + '</div></div>');
      }
      h.push('</div>');
    });
    h.push('</div>');
    h.push('<div class="panel-body muted small" style="border-top:1px solid var(--line-soft)">' + t('doll_hint') + '</div>');
    h.push('</div>');

    /* сводка */
    h.push('<div style="display:grid;gap:16px">');
    h.push('<div class="panel"><div class="panel-head"><h3>' + t('tab_sim') + '</h3></div><div class="panel-body">');
    h.push('<div class="summary-grid">');
    h.push(cell(t('stat_item_level'), num(agg.avgIlvl, 1)));
    h.push(cell(t('stat_armor'), num(agg.armor)));
    h.push(cell(t('stat_dps'), num(agg.dps, 1)));
    h.push(cell((state.lang === 'ru' ? 'Выносливость' : 'Stamina'), num(agg.stats[7] || 0)));
    h.push(cell(t('stat_stamina_hp'), num((agg.stats[7] || 0) * 10)));
    h.push(cell((state.lang === 'ru' ? 'Сила заклинаний' : 'Spell Power'), num(agg.stats[45] || 0)));
    h.push(cell((state.lang === 'ru' ? 'Сила атаки' : 'Attack Power'), num(agg.stats[38] || 0)));
    h.push('</div>');

    /* персонаж */
    h.push('<h4 style="margin-top:16px">' + (lang === 'ru' ? 'Виртуальный персонаж' : 'Virtual character') + '</h4>');
    h.push('<div class="filters">');
    h.push('<div class="filter"><label>' + t('char_class') + '</label><select class="input" id="char-class">' +
      '<option value="0">' + esc(t('char_none')) + '</option>');
    (lang === 'ru' ? I.CLASS_MASK : I.CLASS_MASK_EN).forEach(function (nm, i) {
      h.push('<option value="' + (i + 1) + '"' + (state.char.cls === i + 1 ? ' selected' : '') + '>' + esc(nm) + '</option>');
    });
    h.push('</select></div>');
    h.push('<div class="filter"><label>' + t('char_race') + '</label><select class="input" id="char-race">' +
      '<option value="0">' + esc(t('char_none')) + '</option>');
    (lang === 'ru' ? I.RACE_MASK : I.RACE_MASK_EN).forEach(function (nm, i) {
      h.push('<option value="' + (i + 1) + '"' + (state.char.race === i + 1 ? ' selected' : '') + '>' + esc(nm) + '</option>');
    });
    h.push('</select></div>');
    h.push('<div class="filter narrow"><label>' + t('char_level') + '</label><input class="input" id="char-level" type="number" min="1" max="80" value="' + state.char.level + '"></div>');
    h.push('<div class="filter"><label>&nbsp;</label><button class="btn" id="doll-link">' + t('doll_save') + '</button></div>');
    h.push('</div>');
    h.push('</div></div>');

    var progress = setProgress();
    if (progress.length) {
      h.push('<div class="panel"><div class="panel-head"><h3>' + t('set_progress') + '</h3></div><div class="panel-body">');
      progress.forEach(function (p) {
        var nm = p.set.name[state.lang] || p.set.name.en || '';
        var activeNames = p.set.bonuses.filter(function (b) { return p.count >= b.threshold; })
          .map(function (b) { return b.text[state.lang] || b.text.en; }).filter(Boolean);
        h.push('<div style="margin-bottom:10px"><div><b class="' + (activeNames.length ? 'q5' : '') + '">' + esc(nm) + '</b> ' +
          '<span class="muted small">' + p.count + ' / ' + p.total + '</span></div>');
        p.set.bonuses.forEach(function (b) {
          var active = p.count >= b.threshold;
          h.push('<div class="small" style="color:' + (active ? 'var(--good)' : 'var(--text-dim)') + '">' +
            spellIcon(spellById(b.spell), 'sm') + '(' + b.threshold + ') ' +
            esc(b.text[state.lang] || b.text.en || '') + (active ? ' ✓' : '') + '</div>');
        });
        h.push('</div>');
      });
      h.push('</div></div>');
    }

    /* характеристики */
    h.push('<div class="panel"><div class="panel-head"><h3>' + t('stat_total') + '</h3></div><div class="panel-body">');
    if (!agg.count) {
      h.push('<div class="muted">' + t('stat_no_items') + '</div>');
    } else {
      var keys = Object.keys(agg.stats).map(Number).sort(function (a, b) { return agg.stats[b] - agg.stats[a]; });
      var max = agg.stats[keys[0]] || 1;
      h.push('<div class="stat-bars">');
      keys.forEach(function (k) {
        h.push('<div class="stat-bar"><span>' + esc(statName(k)) + '</span>' +
          '<span class="track"><span class="fill" style="width:' + Math.round(agg.stats[k] / max * 100) + '%"></span></span>' +
          '<span class="val">' + num(agg.stats[k]) + '</span></div>');
      });
      h.push('</div>');
      var resRows = Object.keys(agg.resist).filter(function (k) { return agg.resist[k]; });
      if (resRows.length) {
        h.push('<h4 style="margin-top:16px">' + t('stat_resist') + '</h4><div class="badge-row">');
        resRows.forEach(function (k) {
          h.push('<span class="badge">+' + num(agg.resist[k]) + ' ' +
            (lang === 'ru' ? I.RESIST.ru[k].toLowerCase() : I.RESIST.en[k]) + '</span>');
        });
        h.push('</div>');
      }
    }
    h.push('</div></div>');
    h.push('</div>');
    h.push('</div>');
    return h.join('');
  }

  /* ------------------------------- сравнение ------------------------------ */

  function compareItems() {
    return state.compare.map(function (id) {
      return itemById(id);
    }).filter(Boolean);
  }

  function viewCompare() {
    var items = compareItems();
    var lang = state.lang;
    var h = [];
    h.push('<div class="panel"><div class="panel-head"><h2>' + t('compare_title') + '</h2>' +
      '<span class="spacer"></span>' +
      (items.length ? '<button class="btn tiny ghost" id="cmp-clear">' + t('action_clear') + '</button>' : '') +
      '</div>');
    if (!items.length) {
      h.push('<div class="compare-empty">' + t('compare_none') + '<br><span class="small">' + t('compare_hint') + '</span></div></div>');
      return h.join('');
    }
    var statIds = {};
    items.forEach(function (it) { it.stats.forEach(function (s) { statIds[s.t] = true; }); });

    function row(label, fn, opts) {
      opts = opts || {};
      var values = items.map(fn);
      var nums = values.map(function (v) { return typeof v === 'number' ? v : NaN; });
      var best = NaN;
      if (opts.numeric) {
        best = Math.max.apply(null, nums.filter(function (n) { return !isNaN(n); }).concat([-Infinity]));
      }
      var cellsHtml = items.map(function (it, i) {
        var isBest = opts.numeric && !isNaN(nums[i]) && nums[i] === best && best !== -Infinity &&
          nums.filter(function (n) { return n === best; }).length < items.length;
        var v = values[i];
        var content = (v === null || v === undefined || v === '') ? '—' : v;
        return '<td' + (isBest ? ' class="best"' : '') + '>' + (typeof content === 'string' && content.charAt(0) === '<' ? content : esc(String(content))) + '</td>';
      }).join('');
      return '<tr><td class="param">' + esc(label) + '</td>' + cellsHtml + '</tr>';
    }

    h.push('<div class="compare-scroll"><table class="compare"><thead><tr><th>' + t('compare_param') + '</th>');
    items.forEach(function (it) {
      h.push('<th><div class="item-cell" data-open="' + it.key + '">' + iconFrame(it, 'sm') +
        '<div><div class="' + qClass(it.quality) + '" style="font-weight:600">' + esc(displayName(it)) + '</div>' +
        '<div class="muted small">#' + it.id + '</div></div></div></th>');
    });
    h.push('</tr></thead><tbody>');
    h.push(row(t('item_level'), function (it) { return it.ilvl; }, { numeric: true }));
    h.push(row(t('filter_quality'), function (it) { return qualityName(it.quality); }));
    h.push(row(t('col_slot'), function (it) { return slotName(it); }));
    h.push(row(t('col_type'), function (it) { return subclassName(it); }));
    h.push(row(t('requires_level'), function (it) { return it.reqLevel || '—'; }));
    h.push(row(t('armor_label'), function (it) { return it.armor || 0; }, { numeric: true }));
    h.push(row(t('dps'), function (it) { return itemDps(it) ? num(itemDps(it), 1) : '—'; }, { numeric: false }));
    h.push(row(t('speed'), function (it) { return it.delay ? num(it.delay / 1000, 2) : '—'; }));
    Object.keys(statIds).map(Number).sort(function (a, b) { return a - b; }).forEach(function (sid) {
      h.push(row(statName(sid), function (it) {
        var s = it.stats.filter(function (x) { return x.t === sid; })[0];
        return s ? s.v : 0;
      }, { numeric: true }));
    });
    h.push(row(t('sockets'), function (it) {
      if (!it.sockets.length) return '—';
      return '<span style="display:inline-flex;gap:3px">' + it.sockets.map(function (c) {
        return '<span class="gem ' + (SOCKET_CSS[c] || 'meta') + '"></span>';
      }).join('') + '</span>';
    }));
    h.push(row(t('set_bonus'), function (it) {
      var nm = it.socketBonusName ? (it.socketBonusName[lang] || it.socketBonusName.en) : '';
      return nm || '—';
    }));
    h.push(row(t('spells_effects'), function (it) {
      return it.spells.length ? it.spells.map(function (s) {
        var sp = spellById(s.id);
        return '<div>' + spellIcon(sp, 'sm') + '<span class="muted small">' + esc(triggerLabel(s.trigger)) + ':</span> ' +
          esc(spellText(sp) || spellName(sp)) + '</div>';
      }).join('') : '—';
    }));
    h.push(row(t('tab_set'), function (it) {
      if (!it.set) return '—';
      var st = setById(it.set);
      return st ? (st.name[lang] || st.name.en || '') : '—';
    }));
    h.push(row(t('sell_price'), function (it) { return it.sellPrice ? money(it.sellPrice) : '—'; }));
    h.push(row((lang === 'ru' ? 'Название на Wowhead' : 'Wowhead name'), function (it) {
      return it.nameRu || it.nameEnOfficial || t('name_custom');
    }));
    h.push('</tbody></table></div></div>');
    return h.join('');
  }

  /* ------------------------------- «О базе» ------------------------------- */

  function viewAbout() {
    var lang = state.lang;
    var h = [];
    h.push('<div class="panel"><div class="panel-head"><h2>' + t('about_title') + '</h2></div><div class="panel-body">');
    if (lang === 'ru') {
      h.push('<p>Сайт построен по дампу таблицы <b class="code">item_template</b> игрового мира Wonder WoW ' +
        '(структура YDBC/YTDB ниже 600) для World of Warcraft 3.3.5a. Все предметы базы разобраны построчно: ' +
        'характеристики, урон, броня, сопротивления, гнёзда, комплекты, требования по классу, расе и уровню, ' +
        'цены, прочность, флаги и полный набор полей записи.</p>');
      h.push('<p>Спецэффекты предметов (использование, надевание, срабатывание при попадании) показаны не номерами заклинаний, ' +
        'а их названиями и описаниями из клиента 3.3.5a — с подстановкой значений эффектов, длительности, периодичности и ' +
        'перезарядки. Под каждой записью сохранён и идентификатор заклинания.</p>');
      h.push('<p>Названия предметов сопоставлены с базой Wowhead: рядом с названием из базы сервера выводится русское и ' +
        'английское название с Wowhead. Для предметов, которых нет в базе Wowhead (собственный контент сервера), ' +
        'об этом указано прямо.</p>');
      h.push('<p>Сокет-бонусы расшифрованы по таблице наложений клиента, иконки берутся по номеру модели предмета.</p>');
    } else {
      h.push('<p>This site is generated from an <b class="code">item_template</b> dump of the Wonder WoW realm ' +
        '(YDBC/YTDB structure below 600) for World of Warcraft 3.3.5a. Every record is parsed: stats, damage, armor, ' +
        'resistances, sockets, sets, class/race/level requirements, prices, durability, flags and the complete field list.</p>');
      h.push('<p>Item effects (on use, on equip, chance on hit) are shown with spell names and descriptions taken from the ' +
        '3.3.5a client, with effect values, duration, tick rate and cooldown substituted. The raw spell id is kept for each entry.</p>');
      h.push('<p>Item names are matched against Wowhead so that the Russian and English Wowhead names appear next to the ' +
        'server database name. Items that do not exist on Wowhead (custom realm content) are marked as such.</p>');
    }
    h.push('<div class="summary-grid" style="margin-top:16px">');
    h.push(cell(t('items_total'), num(DB.items.length)));
    h.push(cell(t('spells_total'), num(Object.keys(DB.spells).length)));
    h.push(cell(t('sets_total'), num(Object.keys(DB.sets).length)));
    h.push(cell(state.lang === 'ru' ? 'Файл дампа' : 'Dump file', '<span class="small">' + esc(DB.source.fileName) + '</span>'));
    if (QC) h.push(cell(t('qc_total'), num(QC.items.length)));
    SECTION_KEYS.forEach(function (k) {
      if (SECTIONS[k]) h.push(cell(t(SECTION_DEFS[k].titleKey), num(SECTIONS[k].items.length)));
    });
    h.push('</div>');
    if (QC) {
      h.push('<h4 style="margin-top:18px">' + t('qc_title') + '</h4>');
      h.push('<p class="small">' + t('qc_about') + '</p>');
      h.push('<p class="small"><a href="' + esc('#/qc') + '">' + t('qc_open') + '</a> · ' +
        '<a href="sql/qc131.sql">' + t('qc_dump_link') + '</a></p>');
      if (QC.source.note) h.push('<p class="small muted">' + esc(QC.source.note) + '</p>');
    }
    SECTION_KEYS.forEach(function (k) {
      var def = SECTION_DEFS[k];
      var data = SECTIONS[k];
      h.push('<h4 style="margin-top:18px">' + t(def.titleKey) + '</h4>');
      h.push('<p class="small">' + t(def.aboutKey) + '</p>');
      if (data) {
        h.push('<p class="small">' + t('sec_total') + ': ' + num(data.items.length) + ' · ' +
          '<a href="' + esc('#/' + k) + '">' + t('sec_open') + '</a> · ' +
          '<a href="' + esc(data.dumpFile) + '">' + t('sec_dump_link') + '</a></p>');
        if (data.source.note) h.push('<p class="small muted">' + esc(data.source.note) + '</p>');
      } else {
        /* дамп доступен и без пароля: он лежит в репозитории открыто */
        h.push('<p class="small muted">' + t('lock_hint_locked') + '. <a href="' + esc('#/' + k) + '">' +
          t('lock_title_short') + '</a> · <a href="' + esc(def.dumpFile) + '">' + t('sec_dump_link') +
          '</a></p>');
      }
    });
    h.push('<h4 style="margin-top:18px">' + t('sources') + '</h4>');
    h.push('<ul class="small">');
    if (lang === 'ru') {
      h.push('<li>Дамп таблицы <b>item_template</b> — <a href="sql/item_template.sql">скачать sql-файл</a>.</li>');
      h.push('<li>Названия и описания заклинаний, названия комплектов и бонусов гнёзд — из справочников клиента 3.3.5a (enUS и ruRU).</li>');
      h.push('<li>Русские и английские названия предметов — сверка с базой Wowhead.</li>');
      h.push('<li>Иконки — по номерам моделей предметов (ItemDisplayInfo).</li>');
    } else {
      h.push('<li>The <b>item_template</b> dump — <a href="sql/item_template.sql">download the sql file</a>.</li>');
      h.push('<li>Spell names/descriptions, set names and socket bonus names from the 3.3.5a client data (enUS and ruRU).</li>');
      h.push('<li>Russian and English item names cross-checked against Wowhead.</li>');
      h.push('<li>Icons resolved from item display ids (ItemDisplayInfo).</li>');
    }
    h.push('</ul>');
    h.push('</div></div>');
    return h.join('');
  }

  /* --------------------------- всплывающая подсказка ---------------------- */

  var tooltipEl = null;
  var pickerEl = null;
  var tooltipKey = '';        /* что сейчас показано — чтобы не перерисовывать разметку зря */
  var tooltipAnchor = null;   /* узел, под курсором которого всплыла подсказка */
  var hoverMuted = null;      /* точка клика: после нажатия подсказка ждёт, пока курсор сдвинется */

  function itemById(key) {
    return ITEMS_BY_KEY[String(key)] || null;
  }

  function isQcKey(key) { return String(key).indexOf(QC_PREFIX) === 0; }
  function isPublicKey(key) { return String(key).indexOf(SECTION_DEFS.public.prefix) === 0; }

  /* загруженные запароленные разделы (Public, WoWDM) */
  function sectionList() {
    return SECTION_KEYS.map(function (k) { return SECTIONS[k]; }).filter(Boolean);
  }

  /* предметы всех загруженных баз — для куклы и сравнения */
  function allItems() {
    return (DB ? DB.items : [])
      .concat(QC ? QC.items : [])
      .concat(sectionList().reduce(function (acc, s) { return acc.concat(s.items); }, []));
  }

  function showTooltip(html, event, key) {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'hover-tooltip';
      document.body.appendChild(tooltipEl);
    }
    if (key !== tooltipKey) {
      tooltipEl.innerHTML = html;
      tooltipKey = key;
    }
    tooltipEl.classList.add('show');
    positionTooltip(event);
  }

  function positionTooltip(event) {
    if (!tooltipEl) return;
    var pad = 16;
    var rect = tooltipEl.getBoundingClientRect();
    var x = event.clientX + pad;
    var y = event.clientY + pad;
    if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - 8) y = Math.max(8, window.innerHeight - rect.height - 8);
    tooltipEl.style.left = Math.max(8, x) + 'px';
    tooltipEl.style.top = Math.max(8, y) + 'px';
  }

  function hideTooltip() {
    tooltipKey = '';
    tooltipAnchor = null;
    if (tooltipEl) tooltipEl.classList.remove('show');
  }

  /* клик прячет подсказку и не даёт ей всплыть, пока курсор не сдвинется:
     браузер после перерисовки DOM под курсором повторяет события наведения */
  function muteHover(event) {
    hoverMuted = { x: (event && event.clientX) || 0, y: (event && event.clientY) || 0 };
    hideTooltip();
  }

  /* ближайший узел, для которого показывается подсказка, либо null */
  function hoverTarget(node) {
    if (!node || !node.closest) return null;
    return node.closest('[data-open], .doll-slot');
  }

  function hoveredItem(node) {
    if (node.classList.contains('doll-slot')) {
      var key = node.getAttribute('data-slot');
      return itemById(state.char.equipped[key]);
    }
    var raw = node.getAttribute('data-open');
    return raw ? itemById(raw) : null;
  }

  /* один обработчик наведения на весь документ: узлы перерисовываются,
     слушатели на них навешивать нельзя — иначе превью «залипает» */
  function handleHover(event) {
    if (hoverMuted) {
      var dx = event.clientX - hoverMuted.x;
      var dy = event.clientY - hoverMuted.y;
      if (dx * dx + dy * dy < 25) { hideTooltip(); return; }
      hoverMuted = null;
    }
    var node = hoverTarget(event.target);
    if (!node) { hideTooltip(); return; }
    if (node === tooltipAnchor && tooltipEl && tooltipEl.classList.contains('show')) {
      positionTooltip(event);
      return;
    }
    var item = hoveredItem(node);
    if (!item) { hideTooltip(); return; }
    tooltipAnchor = node;
    showTooltip(itemTooltip(item), event, 'item:' + item.id + ':' + state.lang);
  }

  function toast(message) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 1800);
  }

  /* --------------------------- выбранный слот куклы ----------------------- */

  function openSlotPicker(slotKey) {
    var accepts = SLOT_ACCEPTS[slotKey] || [];
    var list = allItems().filter(function (it) { return accepts.indexOf(it.inventoryType) >= 0; });
    closePicker();
    pickerEl = document.createElement('div');
    pickerEl.className = 'panel';
    pickerEl.style.cssText = 'position:fixed;z-index:85;top:90px;left:50%;transform:translateX(-50%);width:min(760px,92vw);max-height:70vh;overflow:auto;';
    var h = [];
    h.push('<div class="panel-head"><h3>' + t('equip_in_slot') + ': ' + esc(slotLabel(slotKey)) + '</h3>' +
      '<span class="spacer"></span><button class="btn tiny ghost" data-close-picker="1">×</button></div>');
    h.push('<div class="toolbar"><input class="input" id="picker-q" type="search" placeholder="' + esc(t('search_placeholder')) + '"></div>');
    h.push('<table class="items-table"><tbody id="picker-body"></tbody></table>');
    pickerEl.innerHTML = h.join('');
    document.body.appendChild(pickerEl);

    function paint(query) {
      var q = (query || '').toLowerCase();
      var body = [];
      list.filter(function (it) {
        if (!q) return true;
        return (it.name + ' ' + (it.nameRu || '') + ' ' + it.id).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 60).forEach(function (it) {
        body.push('<tr><td><div class="item-cell" data-pick="' + it.key + '">' + iconFrame(it, 'sm') +
          '<div><div class="item-name ' + qClass(it.quality) + '">' + esc(displayName(it)) + '</div>' +
          '<div class="item-sub">' + t('item_level') + ' ' + num(it.ilvl) + ' · ' + esc(subclassName(it)) + '</div></div></div></td></tr>');
      });
      var bodyEl = pickerEl.querySelector('#picker-body');
      if (bodyEl) bodyEl.innerHTML = body.join('') || '<tr><td class="muted">' + t('nothing_found') + '</td></tr>';
    }
    paint('');
    var input = pickerEl.querySelector('#picker-q');
    if (input) {
      input.focus();
      input.addEventListener('input', function () { paint(input.value); });
    }
    pickerEl.addEventListener('click', function (e) {
      var pick = e.target.closest('[data-pick]');
      if (pick) {
        equipItem(pick.getAttribute('data-pick'), slotKey);
        closePicker();
        return;
      }
      if (e.target.closest('[data-close-picker]')) closePicker();
    });
  }

  function closePicker() {
    if (pickerEl) { pickerEl.remove(); pickerEl = null; }
  }

  function slotLabel(key) {
    var found = DOLL_LAYOUT.filter(function (s) { return s.key === key; })[0];
    return found ? (state.lang === 'ru' ? found.ru : found.en) : key;
  }

  /* ------------------------------- события -------------------------------- */

  function bindViewEvents() {
    var view = document.getElementById('view');

    /* поиск и фильтры каталога */
    var qInput = view.querySelector('#f-q');
    if (qInput) {
      qInput.addEventListener('input', debounce(function () {
        state.filters.q = qInput.value;
        state.limit = 80;
        render();
        var again = document.getElementById('f-q');
        if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
      }, 220));
    }
    /* запароленные разделы: ввод пароля и повторная блокировка */
    var lock = view.querySelector('#lock-form');
    if (lock) {
      var mode = lock.getAttribute('data-mode');
      lock.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('lock-pass');
        var msg = document.getElementById('lock-msg');
        if (!input) return;
        if (input.value.trim() === SECTION_PASSWORD) {
          if (msg) msg.textContent = t('lock_ok');
          unlockSection(mode).then(function () {
            paintStatic();
            render();
          }).catch(function () {
            if (msg) msg.textContent = t('error_load');
          });
        } else {
          if (msg) msg.textContent = t('lock_error');
          input.classList.add('error');
          setTimeout(function () { input.classList.remove('error'); }, 600);
          input.select();
        }
      });
      var pass = document.getElementById('lock-pass');
      if (pass) pass.focus();
    }
    var lockOut = view.querySelector('#sec-lock-out');
    if (lockOut) {
      lockOut.addEventListener('click', function () {
        var key = lockOut.getAttribute('data-mode');
        lockSection(key);
        navigate({ view: key });
      });
    }

    var sortSel = view.querySelector('#f-sort');
    if (sortSel) sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(); });

    [['f-class', 'itemClass'], ['f-slot', 'slot'], ['f-quality', 'quality']].forEach(function (pair) {
      var el = view.querySelector('#' + pair[0]);
      if (el) {
        el.addEventListener('change', function () {
          state.filters[pair[1]] = el.value;
          if (pair[0] === 'f-class') state.filters.subclass = '';
          state.limit = 80;
          render();
        });
      }
    });
    var subSel = view.querySelector('#f-subclass');
    if (subSel) {
      subSel.addEventListener('change', function () {
        var v = subSel.value;
        if (!v) { state.filters.subclass = ''; }
        else {
          var parts = v.split('|');
          state.filters.itemClass = parts[0];
          state.filters.subclass = parts[1];
        }
        render();
      });
    }
    [['f-ilvl-min', 'ilvlMin'], ['f-ilvl-max', 'ilvlMax']].forEach(function (pair) {
      var el = view.querySelector('#' + pair[0]);
      if (el) el.addEventListener('change', function () { state.filters[pair[1]] = el.value; render(); });
    });
    [['f-set', 'set'], ['f-spells', 'spells'], ['f-sockets', 'sockets']].forEach(function (pair) {
      var el = view.querySelector('#' + pair[0]);
      if (el) el.addEventListener('change', function () { state.filters[pair[1]] = el.checked; render(); });
    });
    var resetBtn = view.querySelector('#f-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.filters = { q: '', itemClass: '', subclass: '', slot: '', quality: '', ilvlMin: '', ilvlMax: '', set: false, spells: false, sockets: false };
        render();
      });
    }
    var more = view.querySelector('#more');
    if (more) more.addEventListener('click', function () { state.limit += 120; render(); });

    /* смена параметров персонажа */
    ['char-class', 'char-race', 'char-level'].forEach(function (id) {
      var el = view.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('change', function () {
        if (id === 'char-class') state.char.cls = parseInt(el.value, 10) || 0;
        if (id === 'char-race') state.char.race = parseInt(el.value, 10) || 0;
        if (id === 'char-level') state.char.level = parseInt(el.value, 10) || 80;
        saveState();
        render();
      });
    });
  }

  /* ------------------- постоянные обработчики (один раз) ------------------ */

  function bindGlobalEvents() {
    var view = document.getElementById('view');

    /* вкладки предмета и кнопки внутри вида: слушатель живёт на #view,
       который перерисовывается, поэтому навешивается ровно один раз */
    view.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        state.itemTab = tab.getAttribute('data-tab');
        var item = parseHash();
        if (item.view === 'item') {
          document.getElementById('tab-body').innerHTML = itemTabBody(itemById(item.id));
          view.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === tab); });
        }
        return;
      }
      var open = e.target.closest('[data-open]');
      if (open) { navigate({ view: 'item', id: open.getAttribute('data-open') }); return; }
      var eq = e.target.closest('[data-equip]');
      if (eq) { equipItem(eq.getAttribute('data-equip')); return; }
      var un = e.target.closest('[data-unequip]');
      if (un) { unequip(un.getAttribute('data-unequip')); return; }
      var cmp = e.target.closest('[data-cmp]');
      if (cmp) { addCompare(cmp.getAttribute('data-cmp')); return; }
      var cp = e.target.closest('[data-copy]');
      if (cp) { copyItemLink(cp.getAttribute('data-copy')); return; }
      var slot = e.target.closest('[data-slot]');
      if (slot) { openSlotPicker(slot.getAttribute('data-slot')); return; }
      if (e.target.closest('#doll-clear')) { state.char.equipped = {}; saveState(); render(); return; }
      if (e.target.closest('#cmp-clear')) { state.compare = []; saveState(); render(); return; }
      if (e.target.closest('#doll-link')) {
        copyText(location.origin + location.pathname + dollHash());
        return;
      }
      var cc = e.target.closest('#char-class');
      if (cc) return;
    });

  }

  function debounce(fn, ms) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  function addCompare(id) {
    if (state.compare.indexOf(id) >= 0) { toast(t('in_compare')); return; }
    if (state.compare.length >= 4) { toast(t('compare_full')); return; }
    state.compare.push(id);
    saveState();
    updateNav();
    toast(t('added_to_compare'));
  }

  function copyText(text) {
    var done = function () { toast(t('link_copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) { /* ничего не делаем */ }
    ta.remove();
    done();
  }

  function copyItemLink(key) {
    var item = itemById(key);
    if (!item) return;
    var url = location.origin + location.pathname + '#/item/' + item.key;
    copyText('[' + displayName(item) + '] ' + url);
  }

  function dollHash() {
    var parts = [];
    Object.keys(state.char.equipped).forEach(function (k) { parts.push(k + '=' + state.char.equipped[k]); });
    return '#/doll' + (parts.length ? '?' + parts.join('&') : '');
  }

  /* ----------------------------- состояние -------------------------------- */

  function saveState() {
    try {
      localStorage.setItem('armory.state', JSON.stringify({
        lang: state.lang, compare: state.compare, char: state.char, sort: state.sort
      }));
    } catch (err) { /* хранилище может быть недоступно */ }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem('armory.state');
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.lang) state.lang = s.lang;
      if (s.compare) state.compare = s.compare.map(String);
      if (s.char) {
        state.char = s.char;
        var eq = {};
        Object.keys(state.char.equipped || {}).forEach(function (k) { eq[k] = String(state.char.equipped[k]); });
        state.char.equipped = eq;
      }
      if (s.sort) state.sort = s.sort;
    } catch (err) { /* игнорируем повреждённое состояние */ }
    /* ссылка на куклу в адресе имеет приоритет */
    var hash = location.hash || '';
    var qpos = hash.indexOf('?');
    if (qpos > 0 && hash.indexOf('#/doll') === 0) {
      var params = hash.slice(qpos + 1).split('&');
      state.char.equipped = {};
      params.forEach(function (p) {
        var kv = p.split('=');
        if (kv.length === 2) state.char.equipped[kv[0]] = String(kv[1]);
      });
    }
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status + ' ' + url);
      return r.json();
    });
  }

  /* --- запароленные разделы: данные читаются только после ввода пароля ---
     Разделы независимы: у каждого свой файл, свои ключи предметов и своя отметка «открыт». */

  function sectionUnlocked(key) {
    var def = SECTION_DEFS[key];
    if (!def) return false;
    try { return localStorage.getItem(def.flag) === '1'; } catch (err) { return false; }
  }

  function setSectionFlag(key, on) {
    var def = SECTION_DEFS[key];
    if (!def) return;
    try {
      if (on) localStorage.setItem(def.flag, '1');
      else localStorage.removeItem(def.flag);
    } catch (err) { /* хранилище может быть недоступно */ }
  }

  /* Загружает раздел, если он ещё не загружен; отметка «открыт» ставится сразу */
  function loadSection(key) {
    var def = SECTION_DEFS[key];
    if (!def) return Promise.resolve(null);
    if (SECTIONS[key]) return Promise.resolve(SECTIONS[key]);
    return fetchJson(def.file).then(function (db) {
      db.dumpFile = def.dumpFile || db.dumpFile || ('sql/' + key + '.sql');
      db.sectionKey = key;
      SECTIONS[key] = db;
      indexItems();
      syncLockedUi();
      return SECTIONS[key];
    });
  }

  function unlockSection(key) {
    setSectionFlag(key, true);
    return loadSection(key);
  }

  function lockSection(key) {
    SECTIONS[key] = null;
    setSectionFlag(key, false);
    indexItems();
    syncLockedUi();
  }

  /* Кнопки разделов: закрытый раздел помечен замком, открытый — обычный */
  function syncLockedUi() {
    SECTION_KEYS.forEach(function (k) {
      var def = SECTION_DEFS[k];
      var btn = document.getElementById(def.nav);
      if (!btn) return;
      var open = sectionUnlocked(k) && !!SECTIONS[k];
      btn.classList.toggle('locked', !open);
      btn.setAttribute('title', open ? t('lock_hint_open') : t('lock_hint_locked'));
      btn.setAttribute('aria-disabled', open ? 'false' : 'true');
    });
  }

  /* Предметы всех баз в одном справочнике: ключ основной базы — id,
     отдельных дампов — qc + id и pub + id, поэтому совпадающие entry не перезаписывают друг друга. */
  function indexItems() {
    ITEMS_BY_KEY = {};
    SPELLS = {};
    SETS = {};
    (DB ? DB.items : []).forEach(function (it) {
      it.key = String(it.id);
      ITEMS_BY_KEY[it.key] = it;
    });
    SPELLS = (QC && QC.spells) || {};
    if (QC) {
      QC.items.forEach(function (it) {
        it.key = QC_PREFIX + it.id;
        it.qc = true;
        ITEMS_BY_KEY[it.key] = it;
      });
      Object.keys(QC.spells || {}).forEach(function (id) { SPELLS[id] = QC.spells[id]; });
      Object.keys(QC.sets || {}).forEach(function (id) { SETS[id] = QC.sets[id]; });
    }
    sectionList().forEach(function (src) {
      var def = SECTION_DEFS[src.sectionKey];
      src.items.forEach(function (it) {
        it.key = def.prefix + it.id;
        it.sectionKey = def.key;
        ITEMS_BY_KEY[it.key] = it;
      });
      Object.keys(src.spells || {}).forEach(function (id) { SPELLS[id] = src.spells[id]; });
      Object.keys(src.sets || {}).forEach(function (id) { SETS[id] = src.sets[id]; });
    });
    if (DB) {
      Object.keys(DB.spells || {}).forEach(function (id) { SPELLS[id] = DB.spells[id]; });
      Object.keys(DB.sets || {}).forEach(function (id) { SETS[id] = DB.sets[id]; });
    }
  }

  /* --------------------------------- запуск ------------------------------- */

  function boot() {
    loadState();

    /* переключатель языка */
    document.querySelectorAll('.lang-switch button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.lang === btn.getAttribute('data-lang')) return;
        state.lang = btn.getAttribute('data-lang');
        try { localStorage.setItem('armory.lang', state.lang); } catch (err) { /* недоступно */ }
        saveState();
        paintStatic();
        render();
      });
    });
    paintLangSwitch();
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { navigate({ view: btn.getAttribute('data-view') }); });
    });
    window.addEventListener('hashchange', render);
    bindGlobalEvents();

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideTooltip(); closePicker(); }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        var input = document.getElementById('f-q');
        if (input) { e.preventDefault(); input.focus(); }
      }
    });

    /* превью предмета: наведение и гашение подсказки — на уровне документа,
       потому что разметку вида render() заменяет целиком */
    document.addEventListener('mousemove', handleHover);
    document.addEventListener('pointerdown', muteHover, true);
    document.addEventListener('click', function () { hideTooltip(); });
    document.addEventListener('mouseleave', hideTooltip);
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) hideTooltip();   /* курсор ушёл за пределы окна */
    });
    window.addEventListener('blur', hideTooltip);
    window.addEventListener('scroll', hideTooltip, true);

    /* отдельные дампы необязательны: если файла нет, сайт работает на остальных наборах */
    Promise.all([
      fetchJson('data/db.json'),
      fetchJson(QC_FILE).catch(function () { return null; })
    ].concat(SECTION_KEYS.map(function (k) {
      if (!sectionUnlocked(k)) return Promise.resolve(null);
      return fetchJson(SECTION_DEFS[k].file)
        .then(function (db) {
          db.dumpFile = 'sql/' + k + '.sql';
          db.sectionKey = k;
          return db;
        })
        .catch(function () { return null; });
    }))).then(function (res) {
      DB = res[0];
      QC = res[1];
      SECTION_KEYS.forEach(function (k, i) {
        SECTIONS[k] = res[2 + i];
        if (!SECTIONS[k]) setSectionFlag(k, false);   /* файла нет — раздел остаётся закрытым */
      });
      indexItems();
      /* без файла отдельного дампа кнопка не нужна */
      var qcBtn = document.getElementById('nav-qc');
      if (qcBtn && !QC) qcBtn.style.display = 'none';
      paintStatic();
      render();
    }).catch(function (err) {
      document.getElementById('view').innerHTML =
        '<div class="panel panel-body">' + t('error_load') + '<br><span class="muted small">' +
        esc(String(err && err.message || err)) + '</span></div>';
    });
  }

  function paintStatic() {
    var map = {
      '#site-title': t('siteTitle'),
      '#site-subtitle': t('siteSubtitle'),
      '#nav-catalog': t('nav_catalog'),
      '#nav-doll': t('nav_doll'),
      '#nav-compare': t('nav_compare'),
      '#nav-qc': t('nav_qc'),
      '#nav-public': t('nav_public'),
      '#nav-wowdm': t('nav_wowdm'),
      '#nav-about': t('nav_about')
    };
    Object.keys(map).forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.textContent = map[sel];
    });
    var footer = document.querySelector('#footer-note');
    if (footer) footer.textContent = t('footer_note');
    document.title = t('siteTitle') + ' — ' + t('siteSubtitle');
    document.documentElement.lang = state.lang;
    paintLangSwitch();
    syncLockedUi();
  }

  /* подсветка текущего языка в переключателе */
  function paintLangSwitch() {
    document.querySelectorAll('.lang-switch button').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === state.lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
