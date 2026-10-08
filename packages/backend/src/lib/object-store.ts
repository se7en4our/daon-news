// The S3-compatible object store (DB_BACKUP_STORE_*): the backups (operations/backup.ts) and, in this fork,
// the feedback screenshots, so the api/worker need no persistent volume. Requests are signed with AWS
// Signature V4; DB_BACKUP_STORE_DOMAIN may carry the bucket as a path ("<namespace>.compat.objectstorage.
// <region>.oraclecloud.com/<bucket>") for stores that use path-style addressing, such as OCI Object Storage.
import { createHash, createHmac } from "node:crypto";
import { credential } from "../config.ts";

export interface Store {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  endpoint: string;
}

export function objectStore(): Store | null {
  const get = (k: string) => process.env[k] || credential("integrations", k) || null;
  const secretId = get("DB_BACKUP_STORE_SECRET_ID");
  const secretKey = get("DB_BACKUP_STORE_SECRET_KEY");
  const bucket = get("DB_BACKUP_STORE_BUCKET");
  const region = get("DB_BACKUP_STORE_REGION");
  if (!secretId || !secretKey || !bucket || !region) return null;
  const domain = get("DB_BACKUP_STORE_DOMAIN");
  // An explicit http:// is kept (a local stand-in in tests); anything else is https.
  return { secretId, secretKey, bucket, region,
    endpoint: domain ? (domain.startsWith("http://") ? domain.replace(/\/$/, "") : `https://${domain.replace(/^https:\/\//, "")}`) : `https://${bucket}.cos.${region}.myqcloud.com` };
}

const hex = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();

/** AWS Signature V4 headers for one S3 request. */
export function signV4(opts: {
  method: string; url: URL; region: string; accessKey: string; secretKey: string; payloadHash: string; headers?: Record<string, string>;
}): Record<string, string> {
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const service = "s3";
  const headers: Record<string, string> = { ...(opts.headers ?? {}), host: opts.url.host, "x-amz-content-sha256": opts.payloadHash, "x-amz-date": amzDate };
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonicalQuery = [...opts.url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const canonicalPath = opts.url.pathname.split("/").map((s) => encodeURIComponent(decodeURIComponent(s))).join("/");
  const canonical = [opts.method, canonicalPath, canonicalQuery, names.map((n) => `${n}:${lower[n]}\n`).join(""), names.join(";"), opts.payloadHash].join("\n");
  const scope = `${day}/${opts.region}/${service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${opts.secretKey}`, day), opts.region), service), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
  return { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` };
}

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function request(method: "PUT" | "GET" | "DELETE", key: string, body?: Buffer, contentType?: string): Promise<Response> {
  const s = objectStore();
  if (!s) throw new Error("object store is not configured");
  const url = new URL(`${s.endpoint}/${key}`);
  const payload = body ?? Buffer.alloc(0);
  const headers = signV4({
    method, url, region: s.region, accessKey: s.secretId, secretKey: s.secretKey, payloadHash: sha(payload),
    headers: body ? { "content-length": String(body.length), "content-type": contentType ?? "application/octet-stream" } : undefined,
  });
  return fetch(url, { method, headers, body: body ? new Uint8Array(body) : undefined, signal: AbortSignal.timeout(60_000) });
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const res = await request("PUT", key, body, contentType);
  if (!res.ok) throw new Error(`object store PUT ${key}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/** The object's bytes, or null when it does not exist. */
export async function getObject(key: string): Promise<Buffer | null> {
  const res = await request("GET", key);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`object store GET ${key}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteObject(key: string): Promise<void> {
  const res = await request("DELETE", key);
  if (!res.ok && res.status !== 404) throw new Error(`object store DELETE ${key}: HTTP ${res.status}`);
}
