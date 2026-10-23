// Диагностика SRP-верификации модулюса публичной ссылки (запуск на раннере).
// Usage: bun tools/proton/debug_modulus.ts <token>
import { CryptoProxy, updateServerTime, wasServerTimeEverUpdated } from '@protontech/crypto';
import { Api as CryptoApi } from '@protontech/crypto/proxy/endpoint/api.ts';
import { SRP_MODULUS_KEY } from './node_modules/@protontech/crypto/src/srp/constants.ts';

const token = process.argv[2];
const url = `https://drive-api.proton.me/drive/urls/${token}/info`;
const resp = await fetch(url, {
    headers: {
        Accept: 'application/vnd.protonmail.v1+json',
        'x-pm-drive-sdk-version': 'js@0.23.0',
    },
});
console.log('HTTP', resp.status, 'date:', resp.headers.get('date'), 'x-pm-date:', resp.headers.get('x-pm-date'));
const info: any = await resp.json();
console.log('KEYS', Object.keys(info).join(','));
console.log('Version:', info.Version, 'Flags:', info.Flags);
const modulus: string = info.Modulus || '';
console.log('MODULUS len', modulus.length);
console.log('MODULUS head:', JSON.stringify(modulus.slice(0, 120)));

const d = resp.headers.get('x-pm-date') || resp.headers.get('date');
if (d) updateServerTime(new Date(d));
console.log('serverTime updated:', wasServerTimeEverUpdated());

CryptoApi.init({});
CryptoProxy.setEndpoint(new CryptoApi(), (e) => e.clearKeyStore());

try {
    const pub = await CryptoProxy.importPublicKey({ armoredKey: SRP_MODULUS_KEY });
    console.log('importPublicKey OK');
    const exported = await CryptoProxy.exportPublicKey({ key: pub, format: 'armored' });
    console.log('exportPublicKey OK len', String(exported).length);
    const res: any = await CryptoProxy.verifyCleartextMessage({
        armoredCleartextMessage: modulus,
        verificationKeys: pub,
    });
    console.log('VERIFY status:', res.verificationStatus);
    console.log('VERIFY data head:', JSON.stringify(String(res.data).slice(0, 60)));
    console.log('VERIFY errors:', JSON.stringify(res.verificationErrors || res.errors || null)?.slice(0, 500));
} catch (e: any) {
    console.log('CRYPTO ERROR:', e?.message || String(e));
    console.log(e?.stack?.split('\n').slice(0, 6).join('\n'));
}
process.exit(0);
