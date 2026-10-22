// Загрузка публичных папок Proton Drive через официальный SDK (@protontech/drive-sdk).
// Браузерная автоматизация (pdown/puppeteer) с датацентровых IP упирается в
// проверки Proton и таймауты, поэтому идём по протоколу: SRP-авторизация
// публичной ссылки -> расшифровка ключа шары -> обход дерева -> скачивание
// и расшифровка файлов. Запуск: bun tools/proton/main.ts <list|dl> <url> <outdir>
// Зависимости: tools/proton/package.json (openpgp принудительно 6.2.2 —
// только она экспортирует Argon2S2K) + tsconfig paths-шим openpgp/lightweight.
import { CryptoProxy } from '@protontech/crypto';
import { Api as CryptoApi } from '@protontech/crypto/proxy/endpoint/api.ts';
import {
    computeKeyPassword,
    generateKeySalt,
    getRandomSrpVerifier,
    getSrp,
} from '@protontech/crypto/srp';
import {
    MemoryCache,
    OpenPGPCryptoWithCryptoProxy,
    ProtonDriveClient,
} from '@protontech/drive-sdk';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Writable } from 'node:stream';

const [, , mode, url, outDir] = process.argv;
if (!mode || !url || !outDir || (mode !== 'list' && mode !== 'dl')) {
    console.error('usage: bun proton_dl.ts <list|dl> <url> <outdir>');
    process.exit(64);
}

CryptoApi.init({});
CryptoProxy.setEndpoint(new CryptoApi(), (endpoint) => endpoint.clearKeyStore());
const openPGPCryptoModule = new OpenPGPCryptoWithCryptoProxy(CryptoProxy);

function doFetch(req: any): Promise<Response> {
    const headers = new Headers(req.headers);
    let body: any;
    if (req.json !== undefined) {
        body = JSON.stringify(req.json);
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    } else if (req.body !== undefined) {
        body = req.body;
    }
    const signal =
        req.signal ?? (req.timeoutMs ? AbortSignal.timeout(req.timeoutMs) : undefined);
    return fetch(req.url, { method: req.method, headers, body, signal });
}

const httpClient = {
    fetchJson: (req: any) => doFetch(req),
    fetchBlob: (req: any) => doFetch(req),
};

const noAccount = (what: string) => async (): Promise<any> => {
    throw new Error(`anonymous context: ${what} unavailable`);
};
const account = {
    getOwnPrimaryAddress: noAccount('primary address'),
    getOwnAddresses: noAccount('addresses'),
    getOwnAddress: noAccount('address'),
    hasProtonAccount: async () => false,
    getPublicKeys: async () => [],
};

const client = new ProtonDriveClient({
    httpClient,
    entitiesCache: new MemoryCache(),
    cryptoCache: new MemoryCache(),
    account,
    openPGPCryptoModule,
    srpModule: { getSrp, getSrpVerifier: getRandomSrpVerifier, computeKeyPassword, generateKeySalt },
    config: {},
});

function safeName(name: string, uid: string): string {
    const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
    return cleaned && cleaned !== '.' && cleaned !== '..' ? cleaned : `unnamed-${uid.slice(-8)}`;
}

const tree: any = { url, mode, files: [], errors: [] };

async function walk(pub: any, node: any, relDir: string): Promise<void> {
    const name = node.name?.ok ? node.name.value : `unnamed-${String(node.uid).slice(-8)}`;
    if (node.type === 'folder') {
        const myDir = relDir ? path.join(relDir, safeName(name, node.uid)) : safeName(name, node.uid);
        for await (const child of pub.iterateFolderChildren(node.uid)) {
            if ((child as any).missingUid) {
                tree.errors.push({ path: myDir, error: `missing node ${child.missingUid}` });
                continue;
            }
            await walk(pub, child, myDir);
        }
        return;
    }
    const rel = path.join(relDir, safeName(name, node.uid));
    const claimed = node.activeRevision?.claimedSize ?? node.totalStorageSize;
    const rec: any = { path: rel, uid: node.uid, size: claimed, mediaType: node.mediaType };
    tree.files.push(rec);
    console.log(`FILE ${rel} (${claimed ?? '?'} B)`);
    if (mode !== 'dl') return;
    const dest = path.join(outDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    try {
        const downloader = await pub.getFileDownloader(node.uid);
        const controller = downloader.downloadToStream(Writable.toWeb(createWriteStream(dest)));
        await controller.completion();
        rec.downloaded = true;
    } catch (err) {
        rec.downloaded = false;
        rec.error = String(err);
        tree.errors.push({ path: rel, error: String(err) });
        console.error(`FAIL ${rel}: ${err}`);
    }
}

const info = await client.experimental.getURLAccessInfo(url);
console.log('INFO', JSON.stringify(info));
const pub = await client.experimental.authURLAccess(url, undefined, true);
const root = await pub.getRootNode();
console.log('ROOT', root.type, root.name?.ok ? root.name.value : root.name);
await mkdir(outDir, { recursive: true });
if (root.type === 'folder') {
    const rootName = root.name?.ok ? root.name.value : 'share';
    for await (const child of pub.iterateFolderChildren(root.uid)) {
        if ((child as any).missingUid) continue;
        await walk(pub, child, safeName(rootName, root.uid));
    }
} else {
    await walk(pub, root, '');
}
await writeFile(path.join(outDir, '_tree.json'), JSON.stringify(tree, null, 1));
console.log(`DONE files=${tree.files.length} errors=${tree.errors.length}`);
process.exit(tree.errors.length && !tree.files.length ? 2 : 0);
