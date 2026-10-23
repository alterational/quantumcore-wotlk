#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Полный скан одной скачанной папки Proton Drive (ничего не пропускаем).

Что делает по КАЖДОМУ файлу дерева (включая распакованные архивы):
  * строка в inventory.tsv: относительный путь, размер, расширение;
  * текстовые файлы просматриваются на предмет таблиц item_template,
    npc_vendor, creature_template и ключевых слов Antonidas / Ammunae;
  * строки item_template разбираются штатным парсером (build_data.py) и
    сверяются с эталоном YTDB: в items/*.jsonl попадают записи-кандидаты
    (entry нет в YTDB | ItemLevel = 300 | упоминание Antonidas/Ammunae |
    имя, уровень или отпечаток статов отличаются от эталона);
  * все строки npc_vendor -> vendor/*.jsonl (альтершопы ищем по ним);
  * строки creature_template с Antonidas/Ammunae -> creatures/*.jsonl;
  * контексты ключевых слов -> keywords.txt (файл, строка, текст);
  * сводка -> report.md (счётчики по каждому файлу с совпадениями).

Использование:
  scan_proton.py <папка_шары> <выходная_папка> <baseline.json> <метка_шары>
"""
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_data  # noqa: E402
import build_baseline  # noqa: E402

TEXT_EXT = {'.sql', '.txt', '.csv', '.lua', '.xml', '.json', '.md', '.log',
            '.ini', '.cfg', '.conf', '.db', '.dist', '.sh', '.py', '.php'}
ARCHIVE_EXT = {'.zip', '.rar', '.7z', '.gz', '.tgz', '.bz2', '.xz', '.tar'}
KEYWORD_RE = re.compile(r'antonidas|ammunae', re.I)
ITEM_STMT_RE = re.compile(r'(?:INSERT|REPLACE)\s+INTO\s+`?item_template`?', re.I)
VENDOR_STMT_RE = re.compile(r'(?:INSERT|REPLACE)\s+INTO\s+`?npc_vendor`?', re.I)
CREATURE_STMT_RE = re.compile(r'(?:INSERT|REPLACE)\s+INTO\s+`?creature_template`?', re.I)


def is_text(path, ext):
    if ext in TEXT_EXT:
        return True
    try:
        with open(path, 'rb') as fh:
            head = fh.read(8192)
        if b'\x00' in head:
            return False
        return sum(1 for b in head if b >= 9) / max(1, len(head)) > 0.97
    except OSError:
        return False


def safe_name(rel):
    """Безопасное и ГАРАНТИРОВАННО уникальное имя файла для результатов:
    раньше разные кириллические пути схлопывались в одно имя и перезаписывали
    друг друга — теперь к очищенному пути добавляется md5-суффикс."""
    base = re.sub(r'[^A-Za-z0-9_.-]+', '_', rel)[:70].strip('_.') or 'file'
    return '%s_%s' % (base, hashlib.md5(rel.encode('utf-8')).hexdigest()[:8])


def create_table_cols(text, table):
    m = re.search(r'CREATE TABLE(?:\s+IF NOT EXISTS)?\s+`%s`\s*\((.*?)\)\s*ENGINE' % table,
                  text, re.S | re.I)
    if not m:
        return []
    return build_data.table_columns(m.group(1))


def statements_for(text, table):
    """Сегменты выражений INSERT/REPLACE INTO <table> (до следующего выражения)."""
    starts = [m.start() for m in re.finditer(
        r'(?:INSERT|REPLACE)\s+INTO\s+`?%s`?' % table, text, re.I)]
    out = []
    for i, s in enumerate(starts):
        e = starts[i + 1] if i + 1 < len(starts) else len(text)
        out.append(text[s:e])
    return out


def rows_from_segment(seg, fallback_cols_list):
    """Кортежи одного выражения: колонки из самого выражения, иначе — запасные."""
    vpos = seg.upper().find('VALUES')
    if vpos < 0:
        return [], False
    cols = build_data.chunk_columns(seg, vpos)
    used_fallback = False
    if not cols:
        for cand in fallback_cols_list:
            if cand:
                cols = cand
                used_fallback = True
                break
    if not cols:
        return [], False
    rows = []
    for vals in build_data.chunk_rows(seg, vpos):
        if len(vals) != len(cols):
            continue
        row = {}
        for k, v in zip(cols, vals):
            if k not in row:
                row[k] = v
        rows.append(row)
    return rows, used_fallback


def parse_items_fallback(path, text):
    """Разбор item_template без списка колонок (mysqldump VALUES (...)):
    порядок колонок — из CREATE TABLE того же файла или канонический."""
    canon = build_data.canonical_columns()
    fallbacks = [create_table_cols(text, 'item_template'), canon, canon[:-1] if canon else []]
    rows = []
    for seg in statements_for(text, 'item_template'):
        seg_rows, _ = rows_from_segment(seg, fallbacks)
        for row in seg_rows:
            for k in ('name', 'description'):
                if isinstance(row.get(k), str):
                    row[k] = build_data.clean_text(row[k])
            rows.append(row)
    return rows


def parse_table_rows(path, table):
    """Строки таблицы table из SQL-файла штатным построчным парсером."""
    rows_out = []
    try:
        text = open(path, encoding='utf-8', errors='replace').read()
    except OSError:
        return rows_out
    fallbacks = [create_table_cols(text, table)]
    for seg in statements_for(text, table):
        seg_rows, _ = rows_from_segment(seg, fallbacks)
        rows_out.extend(seg_rows)
    return rows_out


def main():
    src_dir, out_dir, baseline_path, label = sys.argv[1:5]
    os.makedirs(out_dir, exist_ok=True)
    for sub in ('items', 'vendor', 'creatures'):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
    with open(baseline_path, encoding='utf-8') as fh:
        baseline = {int(k): v for k, v in json.load(fh).items()}

    inv_lines, report = [], []
    kw_lines = []
    totals = {'files': 0, 'text': 0, 'archives': 0, 'item_files': 0,
              'item_rows': 0, 'candidates': 0, 'standard_skipped': 0,
              'vendor_rows': 0, 'creature_rows': 0, 'keyword_hits': 0,
              'parse_errors': 0}
    hit_files = []

    for root, dirs, files in os.walk(src_dir):
        dirs.sort()
        for name in sorted(files):
            path = os.path.join(root, name)
            rel = os.path.relpath(path, src_dir)
            try:
                size = os.path.getsize(path)
            except OSError:
                continue
            ext = os.path.splitext(name)[1].lower()
            totals['files'] += 1
            if ext in ARCHIVE_EXT:
                totals['archives'] += 1
            inv_lines.append('%s\t%d\t%s' % (rel, size, ext))
            if not is_text(path, ext):
                continue
            totals['text'] += 1
            try:
                text = open(path, encoding='utf-8', errors='replace').read()
            except OSError:
                continue

            # ключевые слова по любым текстовым файлам
            file_kw = 0
            for ln, line in enumerate(text.splitlines(), 1):
                if KEYWORD_RE.search(line):
                    file_kw += 1
                    if len(kw_lines) < 5000:
                        kw_lines.append('%s:%d: %s' % (rel, ln, line.strip()[:400]))
            totals['keyword_hits'] += file_kw

            notes = []
            if file_kw:
                notes.append('ключевых слов: %d' % file_kw)

            if ITEM_STMT_RE.search(text):
                totals['item_files'] += 1
                safe = safe_name(rel)
                try:
                    rows = build_data.parse_item_sql(path)
                    # в полных дампах мира парсер цепляет все таблицы подряд —
                    # нужны только строки item_template
                    rows = [r for r in rows if 'ItemLevel' in r and 'name' in r]
                    if not rows:
                        # дампы без списка колонок (mysqldump VALUES (...))
                        rows = parse_items_fallback(path, text)
                        if rows:
                            notes.append('разбор без списка колонок')
                except Exception as exc:  # парсер не должен ронять скан
                    totals['parse_errors'] += 1
                    rows = []
                    notes.append('ОШИБКА РАЗБОРА: %r' % (exc,))
                cand = []
                for row in rows:
                    try:
                        entry = int(str(row.get('entry')))
                    except (TypeError, ValueError):
                        continue
                    totals['item_rows'] += 1
                    blob = ('%s %s' % (row.get('name', ''), row.get('description', '') or ''))
                    # алиасы схем (mangos Flags2/unk0 против trinity FlagsExtra/...)
                    sig_row = dict(row)
                    for a, b in (('Flags2', 'FlagsExtra'), ('unk0', 'SoundOverrideSubclass'),
                                 ('duration', 'Duration'), ('WDBVerified', 'VerifiedBuild')):
                        if a in sig_row and b not in sig_row:
                            sig_row[b] = sig_row[a]
                    base = baseline.get(entry)
                    ilvl = row.get('ItemLevel')
                    try:
                        ilvl_i = int(float(str(ilvl)))
                    except (TypeError, ValueError):
                        ilvl_i = 0
                    reason = []
                    if base is None:
                        reason.append('нет в YTDB')
                    else:
                        if str(row.get('name', '')) != str(base.get('name', '')):
                            reason.append('имя != YTDB')
                        if ilvl_i != int(base.get('ilvl') or 0):
                            reason.append('ilvl != YTDB')
                        if build_baseline.row_sig(sig_row) != base.get('sig'):
                            reason.append('статы != YTDB')
                    if ilvl_i == 300:
                        reason.append('ItemLevel 300')
                    if KEYWORD_RE.search(blob):
                        reason.append('Antonidas/Ammunae')
                    if reason:
                        cand.append({'entry': entry, 'reasons': reason,
                                     'file': rel, 'row': row})
                    else:
                        totals['standard_skipped'] += 1
                totals['candidates'] += len(cand)
                if cand:
                    with open(os.path.join(out_dir, 'items', safe + '.jsonl'),
                              'w', encoding='utf-8') as fh:
                        for c in cand:
                            fh.write(json.dumps(c, ensure_ascii=False) + '\n')
                notes.append('item_template строк: %d, кандидатов: %d' % (len(rows), len(cand)))

            if VENDOR_STMT_RE.search(text):
                rows = parse_table_rows(path, 'npc_vendor')
                totals['vendor_rows'] += len(rows)
                if rows:
                    safe = safe_name(rel)
                    with open(os.path.join(out_dir, 'vendor', safe + '.jsonl'),
                              'w', encoding='utf-8') as fh:
                        for r in rows:
                            fh.write(json.dumps({'file': rel, 'row': r},
                                                ensure_ascii=False) + '\n')
                    notes.append('npc_vendor строк: %d' % len(rows))

            if CREATURE_STMT_RE.search(text):
                rows = [r for r in parse_table_rows(path, 'creature_template')
                        if KEYWORD_RE.search(json.dumps(r, ensure_ascii=False))]
                totals['creature_rows'] += len(rows)
                if rows:
                    safe = safe_name(rel)
                    with open(os.path.join(out_dir, 'creatures', safe + '.jsonl'),
                              'w', encoding='utf-8') as fh:
                        for r in rows:
                            fh.write(json.dumps({'file': rel, 'row': r},
                                                ensure_ascii=False) + '\n')
                    notes.append('creature_template с ключевыми словами: %d' % len(rows))

            if notes:
                hit_files.append((rel, size, notes))

    with open(os.path.join(out_dir, 'inventory.tsv'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(inv_lines) + '\n')
    with open(os.path.join(out_dir, 'keywords.txt'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(kw_lines) + ('\n' if kw_lines else ''))
    with open(os.path.join(out_dir, 'report.md'), 'w', encoding='utf-8') as fh:
        fh.write('# Скан: %s\n\n' % label)
        for k in ('files', 'text', 'archives', 'item_files', 'item_rows',
                  'candidates', 'standard_skipped', 'vendor_rows',
                  'creature_rows', 'keyword_hits', 'parse_errors'):
            fh.write('- %s: %d\n' % (k, totals[k]))
        fh.write('\n## Файлы с совпадениями\n\n')
        for rel, size, notes in hit_files:
            fh.write('- `%s` (%d Б): %s\n' % (rel, size, '; '.join(notes)))
    print(json.dumps(totals, ensure_ascii=False))


if __name__ == '__main__':
    main()
