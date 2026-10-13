#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка данных для сайта-армори (WotLK 3.3.5a) из SQL-дампа item_template.

Источники (не хранятся в репозитории, задаются переменными окружения):
  KAEV_DIR     - каталог с SQL-дампами клиентских DBC 3.3.5.12340
                 (Spell.sql, ItemSet.sql, ItemDisplayInfo.sql, SpellDuration.sql)
  RURU_DBC_DIR - каталог с бинарными DBC русской версии клиента 3.3.5a (Spell.dbc, ...)
  WOWDUMPS_DIR - каталог с csv-выгрузками itemsparse/itemset/spellname (ruRU и enUS)

На выходе: data/db.json - единый файл данных для веб-приложения.
"""
import csv
import json
import os
import re
import struct
import sys

SQL_PATH = 'sql/item_template.sql'
# отдельный дамп (другая ревизия той же серверной базы) — собирается в свой файл
# и не пересекается с основным: ключи предметов в приложении разведены префиксом
QC_SQL_PATH = os.environ.get('QC_SQL_PATH', 'sql/qc131.sql')
KAEV = os.environ.get('KAEV_DIR', '/tmp/kaev')
RURU_DBC = os.environ.get('RURU_DBC_DIR', '/tmp/ruRU/dbc/ruRU')
WOWDUMPS = os.environ.get('WOWDUMPS_DIR', '/tmp/wowdumps')
OUT = os.environ.get('OUT_PATH', 'data/db.json')
QC_OUT = os.environ.get('QC_OUT_PATH', 'data/qc131.json')

# смещения локализованных строк (локаль 0) в бинарных DBC клиента 3.3.5a
SPELL_DBC_STRINGS = {'name': 144, 'rank': 161, 'description': 178, 'tooltip': 195}


# --------------------------------------------------------------------------
# Парсер SQL-дампа предметов
# --------------------------------------------------------------------------
def tokenize_tuple(t):
    """Разбирает содержимое SQL-кортежа в список значений (поддержка ' и \" кавычек)."""
    out, i, n = [], 0, len(t)
    while i < n:
        c = t[i]
        if c in ' \t\r\n,':
            i += 1
            continue
        if c in "'\"":
            quote = c
            i += 1
            buf = []
            while i < n:
                ch = t[i]
                if ch == '\\':
                    nx = t[i + 1]
                    buf.append({'n': '\n', 'r': '\r', 't': '\t', '0': '\0',
                                '\\': '\\', "'": "'", '"': '"'}.get(nx, nx))
                    i += 2
                    continue
                if ch == quote:
                    if i + 1 < n and t[i + 1] == quote:
                        buf.append(quote)
                        i += 2
                        continue
                    i += 1
                    break
                buf.append(ch)
                i += 1
            out.append(''.join(buf))
            continue
        j = i
        while j < n and t[j] not in ',)':
            j += 1
        raw = t[i:j].strip()
        if raw == 'NULL':
            out.append(None)
        else:
            try:
                out.append(int(raw))
            except ValueError:
                try:
                    out.append(float(raw))
                except ValueError:
                    out.append(raw)
        i = j
    return out


def read_tuple(text, start):
    """Возвращает (срез_кортежа, позиция_закрывающей_скобки) начиная сразу после '('."""
    i, depth, quote, n = start, 0, '', len(text)
    while i < n:
        c = text[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                if i + 1 < n and text[i + 1] == quote:
                    i += 2
                    continue
                quote = ''
        else:
            if c in "'\"":
                quote = c
            elif c == '(':
                depth += 1
            elif c == ')':
                if depth == 0:
                    return text[start:i], i
                depth -= 1
        i += 1
    return text[start:], n


def parse_item_sql(path):
    text = open(path, encoding='utf-8', errors='replace').read()
    chunks = text.split('REPLACE INTO')
    cols, items = None, []
    for ch in chunks[1:]:
        vpos = ch.find('VALUES')
        if vpos < 0:
            continue
        head = ch[:vpos]
        lp, rp = head.find('('), head.rfind(')')
        if cols is None:
            cols = [c.strip(' `') for c in head[lp + 1:rp].split(',')]
        body = ch[vpos + 6:].lstrip()
        tup, _ = read_tuple(body, 1)
        vals = tokenize_tuple(tup)
        if len(vals) != len(cols):
            print('!! arity mismatch', len(vals), len(cols), file=sys.stderr)
            continue
        items.append(dict(zip(cols, vals)))
    return items


def parse_locales_sql(path):
    """Русская локализация предметов (locales_item, locale 8) из того же дампа."""
    out = {}
    if not os.path.exists(path):
        return out
    text = open(path, encoding='utf-8', errors='replace').read()
    for ch in text.split('REPLACE INTO'):
        if 'locales_item' not in ch[:200]:
            continue
        vpos = ch.find('VALUES')
        if vpos < 0:
            continue
        head = ch[:vpos]
        lp, rp = head.find('('), head.rfind(')')
        cols = [c.strip(' `') for c in head[lp + 1:rp].split(',')]
        body = ch[vpos + 6:].lstrip()
        tup, _ = read_tuple(body, 1)
        vals = tokenize_tuple(tup)
        if len(vals) != len(cols):
            continue
        row = dict(zip(cols, vals))
        try:
            entry = int(row['entry'])
        except (KeyError, TypeError, ValueError):
            continue
        out[entry] = {
            'name': (row.get('name_loc8') or '').strip(),
            'description': (row.get('description_loc8') or '').strip(),
        }
    return out


# --------------------------------------------------------------------------
# SQL-дампы DBC
# --------------------------------------------------------------------------
def table_columns(create_body):
    """Список колонок из тела CREATE TABLE (без PRIMARY KEY)."""
    body = re.split(r'PRIMARY KEY', create_body)[0]
    return [c.strip(' `') for c in re.findall(r'`([^`]+)`', body)]


def load_sql_rows(path, table):
    """Читает INSERT INTO `table` VALUES (...) и возвращает список словарей."""
    text = open(path, encoding='utf-8', errors='replace').read()
    m = re.search(r'CREATE TABLE `%s` \((.*?)\) ENGINE' % table, text, re.S)
    if not m:
        return []
    cols = table_columns(m.group(1))
    rows = []
    for mm in re.finditer(r'INSERT INTO `%s` VALUES ' % table, text):
        start = mm.end() + 1
        tup, _ = read_tuple(text, start)
        vals = tokenize_tuple(tup)
        if len(vals) == len(cols):
            rows.append(dict(zip(cols, vals)))
    return rows


# --------------------------------------------------------------------------
# Бинарные DBC
# --------------------------------------------------------------------------
def load_sql_rows_filtered(path, table, ids):
    """Быстро читает только строки с нужными ID (файлы DBC-дампов очень большие)."""
    text = open(path, encoding='utf-8', errors='replace').read()
    m = re.search(r'CREATE TABLE `%s` \((.*?)\) ENGINE' % table, text, re.S)
    if not m:
        return []
    cols = table_columns(m.group(1))
    rows = []
    for sid in sorted(ids):
        for needle in ('VALUES (%d,' % sid, 'VALUES (%d)' % sid):
            pos = text.find(needle)
            if pos < 0:
                continue
            start = pos + len('VALUES (')
            tup, _ = read_tuple(text, start)
            vals = tokenize_tuple(tup)
            if len(vals) == len(cols):
                rows.append(dict(zip(cols, vals)))
            break
    return rows



# Числовые поля Spell.dbc (клиент 3.3.5a) - смещения проверены по официальным данным
SPELL_NUM_FIELDS = {
    'targets': (16, 'u'), 'casting_time': (28, 'u'), 'recovery': (29, 'u'),
    'category_recovery': (30, 'u'), 'proc_chance': (35, 'u'), 'proc_charges': (36, 'u'),
    'duration_index': (40, 'u'), 'stack_amount': (49, 'u'),
    'equipped_class': (68, 'i'), 'equipped_subclass': (69, 'i'), 'equipped_invtypes': (70, 'i'),
    'effect1': (71, 'u'), 'effect2': (72, 'u'), 'effect3': (73, 'u'),
    'die1': (74, 'i'), 'die2': (75, 'i'), 'die3': (76, 'i'),
    'rpl1': (77, 'f'), 'rpl2': (78, 'f'), 'rpl3': (79, 'f'),
    'base1': (80, 'i'), 'base2': (81, 'i'), 'base3': (82, 'i'),
    'targetA1': (86, 'u'), 'targetA2': (87, 'u'), 'targetA3': (88, 'u'),
    'radius1': (92, 'u'), 'radius2': (93, 'u'), 'radius3': (94, 'u'),
    'aura1': (95, 'u'), 'aura2': (96, 'u'), 'aura3': (97, 'u'),
    'amp1': (98, 'u'), 'amp2': (99, 'u'), 'amp3': (100, 'u'),
    'mult1': (101, 'f'), 'mult2': (102, 'f'), 'mult3': (103, 'f'),
    'chain1': (104, 'u'), 'chain2': (105, 'u'), 'chain3': (106, 'u'),
    'misc1': (110, 'i'), 'misc2': (111, 'i'), 'misc3': (112, 'i'),
    'trigger_spell': (116, 'u'),
    'icon': (133, 'u'),
    'name': (144, 's'), 'rank': (161, 's'), 'description': (178, 's'), 'tooltip': (195, 's'),
}


def dbc_records(path, field_map, wanted=None):
    """Читает бинарный DBC и возвращает {id: {field: значение}}."""
    out = {}
    f = open(path, 'rb')
    magic, rc, fc, rs, sbs = struct.unpack('<4sIIII', f.read(20))
    strb_off = 20 + rc * rs
    f.seek(strb_off)
    strb = f.read(sbs)
    f.seek(20)

    def get_str(off):
        if not off or off >= sbs:
            return ''
        e = strb.find(b'\0', off)
        if e < 0:
            return ''
        return strb[off:e].decode('utf-8', errors='replace')

    for i in range(rc):
        rec = f.read(rs)
        sid = struct.unpack_from('<I', rec, 0)[0]
        if wanted is not None and sid not in wanted:
            continue
        row = {}
        for key, (off, typ) in field_map.items():
            if typ == 'f':
                row[key] = struct.unpack_from('<f', rec, off * 4)[0]
            elif typ == 'i':
                row[key] = struct.unpack_from('<i', rec, off * 4)[0]
            elif typ == 's':
                row[key] = get_str(struct.unpack_from('<I', rec, off * 4)[0])
            else:
                row[key] = struct.unpack_from('<I', rec, off * 4)[0]
        out[sid] = row
    return out


def load_spell_icons(path):
    """SpellIcon.dbc: id иконки -> имя ресурса (без пути Interface\\Icons\\)."""
    out = {}
    if not os.path.exists(path):
        return out
    f = open(path, 'rb')
    magic, rc, fc, rs, sbs = struct.unpack('<4sIIII', f.read(20))
    data = f.read(rc * rs)
    strb = f.read(sbs)

    def get(off):
        if not off or off >= sbs:
            return ''
        e = strb.find(b'\0', off)
        return strb[off:e].decode('utf-8', errors='replace') if e > off else ''

    for i in range(rc):
        base = i * rs
        icon_id, tex = struct.unpack_from('<II', data, base)
        name = get(tex).rsplit('\\', 1)[-1].strip().lower()
        if name:
            out[icon_id] = name
    return out


def dbc_strings(path, field_map):
    """Возвращает {id: {field: text}} для указанных полей-строк (локаль 0)."""
    f = open(path, 'rb')
    magic, rc, fc, rs, sbs = struct.unpack('<4sIIII', f.read(20))
    data = f.read(rc * rs)
    strb = f.read(sbs)

    def get(off):
        if not off or off >= sbs:
            return ''
        e = strb.find(b'\0', off)
        if e < 0:
            return ''
        return strb[off:e].decode('utf-8', errors='replace')

    out = {}
    for i in range(rc):
        base = i * rs
        sid = struct.unpack_from('<I', data, base)[0]
        rec = {}
        for key, off in field_map.items():
            v = struct.unpack_from('<I', data, base + off * 4)[0]
            rec[key] = get(v)
        out[sid] = rec
    return out


# --------------------------------------------------------------------------
# Официальные названия предметов / комплектов (ruRU + enUS)
# --------------------------------------------------------------------------
def load_itemsparse_names():
    names = {'ru': {}, 'en': {}}
    for loc, key in (('ruRU', 'ru'), ('enUS', 'en')):
        path = os.path.join(WOWDUMPS, loc, 'itemsparse.csv')
        if not os.path.exists(path):
            continue
        with open(path, newline='', encoding='utf-8') as fh:
            for row in csv.reader(fh):
                try:
                    iid = int(row[0])
                except ValueError:
                    continue
                nm = row[5].strip()
                if nm:
                    names[key][iid] = nm
    return names


def load_setnames():
    names = {'ru': {}, 'en': {}}
    for loc, key in (('ruRU', 'ru'), ('enUS', 'en')):
        path = os.path.join(WOWDUMPS, loc, 'itemset.csv')
        if not os.path.exists(path):
            continue
        with open(path, newline='', encoding='utf-8') as fh:
            r = csv.reader(fh)
            next(r, None)
            for row in r:
                if len(row) > 1 and row[0].isdigit():
                    names[key][int(row[0])] = row[1].strip()
    return names


# --------------------------------------------------------------------------
# Текстовые подстановки в описаниях заклинаний ($s1, $d, $o2, ${...} и т.д.)
# --------------------------------------------------------------------------
PERIODIC_AURAS = {3, 8, 53}  # периодический урон / лечение / мана
AURA_LABELS = {
    'MOD_STAT': 29, 'MOD_ATTACK_POWER': 99, 'MOD_COMBAT_RATING': 189,
}


def duration_text(ms, lang):
    """Длительность в текстовом виде."""
    if not ms:
        return ''
    if ms == -1:
        return 'до отмены' if lang == 'ru' else 'until cancelled'
    sec = ms / 1000.0
    if sec >= 3600 and sec % 3600 == 0:
        n = int(sec / 3600)
        return ('%d ч.' % n) if lang == 'ru' else ('%d hr' % n)
    if sec >= 60 and sec % 60 == 0:
        n = int(sec / 60)
        return ('%d мин.' % n) if lang == 'ru' else ('%d min' % n)
    if sec == int(sec):
        n = int(sec)
        if lang == 'ru':
            if 11 <= n % 100 <= 14 or n % 10 == 0 or n % 10 >= 5:
                return '%d сек.' % n
            if n % 10 == 1:
                return '%d секунду' % n
            return '%d секунды' % n
        return '%d sec' % n
    return ('%s сек.' % ('%.1f' % sec).replace('.', ',')) if lang == 'ru' else ('%.1f sec' % sec)


def spell_effect(spell, k):
    """(эффект, база, стороны, аура, misc) для k-го эффекта."""
    return (int(spell.get('effect%d' % k, 0) or 0),
            int(spell.get('base%d' % k, 0) or 0),
            int(spell.get('die%d' % k, 0) or 0) or 1,
            int(spell.get('aura%d' % k, 0) or 0),
            int(spell.get('misc%d' % k, 0) or 0))


class SpellCtx(object):
    """Разбор значений заклинания для подстановок в текст."""

    def __init__(self, spell, duration_ms, lang, resolver=None):
        self.spell = spell
        self.duration_ms = duration_ms
        self.lang = lang
        self.resolver = resolver or (lambda sid: None)

    # ---- числовые значения эффектов
    def points(self, k):
        eff, base, sides, aura, misc = spell_effect(self.spell, k)
        if not eff and not aura:
            return None, None
        val = base + 1
        if sides > 1:
            return val, val + sides - 1
        return val, val

    def fmt_num(self, x):
        if isinstance(x, float):
            s = ('%.2f' % x).rstrip('0').rstrip('.')
            if s in ('-0', ''):
                s = '0'
        else:
            s = str(int(x))
        if self.lang == 'ru':
            s = s.replace('.', ',')
        return s

    def value(self, key, idx=''):
        """Значение токена $key(idx)."""
        if not idx:
            idx = '1'
        k = int(idx)
        if key in 'sS':
            lo, hi = self.points(k)
            if lo is None:
                return '0'
            return self.fmt_num(lo) if lo == hi else '%s-%s' % (self.fmt_num(lo), self.fmt_num(hi))
        if key in 'mM':
            lo, hi = self.points(k)
            if lo is None:
                return '0'
            return self.fmt_num(hi)
        if key in 'dD':
            return duration_text(self.duration_ms, self.lang)
        if key in 'oO':
            n = self.ticks(k)
            return self.fmt_num(n)
        if key in 'tT':
            amp = int(self.spell.get('amp%d' % k, 0) or 0)
            if amp:
                return self.fmt_num(amp / 1000.0)
            if self.ticks(k) > 1 and self.duration_ms and self.duration_ms > 0:
                return self.fmt_num(self.duration_ms / 1000.0 / self.ticks(k))
            return '0'
        if key in 'xX':
            return self.fmt_num(int(self.spell.get('chain%d' % k, 0) or 0))
        if key in 'uU':
            return self.fmt_num(int(self.spell.get('stack_amount', 1) or 1))
        if key in 'rR':
            return self.fmt_num(self.radius(k))
        if key in 'nN':
            return self.fmt_num(int(self.spell.get('targets', 0) or 0))
        if key in 'hH':
            return ''
        if key in 'aA':
            return self.fmt_num(self.radius(k))
        return ''

    def ticks(self, k):
        eff, base, sides, aura, misc = spell_effect(self.spell, k)
        amp = int(self.spell.get('amp%d' % k, 0) or 0)
        dur = self.duration_ms or 0
        if aura in PERIODIC_AURAS and dur > 0:
            if amp > 0:
                return max(1, int(round(dur / float(amp))))
            return 1
        return 0

    def radius(self, k):
        rid = int(self.spell.get('radius%d' % k, 0) or 0)
        return RADIUS.get(rid, 0)


RADIUS = {}


def eval_expression(expr, ctx):
    """Вычисляет ${$m1/-1000} и похожие выражения."""
    e = re.sub(r'\$(\d+)?([sSmMoOtTuUxXrRnNaA])', lambda m: ctx.value(m.group(2), m.group(1) or '1'), expr)
    if re.search(r'[^0-9+\-*/.,() ]', e):
        return ''
    e = e.replace(',', '.')
    try:
        val = eval(e, {'__builtins__': {}}, {})
    except Exception:
        return ''
    return ctx.fmt_num(round(val, 4))


def plural_form(number, forms):
    """Выбор формы слова: [один, два-четыре, много]."""
    if len(forms) == 1:
        return forms[0]
    if len(forms) == 2:
        return forms[0]
    try:
        n = int(abs(number))
    except (TypeError, ValueError):
        n = 0
    if n % 100 in (11, 12, 13, 14):
        return forms[2]
    d = n % 10
    if d == 1:
        return forms[0]
    if d in (2, 3, 4):
        return forms[1]
    return forms[2]


def render_spell_text(text, ctx):
    if not text:
        return ''
    text = text.replace('@@', '\n')
    if text.strip().isdigit():
        return ''

    # ${выражение}
    text = re.sub(r'\$\{([^{}]*)\}', lambda m: eval_expression(m.group(1), ctx), text)

    # ссылки на другое заклинание: $71905s1, $71904a1, $71905d
    def cross(m):
        sid, key, idx = int(m.group(1)), m.group(2), m.group(3) or '1'
        other = ctx.resolver(sid)
        if not other:
            return ''
        return other.value(key, idx)
    text = re.sub(r'\$(\d{4,})([sSmMoOtTuUxXrRdDaAuUnN])(\d?)', cross, text)

    # $/1000;$s1
    text = re.sub(r'\$/(\d+);\s*\$?([sSmM])(\d?)',
                  lambda m: ctx.fmt_num(float(str(ctx.value(m.group(2), m.group(3) or '1')).split('-')[0]) / float(m.group(1)))
                  if '-' not in str(ctx.value(m.group(2), m.group(3) or '1')) else str(ctx.value(m.group(2), m.group(3) or '1')),
                  text)

    # условные блоки $?x123[текст][иначе]
    text = re.sub(r'\$\?\w+\[([^\]]*)\]', lambda m: m.group(1), text)
    # переменные описаний $<name>
    text = re.sub(r'\$<[^>]+>', '', text)

    # обычные токены: $s1, $m2, $d, $o1, $t2, $u, $x1 ...
    text = re.sub(r'\$([sSmMoOtTuUxXrRnNdDaAhH])(\d*)',
                  lambda m: ctx.value(m.group(1), m.group(2) or '1'), text)

    # $g / $l - выбор формы (по числу перед токеном)
    def plural_sub(m):
        forms = [f for f in (m.group(1), m.group(2), m.group(3)) if f is not None]
        nummatch = re.search(r'(\d[\d ]*)\s*$', text[:m.start()])
        number = nummatch.group(1).replace(' ', '') if nummatch else 0
        return plural_form(number, forms)
    text = re.sub(r'\$[gGlL]([^:;$]*):([^:;$]*)(?::([^:;$]*))?;', plural_sub, text)
    text = re.sub(r'\$[gGlL]([^:;$]*):([^:;$]*);', plural_sub, text)

    # $c/$C, $l/$L, $e
    text = re.sub(r'\$(\d+)?[cCeEwWzZ]', '', text)
    text = re.sub(r'\$\w*', '', text)
    text = text.replace('[', '').replace(']', '')
    text = re.sub(r'(\d+[.,]\d+)\.\d+', r'\1', text)
    text = text.replace('..', '.').replace(' .', '.').replace(' ,', ',')
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def load_radii(path):
    """SpellRadius.dbc -> {id: радиус в ярдах}."""
    out = {}
    if not os.path.exists(path):
        return out
    f = open(path, 'rb')
    magic, rc, fc, rs, sbs = struct.unpack('<4sIIII', f.read(20))
    data = f.read(rc * rs)
    for i in range(rc):
        base = i * rs
        rid = struct.unpack_from('<I', data, base)[0]
        rad = struct.unpack_from('<f', data, base + 4)[0]
        out[rid] = rad
    return out


# --------------------------------------------------------------------------
# Основная сборка
# --------------------------------------------------------------------------
def base_name(name):
    """Название без уточнения в скобках: 'Alarming Clockbot (NOT IN USE)' -> 'alarming clockbot'."""
    return re.sub(r'\s*\([^)]*\)\s*$', '', (name or '')).strip().lower()


def build_dataset(sql_path, extra_source=None, strict_names=False):
    """Собирает данные одного дампа item_template: предметы, заклинания, комплекты."""
    items = parse_item_sql(sql_path)
    items = [i for i in items if 'ItemLevel' in i]
    locales = parse_locales_sql(sql_path)
    print('%s: предметов %d, строк локализации %d'
          % (os.path.basename(sql_path), len(items), len(locales)))

    needed_sets = {int(i['itemset']) for i in items if i.get('itemset')}
    needed_displays = {int(i['displayid']) for i in items if i.get('displayid')}

    linked_spells = set()
    for it in items:
        for k in range(1, 6):
            s = it.get('spellid_%d' % k, 0)
            if s:
                linked_spells.add(int(s))

    # --- заклинания комплектов
    sets_bonus_spells = set()
    set_spells_raw = {}
    p_set = os.path.join(KAEV, 'ItemSet.sql')
    if os.path.exists(p_set):
        for r in load_sql_rows(p_set, 'ItemSet'):
            sid = int(r['ID'])
            bonus = [{'spell': int(r['SetSpellID_%d' % k]), 'threshold': int(r['SetThreshold_%d' % k])}
                     for k in range(1, 9) if r.get('SetSpellID_%d' % k)]
            if sid in needed_sets:
                set_spells_raw[sid] = bonus
                sets_bonus_spells.update(b['spell'] for b in bonus)

    socket_bonus_spells = {int(i['socketBonus']) for i in items if i.get('socketBonus')}
    needed_spells = set(linked_spells) | sets_bonus_spells | socket_bonus_spells

    global RADIUS
    RADIUS = load_radii(os.path.join(RURU_DBC, 'SpellRadius.dbc'))
    print('радиусов заклинаний:', len(RADIUS))

    # --- длительности заклинаний
    durations = {}
    p = os.path.join(KAEV, 'SpellDuration.sql')
    if os.path.exists(p):
        for r in load_sql_rows(p, 'SpellDuration'):
            d = int(r.get('Duration', 0) or 0)
            if d in (-1, 4294967295) or d > 100000000:
                d = -1
            durations[int(r['ID'])] = d
        print('длительностей заклинаний:', len(durations))

    # --- данные заклинаний: англ. тексты из дампа DBC, числа и русские тексты из клиента 3.3.5a
    en_spells = {}
    p = os.path.join(KAEV, 'Spell.sql')
    if os.path.exists(p):
        print('читаю англ. тексты заклинаний ...')
        for r in load_sql_rows_filtered(p, 'Spell', needed_spells):
            en_spells[int(r['ID'])] = r
        print('англ. заклинаний:', len(en_spells))

    def clean(s):
        return (s or '').replace("\\'", "'").replace('\\"', '"').strip()

    spell_dbc = {}
    p = os.path.join(RURU_DBC, 'Spell.dbc')
    if os.path.exists(p):
        spell_dbc = dbc_records(p, SPELL_NUM_FIELDS, needed_spells)
        print('данные клиента по заклинаниям:', len(spell_dbc))

    # --- заклинания, на которые ссылаются тексты ($12345s1)
    REF_RE = re.compile(r'\$(\d{4,})[sSmMoOtTuUxXrRdD]')
    helpers = set()
    for sid, r in list(en_spells.items()):
        for field in ('Description_Lang_enUS', 'AuraDescription_Lang_enUS'):
            for m in REF_RE.finditer(str(r.get(field) or '')):
                helpers.add(int(m.group(1)))
    for sid in list(spell_dbc):
        for field in ('description', 'tooltip'):
            for m in REF_RE.finditer(spell_dbc[sid].get(field) or ''):
                helpers.add(int(m.group(1)))
    helpers -= set(spell_dbc)
    if helpers and os.path.exists(p):
        print('подгружаю связанные заклинания:', len(helpers))
        spell_dbc.update(dbc_records(p, SPELL_NUM_FIELDS, helpers))

    def make_ctx(sid, lang):
        sp = spell_dbc.get(sid, {})
        dur = durations.get(int(sp.get('duration_index', 0) or 0), 0)
        return SpellCtx(sp, dur, lang,
                        resolver=lambda other: make_ctx(other, lang) if other in spell_dbc else None)

    spell_icons = load_spell_icons(os.path.join(RURU_DBC, 'SpellIcon.dbc'))
    if spell_icons:
        print('иконок заклинаний:', len(spell_icons))

    spells_out = {}
    for sid in sorted(needed_spells):
        ru = spell_dbc.get(sid, {})
        en = en_spells.get(sid, {})
        duration = durations.get(int(ru.get('duration_index', 0) or 0), 0)
        en_text_src = clean(en.get('Description_Lang_enUS')) or clean(en.get('AuraDescription_Lang_enUS'))
        ru_text_src = clean(ru.get('description')) or clean(ru.get('tooltip'))
        if not en_text_src:
            en_text_src = ru_text_src
        if not ru_text_src:
            ru_text_src = en_text_src
        spells_out[sid] = {
            'id': sid,
            'icon': spell_icons.get(int(ru.get('icon', 0) or 0), ''),
            'name': {'en': clean(en.get('Name_Lang_enUS')), 'ru': clean(ru.get('name'))},
            'rank': {'en': clean(en.get('NameSubtext_Lang_enUS')), 'ru': clean(ru.get('rank'))},
            'text': {
                'en': render_spell_text(en_text_src, make_ctx(sid, 'en')),
                'ru': render_spell_text(ru_text_src, make_ctx(sid, 'ru')),
            },
            'cooldown_ms': max(0, int(ru.get('recovery', 0) or 0)),
            'gcd_ms': max(0, int(ru.get('category_recovery', 0) or 0)),
            'duration_ms': duration,
            'proc_chance': int(ru.get('proc_chance', 0) or 0),
            'proc_charges': int(ru.get('proc_charges', 0) or 0),
            'targets': int(ru.get('targets', 0) or 0),
        }

    # --- иконки (displayid -> имя ресурса иконки)
    icons = {}
    p = os.path.join(KAEV, 'ItemDisplayInfo.sql')
    if os.path.exists(p):
        print('читаю ItemDisplayInfo.sql ...')
        for r in load_sql_rows_filtered(p, 'ItemDisplayInfo', needed_displays):
            try:
                did = int(r['ID'])
            except (KeyError, TypeError, ValueError):
                continue
            ic = (r.get('InventoryIcon_1') or '').strip()
            if ic:
                icons[did] = ic.lower()
        print('иконок найдено:', len(icons))

    # --- комплекты
    setnames = load_setnames()
    set_spells = set_spells_raw
    set_items = {}
    if os.path.exists(p_set):
        for r in load_sql_rows_filtered(p_set, 'ItemSet', needed_sets):
            set_items[int(r['ID'])] = [int(r['ItemID_%d' % k]) for k in range(1, 18) if r.get('ItemID_%d' % k)]

    sets_out = {}
    for sid in sorted(set(sid for sid in needed_sets)):
        sets_out[sid] = {
            'id': sid,
            'name': {'en': setnames['en'].get(sid, ''), 'ru': setnames['ru'].get(sid, '')},
            'items': set_items.get(sid, []),
            'bonuses': sorted(
                [{'threshold': b['threshold'], 'spell': b['spell'],
                  'text': {lg: spells_out.get(b['spell'], {}).get('text', {}).get(lg, '')
                           for lg in ('en', 'ru')}}
                 for b in set_spells.get(sid, [])],
                key=lambda b: b['threshold']),
        }

    # --- названия бонусов гнёзд (SpellItemEnchantment)
    needed_enchants = {int(i['socketBonus']) for i in items if i.get('socketBonus')}
    enchant_names = {'en': {}, 'ru': {}}
    p = os.path.join(KAEV, 'SpellItemEnchantment.sql')
    if needed_enchants and os.path.exists(p):
        for r in load_sql_rows_filtered(p, 'SpellItemEnchantment', needed_enchants):
            nm = (r.get('Name_Lang_enUS') or '').strip()
            if nm:
                enchant_names['en'][int(r['ID'])] = nm
    p = os.path.join(RURU_DBC, 'SpellItemEnchantment.dbc')
    if needed_enchants and os.path.exists(p):
        ru_enchant = dbc_records(p, {'name': (22, 's')}, needed_enchants)
        for sid, rec in ru_enchant.items():
            if rec.get('name'):
                enchant_names['ru'][sid] = rec['name'].strip()
        del ru_enchant
    print('бонусов гнёзд:', len(enchant_names['en']), len(enchant_names['ru']))

    # --- официальные названия
    official = load_itemsparse_names()
    by_name = {}
    for iid, nm in official['en'].items():
        by_name.setdefault(nm.lower(), iid)

    display_cache = {}
    out_items = []
    for it in items:
        iid = int(it['entry'])
        sql_name = it['name']
        wl_id = None
        match = 'none'
        name_en = official['en'].get(iid, '')
        name_ru = official['ru'].get(iid, '')
        entry_conflict = None
        if strict_names:
            # entry этого дампа мог быть занят другим предметом официальной базы:
            # официальные названия принимаем только при совпадении имени
            if name_en and base_name(name_en) != base_name(sql_name):
                entry_conflict = {'entry': iid, 'nameEn': name_en, 'nameRu': name_ru}
            if name_en and base_name(name_en) == base_name(sql_name):
                wl_id, match = iid, 'id'
            else:
                cand = by_name.get(sql_name.lower())
                cand_en = official['en'].get(cand, '') if cand else ''
                if cand and base_name(cand_en) == base_name(sql_name):
                    wl_id, match = cand, 'name'
                    name_en = cand_en
                    name_ru = official['ru'].get(cand, '')
                else:
                    name_en, name_ru, wl_id, match = '', '', None, 'none'
        elif name_en:
            wl_id, match = iid, 'id'
        else:
            cand = by_name.get(sql_name.lower())
            if cand:
                wl_id, match = cand, 'name'
                name_en = official['en'].get(cand, '')
                name_ru = official['ru'].get(cand, '')
        if name_en and name_en.lower() == sql_name.lower():
            name_en = ''

        # русское название из локализации сервера — отдельным полем:
        # официальное (Wowhead) остаётся в nameRu и не подменяется
        loc = locales.get(iid) or {}
        name_ru_server = loc.get('name', '')
        desc_ru = loc.get('description', '')

        spells = []
        for k in range(1, 6):
            sp = int(it.get('spellid_%d' % k, 0) or 0)
            if not sp:
                continue
            spells.append({
                'id': sp,
                'trigger': int(it.get('spelltrigger_%d' % k, 0) or 0),
                'charges': int(it.get('spellcharges_%d' % k, 0) or 0),
                'ppm': float(it.get('spellppmRate_%d' % k, 0) or 0),
                'cooldown': int(it.get('spellcooldown_%d' % k, 0) or 0),
                'category': int(it.get('spellcategory_%d' % k, 0) or 0),
                'category_cooldown': int(it.get('spellcategorycooldown_%d' % k, 0) or 0),
            })

        stats = []
        for k in range(1, 11):
            st = int(it.get('stat_type%d' % k, 0) or 0)
            sv = int(it.get('stat_value%d' % k, 0) or 0)
            if st and sv:
                stats.append({'t': st, 'v': sv})

        dmg = []
        for k in (1, 2):
            lo = float(it.get('dmg_min%d' % k, 0) or 0)
            hi = float(it.get('dmg_max%d' % k, 0) or 0)
            if hi:
                dmg.append({'min': lo, 'max': hi, 'type': int(it.get('dmg_type%d' % k, 0) or 0)})

        sockets = []
        for k in (1, 2, 3):
            sc = int(it.get('socketColor_%d' % k, 0) or 0)
            if sc:
                sockets.append(sc)

        it_out = {
            'id': iid,
            'name': sql_name,
            'nameEnOfficial': name_en,
            'nameRu': name_ru,
            'wowheadId': wl_id,
            'match': match,
            'quality': int(it['Quality']),
            'ilvl': int(it['ItemLevel']),
            'reqLevel': int(it['RequiredLevel']),
            'class': int(it['class']),
            'subclass': int(it['subclass']),
            'inventoryType': int(it['InventoryType']),
            'bonding': int(it['bonding']),
            'unique': int(it['maxcount'] or 0),
            'stackable': int(it['stackable'] or 0),
            'containerSlots': int(it['ContainerSlots'] or 0),
            'armor': int(it['armor'] or 0),
            'block': int(it['block'] or 0),
            'durability': int(it['MaxDurability'] or 0),
            'buyPrice': int(it['BuyPrice'] or 0),
            'sellPrice': int(it['SellPrice'] or 0),
            'flags': int(it['Flags'] or 0),
            'flagsExtra': int(it['FlagsExtra'] or 0),
            'allowableClass': int(it['AllowableClass']),
            'allowableRace': int(it['AllowableRace']),
            'stats': stats,
            'damage': dmg,
            'delay': int(it['delay'] or 0),
            'rangeMod': float(it['RangedModRange'] or 0),
            'ammoType': int(it['ammo_type'] or 0),
            'resist': {
                'holy': int(it['holy_res'] or 0), 'fire': int(it['fire_res'] or 0),
                'nature': int(it['nature_res'] or 0), 'frost': int(it['frost_res'] or 0),
                'shadow': int(it['shadow_res'] or 0), 'arcane': int(it['arcane_res'] or 0),
            },
            'spells': spells,
            'sockets': sockets,
            'socketBonus': int(it['socketBonus'] or 0),
            'socketBonusName': {
                'en': enchant_names['en'].get(int(it['socketBonus'] or 0), ''),
                'ru': enchant_names['ru'].get(int(it['socketBonus'] or 0), ''),
            },
            'gemProperties': int(it['GemProperties'] or 0),
            'set': int(it['itemset'] or 0),
            'description': (it['description'] or '').strip(),
            'displayid': int(it['displayid'] or 0),
            'material': int(it['Material'] or 0),
            'sheath': int(it['sheath'] or 0),
            'disenchant': int(it['DisenchantID'] or 0),
            'requiredSkill': int(it['RequiredSkill'] or 0),
            'requiredSkillRank': int(it['RequiredSkillRank'] or 0),
            'scalingStatDistribution': int(it['ScalingStatDistribution'] or 0),
            'scalingStatValue': int(it['ScalingStatValue'] or 0),
            'itemLimitCategory': int(it['ItemLimitCategory'] or 0),
            'startQuest': int(it['startquest'] or 0),
            'pageText': int(it['PageText'] or 0),
            'flagsCustom': int(it['flagsCustom'] or 0),
            'verifiedBuild': int(it.get('VerifiedBuild') or 0),
            'icon': icons.get(int(it['displayid'] or 0), ''),
            'meta': {k: v for k, v in it.items() if v not in (0, '', None)},
        }
        if entry_conflict:
            it_out['entryConflict'] = entry_conflict
        if name_ru_server and name_ru_server != name_ru:
            it_out['nameRuServer'] = name_ru_server
        if desc_ru:
            it_out['descriptionRu'] = desc_ru
        out_items.append(it_out)

    source = {
        'fileName': os.path.basename(sql_path),
        'items': len(out_items),
        'generatedFrom': 'item_template (YDBC/YTDB < 600), World of Warcraft 3.3.5a',
    }
    if extra_source:
        source.update(extra_source)
    return {
        'source': source,
        'items': out_items,
        'spells': {str(k): v for k, v in spells_out.items()},
        'sets': {str(k): v for k, v in sets_out.items()},
    }


def write_dataset(db, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(db, fh, ensure_ascii=False, separators=(',', ':'))
    print('записано %s (%.1f КБ): предметов %d, заклинаний %d, комплектов %d'
          % (path, os.path.getsize(path) / 1024.0,
             len(db['items']), len(db['spells']), len(db['sets'])))
    matched = sum(1 for i in db['items'] if i['match'] != 'none')
    print('сопоставлено с официальными названиями: %d из %d' % (matched, len(db['items'])))


def main():
    write_dataset(build_dataset(SQL_PATH), OUT)

    # второй дамп: отдельный файл, свои ключи предметов (префикс qc), старая база не меняется
    if QC_SQL_PATH and os.path.exists(QC_SQL_PATH):
        qc = build_dataset(QC_SQL_PATH, strict_names=True, extra_source={
            'kind': 'qc131',
            'title': 'QC 13.1',
            'separateFrom': os.path.basename(SQL_PATH),
            'note': ('Предметы другой ревизии базы того же сервера '
                     '(Quantum Database Rev 9.8, 30.11.2015). Хранятся отдельно: '
                     'совпадающие entry не перезаписывают предметы основной базы.'),
        })
        qc['sets'] = {k: v for k, v in qc['sets'].items() if k != '0'}
        write_dataset(qc, QC_OUT)


if __name__ == '__main__':
    main()
