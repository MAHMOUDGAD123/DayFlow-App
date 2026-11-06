import * as Crypto from 'expo-crypto';

/**
 * Cross-platform SHA-256 helper using expo-crypto.
 */
export async function computeSha256(data: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
}
