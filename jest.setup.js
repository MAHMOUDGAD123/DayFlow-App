/* global jest */
// Jest setup file
// Include any global mocks needed for expo/react-native

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: {
      SHA256: 'SHA-256',
    },
    digestStringAsync: jest.fn(async (_algorithm, data) => {
      return nodeCrypto.createHash('sha256').update(data).digest('hex');
    }),
  };
});

