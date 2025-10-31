import { useState } from 'react';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';

let fheInstance: FhevmInstance | null = null;

export const initializeFHE = async (): Promise<FhevmInstance> => {
  if (fheInstance) {
    return fheInstance;
  }

  try {
    // Initialize the FHE SDKc
    await initSDK();

    // Create FHE instance with Sepolia config
    const config = {
      ...SepoliaConfig
    };

    fheInstance = await createInstance(config);

    console.log('FHE initialized successfully');
    return fheInstance;
  } catch (error) {
    console.error('Failed to initialize FHE:', error);
    throw new Error('Failed to initialize FHE encryption');
  }
};

export const getFHEInstance = (): FhevmInstance => {
  if (!fheInstance) {
    throw new Error('FHE not initialized. Call initializeFHE() first.');
  }
  return fheInstance;
};

export const createEncryptedBet = async (
  contractAddress: string,
  userAddress: string,
  shares: number,
  isYesBet: boolean
) => {
  const instance = getFHEInstance();

  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add32(shares);    // Add shares as euint32
  input.addBool(isYesBet); // Add direction as ebool

  const encryptedInput = await input.encrypt();

  return {
    encryptedShares: encryptedInput.handles[0],
    encryptedDirection: encryptedInput.handles[1],
    inputProof: encryptedInput.inputProof
  };
};

export const decryptUserData = async (
  encryptedHandle: string,
  contractAddress: string,
  walletClient: any
): Promise<any> => {
  const instance = getFHEInstance();

  try {
    const keypair = instance.generateKeypair();
    const handleContractPairs = [{
      handle: encryptedHandle,
      contractAddress
    }];

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [contractAddress];

    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    // For Wagmi v2 walletClient, we need to use the correct interface
    const signature = await walletClient.signTypedData({
      account: walletClient.account,
      domain: eip712.domain,
      types: {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      primaryType: 'UserDecryptRequestVerification',
      message: eip712.message
    });

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      walletClient.account.address,
      startTimeStamp,
      durationDays
    );

    return result[encryptedHandle];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to decrypt data:', error);
    throw new Error(`Failed to decrypt encrypted data: ${errorMessage}`);
  }
};

export const userDecryptEbool = async (
  encryptedHandle: string,
  contractAddress: string,
  walletClient: any
): Promise<boolean> => {
  const result = await decryptUserData(encryptedHandle, contractAddress, walletClient);
  return Boolean(result);
};

export const userDecryptEuint32 = async (
  encryptedHandle: string,
  contractAddress: string,
  walletClient: any
): Promise<number> => {
  const result = await decryptUserData(encryptedHandle, contractAddress, walletClient);
  return Number(result);
};

export const userDecryptEuint64 = async (
  encryptedHandle: string,
  contractAddress: string,
  walletClient: any
): Promise<bigint> => {
  const result = await decryptUserData(encryptedHandle, contractAddress, walletClient);
  return BigInt(result);
};

export const createUserDecryptionRequest = async (
  contractAddress: string,
  handles: string[],
  walletClient: any
) => {
  const instance = getFHEInstance();

  try {
    const keypair = instance.generateKeypair();
    const handleContractPairs = handles.map(handle => ({
      handle,
      contractAddress
    }));

    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [contractAddress];

    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    // For Wagmi v2 walletClient, we need to use the correct interface
    const signature = await walletClient.signTypedData({
      account: walletClient.account,
      domain: eip712.domain,
      types: {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      primaryType: 'UserDecryptRequestVerification',
      message: eip712.message
    });

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      walletClient.account.address,
      startTimeStamp,
      durationDays
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create user decryption request:', error);
    throw new Error(`Failed to decrypt user data: ${errorMessage}`);
  }
};

export const formatEncryptedValue = (value: any, type: 'amount' | 'shares' | 'direction'): string => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (type) {
    case 'amount':
      return `${Number(value) / 1e18} ETH`;
    case 'shares':
      return value.toString();
    case 'direction':
      return value ? 'YES' : 'NO';
    default:
      return value.toString();
  }
};

// React hook for FHE operations
export const useFHE = () => {
  const [instance, setInstance] = useState<FhevmInstance | null>(fheInstance);
  const [isInitialized, setIsInitialized] = useState(!!fheInstance);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string>('');

  const initialize = async () => {
    // Check if we already have a global instance
    if (fheInstance) {
      setInstance(fheInstance);
      setIsInitialized(true);
      return fheInstance;
    }

    // Check if the current instance is already set
    if (instance) return instance;

    if (isInitializing) {
      throw new Error('FHE is already initializing');
    }

    try {
      setIsInitializing(true);
      setError('');
      console.log('Starting FHE initialization...');

      const newInstance = await initializeFHE();
      setInstance(newInstance);
      setIsInitialized(true);
      console.log('FHE initialization completed successfully');
      return newInstance;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize FHE';
      setError(errorMessage);
      console.error('FHE initialization error:', err);
      throw new Error(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const createEncryptedInput = (contractAddress: string, userAddress: string) => {
    const currentInstance = instance || fheInstance;
    if (!currentInstance) {
      throw new Error('FHE not initialized. Please click the "Initialize FHE" button first.');
    }
    return currentInstance.createEncryptedInput(contractAddress, userAddress);
  };

  // 移除自动初始化，现在需要手动调用
  // useEffect(() => {
  //   initialize().catch(console.error);
  // }, []);

  return {
    instance: instance || fheInstance,
    isInitialized: isInitialized || !!fheInstance,
    isInitializing,
    error,
    initialize,
    createEncryptedInput
  };
};