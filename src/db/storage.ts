// R2 存储：存 .skill.tar.gz 包文件

function r2Key(name: string, version: string): string {
  return `skills/${name}/${name}@${version}.skill.tar.gz`;
}

export async function uploadBundle(
  bucket: R2Bucket,
  name: string,
  version: string,
  data: ArrayBuffer,
): Promise<{ r2Key: string; contentHash: string; fileSize: number }> {
  const key = r2Key(name, version);

  // SHA-256 哈希
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  await bucket.put(key, data, {
    httpMetadata: { contentType: 'application/gzip' },
    customMetadata: { contentHash: hashHex },
  });

  return { r2Key: key, contentHash: hashHex, fileSize: data.byteLength };
}

export async function getBundle(
  bucket: R2Bucket,
  name: string,
  version: string,
): Promise<{ body: ReadableStream | null; contentType: string }> {
  const obj = await bucket.get(r2Key(name, version));
  if (!obj) return { body: null, contentType: '' };
  return { body: obj.body, contentType: obj.httpMetadata?.contentType ?? 'application/gzip' };
}
