import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import '@mysten/dapp-kit/dist/index.css';
import '../popup/index.css';
import './index.css';
import SignerApp from './SignerApp';

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
  testnet: { network: 'testnet', url: 'https://fullnode.testnet.sui.io:443' },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <WalletProvider autoConnect>
        <SignerApp />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>,
);
