import {
  SuiClient,
  getFullnodeUrl,
} from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  jwtToAddress,
  getZkLoginSignature,
} from '@mysten/sui/zklogin';

const SUI_NETWORK = 'testnet';
const FULLNODE_URL = getFullnodeUrl(SUI_NETWORK);

/**
 * 配置 zkLogin 模式
 * - 'mock': 使用模拟实现（无需后端代理）
 * - 'prod': 使用真实的 Mysten Labs API（需要申请 API client ID）
 *
 * 官方文档: https://docs.sui.io/sui-stack/zklogin-integration
 * 注: Mysten Labs API 返回 "Invalid Client ID"，需要申请访问权限
 */
const ZKLOGIN_MODE: 'mock' | 'prod' = 'mock';

// 真实 API 端点（Chrome 扩展通过 host_permissions 直接访问）
const SALT_API = 'https://salt.api.mystenlabs.com/get_salt';
const PROVER_API = 'https://prover.mystenlabs.com/v1/prove';

// 存储 zkLogin 状态的 key
const ZK_LOGIN_STATE_KEY = 'sui_zklogin_state';

interface ZkLoginState {
  ephemeralPrivateKey: string;
  maxEpoch: number;
  randomness: string;
  nonce: string;
  jwt?: string;
  salt?: string;
  zkProofs?: any;
  address?: string;
}

export function createSuiClient(): SuiClient {
  return new SuiClient({ url: FULLNODE_URL });
}

/**
 * 准备 zkLogin：生成 ephemeral key、nonce 等
 * 返回 nonce 给 Google OAuth 使用
 */
export function prepareZkLogin(): string {
  // 生成 ephemeral key pair
  const ephemeralKeyPair = new Ed25519Keypair();

  // 生成 randomness 和 nonce
  const randomness = generateRandomness();
  const maxEpoch = 10000000; // 设置一个足够大的值

  const nonce = generateNonce(
    ephemeralKeyPair.getPublicKey(),
    maxEpoch,
    BigInt(randomness)
  );

  // 保存状态到 chrome.storage
  const secretKeyBytes = ephemeralKeyPair.getSecretKey();
  let ephemeralPrivateKey = '';
  try {
    ephemeralPrivateKey = btoa(
      String.fromCharCode.apply(null, Array.from(secretKeyBytes) as any)
    );
  } catch {
    ephemeralPrivateKey = Array.from(secretKeyBytes).join(',');
  }

  const state: ZkLoginState = {
    ephemeralPrivateKey,
    maxEpoch,
    randomness,
    nonce,
  };
  chrome.storage.local.set({ [ZK_LOGIN_STATE_KEY]: state });

  console.log('zkLogin prepared, nonce:', nonce, 'mode:', ZKLOGIN_MODE);
  return nonce;
}

/**
 * 恢复 ephemeral key pair
 */
function restoreEphemeralKeyPair(secretKeyStr: string): Ed25519Keypair {
  try {
    let secretKeyBytes: Uint8Array;
    if (secretKeyStr.includes(',')) {
      secretKeyBytes = new Uint8Array(secretKeyStr.split(',').map(Number));
    } else {
      const binary = atob(secretKeyStr);
      secretKeyBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        secretKeyBytes[i] = binary.charCodeAt(i);
      }
    }
    return Ed25519Keypair.fromSecretKey(secretKeyBytes);
  } catch (e) {
    console.error('Failed to restore ephemeral key pair:', e);
    throw new Error('Failed to restore ephemeral key pair');
  }
}

/**
 * 生成确定性的 mock 地址
 */
function generateMockAddress(jwt: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(jwt.length, 100); i++) {
    hash = ((hash << 5) - hash) + jwt.charCodeAt(i);
    hash = hash & hash;
  }

  const addressBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    addressBytes[i] = ((hash * (i + 1) * 17) & 0xff);
    hash = ((hash << 3) - hash) ^ (i * 31);
  }

  return '0x' + Array.from(addressBytes, byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/**
 * 用 Google JWT 完成 zkLogin
 *
 * 注: Chrome 扩展中不能直接跨域请求 Mysten Labs 的 API，因为:
 * 1. Chrome 扩展的内容脚本/弹窗页面有严格的 CORS 限制
 * 2. Mysten Labs 的 API 不支持 CORS
 *
 * 要使用真实的 zkLogin，需要:
 * 选项 A: 搭建后端代理服务器
 * 选项 B: 使用 zkLogin 的离线模式 (如果可用)
 * 选项 C: 使用 Chrome Extension 的 background service worker 配合 chrome.proxy API
 */
export async function finalizeZkLogin(jwt: string): Promise<string> {
  const stateRaw = await chrome.storage.local.get(ZK_LOGIN_STATE_KEY);
  const state = stateRaw[ZK_LOGIN_STATE_KEY] as ZkLoginState | undefined;

  if (!state) {
    throw new Error('No zkLogin state found. Call prepareZkLogin first.');
  }

  if (ZKLOGIN_MODE === 'mock') {
    console.log('Using mock zkLogin mode');
    const mockAddress = generateMockAddress(jwt);
    const updatedState: ZkLoginState = {
      ...state,
      jwt,
      salt: 'mock-salt',
      zkProofs: { mock: true },
      address: mockAddress,
    };
    await chrome.storage.local.set({ [ZK_LOGIN_STATE_KEY]: updatedState });
    console.log('zkLogin (mock) address:', mockAddress);
    return mockAddress;
  }

  console.log('Finalizing zkLogin with real API...');

  // 获取 salt
  console.log('Fetching salt...');
  const saltResponse = await fetch(SALT_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ token: jwt }),
  });

  if (!saltResponse.ok) {
    let errorText = '';
    try {
      errorText = await saltResponse.text();
    } catch (e) {
      errorText = 'Unable to read error response';
    }
    console.error('Salt API error:', saltResponse.status, saltResponse.statusText, errorText);
    throw new Error(`Failed to get salt from Mysten Labs: ${saltResponse.status}`);
  }

  const saltData = await saltResponse.json();
  const salt = saltData.salt;
  console.log('Got salt:', salt);

  // 恢复 ephemeral key pair
  const ephemeralKeyPair = restoreEphemeralKeyPair(state.ephemeralPrivateKey);

  // 获取 zk proofs
  console.log('Fetching zk proof...');
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
    ephemeralKeyPair.getPublicKey()
  );
  console.log('Request body:', {
    jwt: jwt.substring(0, 50) + '...',
    extendedEphemeralPublicKey,
    maxEpoch: state.maxEpoch.toString(),
    randomness: state.randomness,
    salt,
  });
  const proofResponse = await fetch(PROVER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch: state.maxEpoch.toString(),
      randomness: state.randomness,
      salt,
    }),
  });

  if (!proofResponse.ok) {
    console.error('Prover API error:', proofResponse.status, proofResponse.statusText);
    throw new Error('Failed to get zk proofs from Mysten Labs');
  }

  const zkProofs = await proofResponse.json();
  console.log('Got zk proofs');

  // 更新 state
  const updatedState: ZkLoginState = {
    ...state,
    jwt,
    salt,
    zkProofs,
  };
  await chrome.storage.local.set({ [ZK_LOGIN_STATE_KEY]: updatedState });

  // 返回 zkLogin 地址
  const address = jwtToAddress(jwt, salt);
  console.log('zkLogin address:', address);
  return address;
}

/**
 * 获取已登录的 zkLogin 地址
 */
export async function getZkLoginAddress(): Promise<string | null> {
  const stateRaw = await chrome.storage.local.get(ZK_LOGIN_STATE_KEY);
  const state = stateRaw[ZK_LOGIN_STATE_KEY] as ZkLoginState | undefined;

  if (!state?.jwt) {
    return null;
  }

  if (state.address) {
    return state.address;
  }

  if (state.salt && state.salt !== 'mock-salt') {
    return jwtToAddress(state.jwt, state.salt);
  }

  return generateMockAddress(state.jwt);
}

/**
 * 用 zkLogin 签名并发送交易
 */
export async function signAndSendTransaction(
  transaction: Transaction
): Promise<any> {
  const stateRaw = await chrome.storage.local.get(ZK_LOGIN_STATE_KEY);
  const state = stateRaw[ZK_LOGIN_STATE_KEY] as ZkLoginState | undefined;

  if (!state?.jwt || !state?.salt || !state?.zkProofs) {
    throw new Error('No zkLogin session found. Please log in first.');
  }

  if (ZKLOGIN_MODE === 'mock') {
    console.warn('Cannot sign transaction in mock zkLogin mode');
    throw new Error('Transaction signing requires real zkLogin mode');
  }

  const ephemeralKeyPair = restoreEphemeralKeyPair(state.ephemeralPrivateKey);
  const client = createSuiClient();
  const zkAddress = jwtToAddress(state.jwt, state.salt);

  console.log('Signing transaction with zkLogin for address:', zkAddress);

  // 设置交易发送者
  transaction.setSender(zkAddress);

  // 构建并签名交易
  const { bytes, signature: userSignature } = await transaction.sign({
    client,
    signer: ephemeralKeyPair,
  });

  // 生成完整的 zkLogin 签名
  const zkSignature = getZkLoginSignature({
    inputs: state.zkProofs,
    maxEpoch: BigInt(state.maxEpoch),
    userSignature: userSignature,
  });

  // 发送交易
  console.log('Sending transaction...');
  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature: zkSignature,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  console.log('Transaction sent successfully:', result.digest);
  return result;
}

/**
 * 登出 zkLogin
 */
export async function logoutZkLogin(): Promise<void> {
  await chrome.storage.local.remove(ZK_LOGIN_STATE_KEY);
}
