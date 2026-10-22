#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сборка раздела Dump из скана папок Proton Drive (dumps/_inbox/<шара>/items).

Кандидаты сканера (записи item_template, которых нет в эталоне YTDB либо чьё
имя/уровень/статы отличаются) раскладываются по подразделам — по папке или
архиву происхождения («как ветка в проводнике»: Корень / Папка / Архив).
Для каждого подраздела пишутся:
  * sql/dump/<slug>.sql  — строки, приведённые к текущему формату колонок
    (139 колонок sql/item_template.sql; алиасы Flags2->FlagsExtra,
    unk0->SoundOverrideSubclass, duration->Duration, WDBVerified->VerifiedBuild);
  * data/dump/<slug>.json — датасет сайта тем же конвейером, что остальные разделы;
  * data/dump/index.json  — список подразделов для страницы раздела.

Запуск: KAEV_DIR=... RURU_DBC_DIR=... WOWDUMPS_DIR=... python3 tools/build_dump.py
"""
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data  # noqa: E402

INBOX = 'dumps/_inbox'
OUT_SQL_DIR = 'sql/dump'
OUT_DATA_DIR = 'data/dump'

ALIASES = {
    'Flags2': 'FlagsExtra',
    'unk0': 'SoundOverrideSubclass',
    'duration': 'Duration',
    'WDBVerified': 'VerifiedBuild',
}
ARCHIVE_RE = re.compile(r'\.(zip|rar|7z|tar|tgz|tar\.gz|sql\.gz)\.x$', re.I)


def container_of(rel):
    """Путь контейнера-источника внутри шары: папка (до 2 уровней) или архив."""
    parts = [p for p in rel.split('/') if p]
    root, rest = (parts[0], parts[1:]) if parts else ('', [])
    for i, part in enumerate(rest):
        if ARCHIVE_RE.search(part):
            return root, rest[:i] + [part[:-2]]
    if len(rest) >= 3:
        return root, rest[:2]
    if len(rest) >= 2:
        return root, rest[:1]
    if len(rest) == 1:
        return root, rest[:1]
    return root, []


def map_aliases(row):
    out = {}
    for k, v in row.items():
        nk = ALIASES.get(k, k)
        if nk not in out:
            out[nk] = v
    return out


def sql_value(v):
    if v is None:
        return '0'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, float)):
        return repr(v) if isinstance(v, float) else str(v)
    s = str(v).replace('\\', '\\\\').replace("'", "\\'")
    return "'%s'" % s


def main():
    canon = build_data.canonical_columns()
    if not canon:
        raise SystemExit('не удалось получить канонический список колонок')
    text_cols = {'name', 'description', 'ScriptName'}

    subs = {}  # (share_label, root, container_str) -> {'rows': {entry: row}, 'files': set()}
    shares = sorted(d for d in os.listdir(INBOX)
                    if os.path.isdir(os.path.join(INBOX, d)) and not d.startswith('_'))
    for label in shares:
        items_dir = os.path.join(INBOX, label, 'items')
        if not os.path.isdir(items_dir):
            continue
        for fn in sorted(os.listdir(items_dir)):
            if not fn.endswith('.jsonl'):
                continue
            with open(os.path.join(items_dir, fn), encoding='utf-8') as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    rec = json.loads(line)
                    rel = rec.get('file') or fn
                    root, cont = container_of(rel)
                    key = (label, root, ' / '.join(cont))
                    sub = subs.setdefault(key, {'rows': {}, 'files': set(), 'reasons': {}})
                    sub['files'].add(rel)
                    row = map_aliases(rec.get('row') or {})
                    try:
                        entry = int(float(str(row.get('entry'))))
                    except (TypeError, ValueError):
                        continue
                    row['entry'] = entry
                    # дубли entry внутри подраздела: побеждает запись с большим числом полей
                    old = sub['rows'].get(entry)
                    if old is None or len(row) > len(old):
                        sub['rows'][entry] = row
                    for r in rec.get('reasons') or []:
                        sub['reasons'][r] = sub['reasons'].get(r, 0) + 1

    os.makedirs(OUT_SQL_DIR, exist_ok=True)
    os.makedirs(OUT_DATA_DIR, exist_ok=True)
    index = []
    total = 0
    for (label, root, cont), sub in sorted(subs.items(), key=lambda kv: (kv[0][1], kv[0][2])):
        rows = [sub['rows'][e] for e in sorted(sub['rows'])]
        rows = [r for r in rows if 'ItemLevel' in r or 'itemlevel' in {k.lower() for k in r}]
        if not rows:
            continue
        share_num = label.split('-')[0]
        slug = 'dump%s-%s' % (share_num, hashlib.md5(
            ('%s|%s|%s' % (label, root, cont)).encode('utf-8')).hexdigest()[:6])
        title = root if not cont else '%s / %s' % (root, cont)

        # --- SQL в текущем формате колонок
        sql_path = os.path.join(OUT_SQL_DIR, slug + '.sql')
        with open(sql_path, 'w', encoding='utf-8') as fh:
            fh.write('-- %s\n' % title)
            fh.write('-- Источник: папка Proton Drive «%s» (%s), файлов с предметами: %d\n'
                     % (root, label, len(sub['files'])))
            fh.write('-- Записи item_template, отсутствующие в эталоне YTDB либо отличающиеся\n')
            fh.write('-- от него именем, уровнем предмета или статами; колонки приведены\n')
            fh.write('-- к текущему формату (139 колонок sql/item_template.sql).\n\n')
            head = 'REPLACE INTO `item_template` (%s) VALUES\n' % (
                ', '.join('`%s`' % c for c in canon))
            for i in range(0, len(rows), 100):
                fh.write(head)
                batch = rows[i:i + 100]
                fh.write(',\n'.join(
                    '(%s)' % ', '.join(
                        sql_value(r.get(c, '' if c in text_cols else 0)) for c in canon)
                    for r in batch))
                fh.write(';\n\n')

        # --- датасет сайта
        norm = build_data.normalize_items([dict(r) for r in rows])
        ds = build_data.build_dataset(sql_path, strict_names=True, items=norm, locales={},
                                      extra_source={
                                          'kind': 'dump',
                                          'title': title,
                                          'share': label,
                                          'container': cont,
                                          'note': ('Подраздел раздела Dump: предметы из «%s». '
                                                   'Хранятся отдельно, совпадающие entry ничего '
                                                   'не перезаписывают.' % title),
                                      })
        out_path = os.path.join(OUT_DATA_DIR, slug + '.json')
        build_data.write_dataset(ds, out_path)
        ilvl300 = sum(1 for r in rows if str(r.get('ItemLevel')) in ('300', '300.0'))
        index.append({
            'slug': slug,
            'title': title,
            'share': label,
            'root': root,
            'container': cont,
            'count': len(ds['items']),
            'ilvl300': ilvl300,
            'files': len(sub['files']),
            'file': out_path.replace(os.sep, '/'),
            'sql': sql_path.replace(os.sep, '/'),
        })
        total += len(ds['items'])
        print('%-28s %-60s %5d предм. (ilvl300: %d)' % (slug, title, len(ds['items']), ilvl300))

    with open(os.path.join(OUT_DATA_DIR, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump({'subsections': index, 'total': total}, fh, ensure_ascii=False, indent=1)
    print('ИТОГО подразделов: %d, предметов: %d' % (len(index), total))


if __name__ == '__main__':
    main()
