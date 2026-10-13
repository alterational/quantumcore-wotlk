import re, json, sys

SQL = 'sql/item_template.sql'

def tokenize_tuple(t):
    """Parse a SQL VALUES tuple into python values."""
    out, i, n = [], 0, len(t)
    while i < n:
        c = t[i]
        if c in ' \t\r\n,':
            i += 1; continue
        if c == "'":
            i += 1; buf = []
            while i < n:
                ch = t[i]
                if ch == '\\':
                    nx = t[i+1]
                    buf.append({'n':'\n','r':'\r','t':'\t','0':'\0','\\':'\\',"'":"'"}[nx] if nx in "nrt0\\'" else nx)
                    i += 2; continue
                if ch == "'":
                    if i+1 < n and t[i+1] == "'":
                        buf.append("'"); i += 2; continue
                    i += 1; break
                buf.append(ch); i += 1
            out.append(''.join(buf)); continue
        j = i
        while j < n and t[j] not in ',)':
            j += 1
        raw = t[i:j].strip()
        if raw == 'NULL': out.append(None)
        else:
            try: out.append(int(raw))
            except ValueError:
                try: out.append(float(raw))
                except ValueError: out.append(raw)
        i = j
    return out

def parse(path):
    text = open(path, encoding='utf-8', errors='replace').read()
    marker = 'REPLACE INTO'
    chunks = text.split(marker)
    cols = None
    items = []
    for ch in chunks[1:]:
        vpos = ch.find('VALUES')
        if vpos < 0: continue
        head = ch[:vpos]
        lp = head.find('('); rp = head.rfind(')')
        cnames = [c.strip(' `') for c in head[lp+1:rp].split(',')]
        if cols is None: cols = cnames
        body = ch[vpos+6:].lstrip()
        assert body[0] == '('
        depth = 0; i = 0; n = len(body); instr = False
        while i < n:
            c = body[i]
            if instr:
                if c == '\\': i += 2; continue
                if c == "'":
                    if i+1 < n and body[i+1] == "'": i += 2; continue
                    instr = False
            else:
                if c == "'": instr = True
                elif c == '(': depth += 1
                elif c == ')':
                    depth -= 1
                    if depth == 0: break
            i += 1
        tup = body[1:i]
        vals = tokenize_tuple(tup)
        if len(vals) != len(cols):
            print('WARN arity', len(vals), len(cols)); continue
        items.append(dict(zip(cols, vals)))
    return cols, items

if __name__ == '__main__':
    cols, items = parse(SQL)
    print('columns:', len(cols))
    print('items:', len(items))
    ids = [i['entry'] for i in items]
    print('unique entries:', len(set(ids)), 'min', min(ids), 'max', max(ids))
    from collections import Counter
    print('classes:', Counter(i['class'] for i in items).most_common())
    print('qualities:', Counter(i['Quality'] for i in items).most_common())
    spells = Counter()
    for it in items:
        for k in range(1, 6):
            sp = it.get('spellid_%d' % k, 0)
            if sp: spells[(sp, it['spelltrigger_%d' % k])] += 1
    print('unique spells:', len(spells))
    print('spell triggers:', Counter(t for _, t in spells).most_common())
    print('random suffix ids:', len({i['RandomSuffix'] for i in items if i['RandomSuffix']}))
    print('random prop ids:', len({i['RandomProperty'] for i in items if i['RandomProperty']}))
    print('item sets:', len({i['itemset'] for i in items if i['itemset']}))
    print('displayids:', len({i['displayid'] for i in items if i['displayid']}))
    print('with description:', sum(1 for i in items if i['description']))
    json.dump(items, open('/tmp/items_raw.json','w'), ensure_ascii=False)
    json.dump(sorted(set(sp for sp,_ in spells)), open('/tmp/spell_ids.json','w'))
    print('sample:', json.dumps({k: items[0][k] for k in list(cols)[:12]}, ensure_ascii=False))
