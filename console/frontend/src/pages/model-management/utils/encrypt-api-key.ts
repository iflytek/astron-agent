import JSEncrypt from 'jsencrypt';
import i18next from 'i18next';

const RSA_PKCS1_PADDING_OVERHEAD = 11;
const DEFAULT_MAX_CHUNK_BYTES = 245;

const getMaxChunkBytes = (publicKey: string): number => {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey);

  const key = encrypt.getKey() as unknown as {
    n?: { bitLength?: () => number };
  };
  const bitLength = key?.n?.bitLength?.();

  if (typeof bitLength === 'number' && bitLength > RSA_PKCS1_PADDING_OVERHEAD) {
    return Math.floor((bitLength + 7) / 8) - RSA_PKCS1_PADDING_OVERHEAD;
  }

  return DEFAULT_MAX_CHUNK_BYTES;
};

const splitTextByUtf8ByteLength = (
  text: string,
  maxChunkBytes: number
): string[] => {
  if (!text) {
    return [''];
  }

  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkBytes = 0;

  for (const char of text) {
    const charBytes = encoder.encode(char).length;

    if (charBytes > maxChunkBytes) {
      throw new Error(i18next.t('model.encryptionFailed'));
    }

    if (currentChunkBytes + charBytes > maxChunkBytes) {
      chunks.push(currentChunk);
      currentChunk = char;
      currentChunkBytes = charBytes;
      continue;
    }

    currentChunk += char;
    currentChunkBytes += charBytes;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const decodeBase64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const encodeBytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }

  return btoa(binary);
};

export const encryptApiKey = (publicKey: string, apiKey: string): string => {
  const maxChunkBytes = getMaxChunkBytes(publicKey);
  const chunks = splitTextByUtf8ByteLength(apiKey, maxChunkBytes);
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey);

  const encryptedBlocks = chunks.map(chunk => {
    const encrypted = encrypt.encrypt(chunk);
    if (!encrypted) {
      throw new Error(i18next.t('model.encryptionFailed'));
    }

    return decodeBase64ToBytes(encrypted);
  });

  const totalLength = encryptedBlocks.reduce(
    (sum, block) => sum + block.length,
    0
  );
  const mergedBytes = new Uint8Array(totalLength);
  let offset = 0;

  encryptedBlocks.forEach(block => {
    mergedBytes.set(block, offset);
    offset += block.length;
  });

  return encodeBytesToBase64(mergedBytes);
};
