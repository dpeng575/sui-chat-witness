import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseEncryptedObject: vi.fn(),
  moveCall: vi.fn(),
  build: vi.fn(),
  setSender: vi.fn(),
  pureVector: vi.fn((type: string, value: number[]) => ({ type, value })),
  objectArg: vi.fn((value: string) => ({ object: value })),
}));

vi.mock('@mysten/seal', () => ({
  EncryptedObject: {
    parse: mocks.parseEncryptedObject,
  },
  SealClient: vi.fn(() => ({
    decrypt: vi.fn(),
  })),
  SessionKey: {
    create: vi.fn(),
  },
}));

vi.mock('@mysten/sui/grpc', () => ({
  SuiGrpcClient: vi.fn(function SuiGrpcClient() {
    return {
      $extend: vi.fn(() => ({
        walrus: {
          getFiles: vi.fn(),
        },
      })),
    };
  }),
}));

vi.mock('@mysten/sui/transactions', () => ({
  Transaction: vi.fn(function Transaction() {
    return {
      setSender: mocks.setSender,
      moveCall: mocks.moveCall,
      build: mocks.build,
      pure: {
        vector: mocks.pureVector,
      },
      object: mocks.objectArg,
    };
  }),
}));

vi.mock('@mysten/walrus', () => ({
  walrus: vi.fn(() => ({})),
}));

vi.mock('../config', () => ({
  publicConfig: {
    sealPackageId: '0xseal',
    sealNamespacePackageId: '0xAbC',
    sealKeyServers: ['0xserver'],
    suiNetwork: 'testnet',
    walrusUploadRelayUrl: 'https://upload-relay.testnet.walrus.space',
  },
}));

import { decryptMarkdown } from '../storage';

const decryptArgs = {
  encryptedBytes: new Uint8Array([1, 2, 3]),
  conversationHash: '0x1234',
  witnessObjectId: '0xwitness',
  sessionKey: {} as never,
  sender: '0xsender',
};

describe('decryptMarkdown validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseEncryptedObject.mockReturnValue({
      threshold: 1,
      packageId: '0xabc',
      id: '0x1234',
    });
  });

  test('rejects malformed conversation hashes before building transaction', async () => {
    await expect(
      decryptMarkdown({
        ...decryptArgs,
        conversationHash: '0x123',
      }),
    ).rejects.toThrow('Conversation hash must be a valid even-length hex string.');

    expect(mocks.build).not.toHaveBeenCalled();
    expect(mocks.moveCall).not.toHaveBeenCalled();
  });

  test('rejects Seal metadata with mismatched package id before building transaction', async () => {
    mocks.parseEncryptedObject.mockReturnValue({
      threshold: 1,
      packageId: '0xdef',
      id: '0x1234',
    });

    await expect(decryptMarkdown(decryptArgs)).rejects.toThrow(
      'Seal namespace in Walrus file does not match current configuration.',
    );

    expect(mocks.build).not.toHaveBeenCalled();
    expect(mocks.moveCall).not.toHaveBeenCalled();
  });

  test('accepts Seal metadata package ids case-insensitively', async () => {
    mocks.build.mockRejectedValueOnce(new Error('stop before decrypt'));
    mocks.parseEncryptedObject.mockReturnValue({
      threshold: 1,
      packageId: '0xabc',
      id: '0x1234',
    });

    await expect(decryptMarkdown(decryptArgs)).rejects.toThrow('stop before decrypt');

    expect(mocks.build).toHaveBeenCalledTimes(1);
    expect(mocks.moveCall).toHaveBeenCalledTimes(1);
  });
});
