import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, localhost } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'polybets by winorlos9idk',
  projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [sepolia, localhost],
  ssr: false,
});