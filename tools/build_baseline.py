#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Эталон стандартной базы YTDB для сравнения: entry -> {name, ilvl, sig}.

sig — отпечаток «наполнения» записи (класс/подкласс, статы, урон, броня,
спеллы, сокеты и т.д.): если у записи из внешнего дампа тот же entry, что
и в YTDB, но другой sig, значит статы/наполнение переписаны под сервер.

Использование: build_baseline.py <полный дамп YTDB.sql> <выход.json>
Разбор строк делает тот же парсер, что и основная сборка (build_data.py).
"""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data  # noqa: E402

SIG_FIELDS = (
    ['class', 'subclass', 'name', 'displayid', 'Quality', 'Flags', 'InventoryType',
     'AllowableClass', 'AllowableRace', 'ItemLevel', 'RequiredLevel', 'StatsCount']
    + ['stat_type%d' % i for i in range(1, 11)]
    + ['stat_value%d' % i for i in range(1, 11)]
    + ['dmg_min1', 'dmg_max1', 'dmg_type1', 'dmg_min2', 'dmg_max2', 'dmg_type2',
       'armor', 'block', 'delay', 'itemset', 'socketBonus', 'bonding', 'description']
    + ['socketColor_%d' % i for i in range(1, 4)]
    + ['spellid_%d' % i for i in range(1, 6)]
    + ['spelltrigger_%d' % i for i in range(1, 6)]
)


def norm(v):
    # mysqldump-дампы заключают числа в кавычки ('28'), обычные дампы — нет;
    # без приведения числовых строк к числам отпечаток не совпадёт никогда
    if isinstance(v, str):
        s = v.strip()
        try:
            return int(s)
        except ValueError:
            pass
        try:
            f = float(s)
            return int(f) if f == int(f) else f
        except ValueError:
            pass
        return s.lower()
    if isinstance(v, float) and v == int(v):
        v = int(v)
    return v


def row_sig(row):
    parts = []
    for f in SIG_FIELDS:
        if f in row:
            parts.append('%s=%r' % (f, norm(row.get(f))))
    return hashlib.md5('|'.join(parts).encode('utf-8')).hexdigest()[:16]


def main():
    src, out = sys.argv[1], sys.argv[2]
    # parse_item_sql не различает таблицы: в полном дампе мира нужны только
    # строки собственно item_template (у них есть ItemLevel и name)
    rows = [r for r in build_data.parse_item_sql(src)
            if 'ItemLevel' in r and 'name' in r]
    best = {}
    for row in rows:
        try:
            entry = int(str(row.get('entry')))
        except (TypeError, ValueError):
            continue
        # в полном дампе entry повторяются частичными апдейтами (пара колонок) —
        # эталоном должна быть самая полная запись, а не последняя
        if entry not in best or len(row) > len(best[entry]):
            best[entry] = row
    base = {}
    for entry, row in best.items():
        base[entry] = {
            'name': row.get('name', ''),
            'ilvl': row.get('ItemLevel', 0),
            'sig': row_sig(row),
        }
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(base, fh, ensure_ascii=False)
    print('baseline entries:', len(base), '->', out)


if __name__ == '__main__':
    main()
