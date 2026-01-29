import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { wagmiConfig } from './config/wagmi';
import { SOLANA_RPC_ENDPOINT } from './config/solana';
import { Layout } from './components/Layout';
import { HomePage, CreatePage, DashboardPage, StorePage, ProductPage, SettingsPage } from './pages';

import '@solana/wallet-adapter-react-ui/styles.css';

const queryClient = new QueryClient();
const solanaWallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
          <WalletProvider wallets={solanaWallets} autoConnect>
            <WalletModalProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="s/:address" element={<StorePage />} />
                  <Route path="p/:id" element={<ProductPage />} />
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="create" element={<CreatePage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
