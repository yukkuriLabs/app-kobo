#!/usr/bin/env node
/**
 * issue-license.mjs — ライセンスキー発行 / 検証 CLI（Node 標準ライブラリのみ）
 *
 * 発行:
 *   node tools/issue-license.mjs --company "株式会社テスト" --years 1
 *   node tools/issue-license.mjs --company "株式会社テスト" --years 0   # 0 = 無期限
 *   node tools/issue-license.mjs --company "株式会社テスト" --years 2 --key ../data/license_private.pem
 *
 * 検証:
 *   node tools/issue-license.mjs --verify "KI1...."
 *
 * 出力: ライセンスキーは標準出力のみ（パイプ可）。詳細は標準エラー出力。
 *
 * キー仕様（アプリ側と完全一致）:
 *   KI1.<base64url(payload JSON 文字列)>.<base64url(RSA-SHA256 署名)>
 *   署名対象 = 2 番目のセグメントの文字列そのもの（UTF-8 バイト）
 *   署名アルゴリズム = RSA-SHA256 / PKCS#1 v1.5（createSign('sha256') の既定）
 *   payload = {"c":"会社名","i":"発行日YYYY-MM-DD","e":"有効期限YYYY-MM-DD または null","id":"16桁のランダムhex"}
 */
import { createSign, createVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PRIVATE_KEY = path.join(HERE, '..', 'data', 'license_private.pem');
const DEFAULT_PUBLIC_KEY = path.join(HERE, '..', 'data', 'license_public.pem');

function usage() {
  console.error(`勤怠管理 ライセンス発行ツール

  発行:
    node tools/issue-license.mjs --company "株式会社テスト" --years 1
      --company  会社名（必須）
      --years    有効年数 1 / 2 / 0（0 = 無期限、既定 1）
      --key      秘密鍵ファイルのパス（既定: ../data/license_private.pem）

  検証:
    node tools/issue-license.mjs --verify "KI1...."
      --public-key  公開鍵ファイルのパス（既定: ../data/license_public.pem）
`);
}

function parseArgs(argv) {
  const args = { years: 1, company: null, key: null, verify: null, publicKey: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`オプション ${a} には値が必要です`);
      return v;
    };
    switch (a) {
      case '--company': args.company = next(); break;
      case '--years': args.years = Number(next()); break;
      case '--key': args.key = next(); break;
      case '--verify': args.verify = next(); break;
      case '--public-key': args.publicKey = next(); break;
      case '-h':
      case '--help': args.help = true; break;
      default: throw new Error(`不明なオプション: ${a}`);
    }
  }
  return args;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function today() { return formatDate(new Date()); }

function expiryDate(years) {
  if (!years) return null;
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return formatDate(d);
}

function randomHex(len) {
  const bytes = Math.ceil(len / 2);
  let hex = '';
  for (let i = 0; i < bytes; i++) {
    hex += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  }
  return hex.slice(0, len);
}

function toBase64Url(buf) {
  return Buffer.from(buf).toString('base64url'); // パディングなし・-/_ 使用
}

function fromBase64Url(str) {
  return Buffer.from(String(str), 'base64url');
}

function resolveKeyPath(p) {
  return path.resolve(process.cwd(), p);
}

function issue(args) {
  if (!args.company || !String(args.company).trim()) {
    throw new Error('--company で会社名を指定してください');
  }
  if (![1, 2, 0].includes(args.years)) {
    throw new Error('--years は 1 / 2 / 0（無期限）のいずれかで指定してください');
  }
  const keyPath = resolveKeyPath(args.key || DEFAULT_PRIVATE_KEY);
  let privatePem;
  try {
    privatePem = readFileSync(keyPath, 'utf8');
  } catch (e) {
    throw new Error(`秘密鍵を読み込めません: ${keyPath}（${e.message}）`);
  }

  const payloadObj = {
    c: String(args.company).trim(),
    i: today(),
    e: expiryDate(args.years),
    id: randomHex(16),
  };
  const payload = JSON.stringify(payloadObj); // キー順: c, i, e, id
  const segment = toBase64Url(Buffer.from(payload, 'utf8'));

  const signer = createSign('sha256'); // 既定の PKCS1 v1.5 パディング
  signer.update(segment, 'utf8');     // 署名対象 = 2 番目のセグメント文字列そのもの
  const signature = signer.sign(privatePem, 'base64url');

  const license = `KI1.${segment}.${signature}`;

  console.error(`会社名     : ${payloadObj.c}`);
  console.error(`発行日     : ${payloadObj.i}`);
  console.error(`有効期限   : ${payloadObj.e ?? '無期限'}`);
  console.error(`ID         : ${payloadObj.id}`);
  console.error(`秘密鍵     : ${keyPath}`);
  console.error('--- ライセンスキー（標準出力） ---');
  process.stdout.write(license + '\n');
}

function verify(args) {
  const license = String(args.verify).trim();
  const parts = license.split('.');
  if (parts.length !== 3 || parts[0] !== 'KI1') {
    throw new Error('キー形式が不正です（KI1.<payload>.<signature> である必要があります）');
  }
  const [, segment, signature] = parts;

  const keyPath = resolveKeyPath(args.publicKey || DEFAULT_PUBLIC_KEY);
  let publicPem;
  try {
    publicPem = readFileSync(keyPath, 'utf8');
  } catch (e) {
    throw new Error(`公開鍵を読み込めません: ${keyPath}（${e.message}）`);
  }

  const verifier = createVerify('sha256');
  verifier.update(segment, 'utf8');
  const ok = verifier.verify(publicPem, signature, 'base64url');
  if (!ok) throw new Error('署名の検証に失敗しました');

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(segment).toString('utf8'));
  } catch {
    payload = null;
  }
  console.error('署名検証   : OK（RSA-SHA256 / PKCS#1 v1.5）');
  console.error(`公開鍵     : ${keyPath}`);
  if (payload) {
    console.error(`会社名     : ${payload.c}`);
    console.error(`発行日     : ${payload.i}`);
    console.error(`有効期限   : ${payload.e ?? '無期限'}`);
    console.error(`ID         : ${payload.id}`);
  }
  process.stdout.write(license + '\n');
  console.error('結果       : 有効');
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error('エラー: ' + e.message);
    usage();
    process.exitCode = 2;
    return;
  }
  if (args.help || (!args.company && args.verify === null)) {
    usage();
    process.exitCode = args.help ? 0 : 2;
    return;
  }
  try {
    if (args.verify !== null) verify(args);
    else issue(args);
  } catch (e) {
    console.error('エラー: ' + e.message);
    process.exitCode = 1;
  }
}

main();
