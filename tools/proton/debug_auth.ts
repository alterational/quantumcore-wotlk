// Диагностика: где именно ломается верификация модулюса внутри SDK-потока.
// Usage: bun tools/proton/debug_auth.ts <url>
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
import { SRP_MODULUS_KEY } from './node_modules/@protontech/crypto/src/srp/constants.ts';

const url = process.argv[2];

CryptoApi.init({});
CryptoProxy.setEndpoint(new CryptoApi(), (e) => e.clearKeyStore());

async function manualVerify(tag: string) {
    try {
        const token = url.split('/urls/')[1].split('#')[0];
        const resp = await fetch(`https://drive-api.proton.me/drive/urls/${token}/info`, {
            headers: { Accept: 'application/vnd.protonmail.v1+json' },
        });
        const info: any = await resp.json();
        const pub = await CryptoProxy.importPublicKey({ armoredKey: SRP_MODULUS_KEY });
        const res: any = await CryptoProxy.verifyCleartextMessage({
            armoredCleartextMessage: info.Modulus,
            verificationKeys: pub,
        });
        console.log(`MANUAL[${tag}] status=${res.verificationStatus}`);
    } catch (e: any) {
        console.log(`MANUAL[${tag}] ERROR ${e?.message || e}`);
    }
}

await manualVerify('before-client');

const openPGPCryptoModule = new OpenPGPCryptoWithCryptoProxy(CryptoProxy);
function doFetch(req: any): Promise<Response> {
    const headers = new Headers(req.headers);
    let body: any;
    if (req.json !== undefined) {
        body = JSON.stringify(req.json);
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    } else if (req.body !== undefined) body = req.body;
    const signal = req.signal ?? (req.timeoutMs ? AbortSignal.timeout(req.timeoutMs) : undefined);
    return fetch(req.url, { method: req.method, headers, body, signal });
}
const account = {
    getOwnPrimaryAddress: async (): Promise<any> => { throw new Error('anon'); },
    getOwnAddresses: async (): Promise<any> => { throw new Error('anon'); },
    getOwnAddress: async (): Promise<any> => { throw new Error('anon'); },
    hasProtonAccount: async () => false,
    getPublicKeys: async () => [],
};
const client = new ProtonDriveClient({
    httpClient: { fetchJson: doFetch, fetchBlob: doFetch },
    entitiesCache: new MemoryCache(),
    cryptoCache: new MemoryCache(),
    account,
    openPGPCryptoModule,
    srpModule: { getSrp, getSrpVerifier: getRandomSrpVerifier, computeKeyPassword, generateKeySalt },
    config: {},
});

await manualVerify('after-client');

try {
    const info = await client.experimental.getURLAccessInfo(url);
    console.log('INFO OK', JSON.stringify(info));
} catch (e: any) {
    console.log('INFO ERROR', e?.message || e);
}
await manualVerify('after-info');

try {
    const pubClient = await client.experimental.authURLAccess(url, undefined, true);
    const root = await pubClient.getRootNode();
    console.log('AUTH OK root:', root.type, root.name?.ok ? root.name.value : '?');
} catch (e: any) {
    console.log('AUTH ERROR', e?.message || e);
}
await manualVerify('after-auth');
process.exit(0);
