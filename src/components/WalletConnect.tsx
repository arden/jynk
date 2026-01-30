import { useState } from 'react';
import { useWallet, Wallet } from '@solana/wallet-adapter-react';
import { useStore } from '../store';
import { shortenAddress } from '../utils';
import { createPortal } from 'react-dom';

export function WalletConnect() {
  const { publicKey, disconnect, connected, select, wallets, connect, wallet } = useWallet();
  const { setCurrentUser } = useStore();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const displayAddress = publicKey?.toBase58() || null;

  const handleDisconnect = () => {
    disconnect();
    setCurrentUser(null);
  };

  const handleConnectClick = () => {
    setShowWalletModal(true);
    setConnectionError(null);
  };

  const handleSelectWallet = async (selectedWallet: Wallet) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Check if wallet is already selected
      if (wallet?.adapter.name !== selectedWallet.adapter.name) {
        // Select the wallet first
        select(selectedWallet.adapter.name);
        
        // Wait for selection to take effect
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Now connect
      await connect();
      
      // Success - close modal
      setShowWalletModal(false);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setConnectionError(error?.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCloseModal = () => {
    if (!isConnecting) {
      setShowWalletModal(false);
      setConnectionError(null);
    }
  };

  // Get installed wallets only
  const installedWallets = wallets.filter(w => 
    w.adapter.readyState === 'Installed'
  );

  if (connected && displayAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">{shortenAddress(displayAddress)}</span>
        </div>
        <button onClick={handleDisconnect} className="btn-secondary text-sm py-2">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleConnectClick}
        className="btn-wallet flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Connect Wallet
      </button>

      {/* Wallet Selection Modal - Using Portal */}
      {showWalletModal && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(2, 6, 23, 0.95)',
          }}
          onClick={handleCloseModal}
        >
          <div 
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '400px',
              backgroundColor: 'rgb(15, 23, 42)',
              borderRadius: '16px',
              border: '1px solid rgb(71, 85, 105)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              zIndex: 2147483647,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid rgb(30, 41, 59)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>
                    Connect Wallet
                  </h2>
                  <p style={{ fontSize: '14px', color: 'rgb(148, 163, 184)', margin: '4px 0 0 0' }}>
                    Select a wallet to connect
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={isConnecting}
                  style={{
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgb(100, 116, 139)',
                    borderRadius: '50%',
                    opacity: isConnecting ? 0.5 : 1,
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
              {/* Error Message */}
              {connectionError && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <p style={{ color: 'rgb(248, 113, 113)', fontSize: '14px', margin: 0 }}>
                    {connectionError}
                  </p>
                </div>
              )}

              {installedWallets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ 
                    fontSize: '12px', 
                    color: 'rgb(100, 116, 139)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                    margin: '0 0 8px 0'
                  }}>
                    Detected Wallets ({installedWallets.length})
                  </p>
                  {installedWallets.map((wallet) => (
                    <button
                      key={wallet.adapter.name}
                      onClick={() => handleSelectWallet(wallet)}
                      disabled={isConnecting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        backgroundColor: 'rgb(30, 41, 59)',
                        border: '1px solid rgb(51, 65, 85)',
                        borderRadius: '12px',
                        cursor: isConnecting ? 'not-allowed' : 'pointer',
                        opacity: isConnecting ? 0.5 : 1,
                        transition: 'all 0.2s',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (!isConnecting) {
                          e.currentTarget.style.backgroundColor = 'rgb(51, 65, 85)';
                          e.currentTarget.style.borderColor = 'rgb(100, 116, 139)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(30, 41, 59)';
                        e.currentTarget.style.borderColor = 'rgb(51, 65, 85)';
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: 'rgb(51, 65, 85)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {wallet.adapter.icon ? (
                          <img 
                            src={wallet.adapter.icon} 
                            alt={wallet.adapter.name}
                            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}>
                            {wallet.adapter.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ 
                          fontWeight: 600, 
                          color: 'white', 
                          fontSize: '18px',
                          margin: 0,
                        }}>
                          {wallet.adapter.name}
                        </p>
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'rgb(148, 163, 184)',
                          margin: '2px 0 0 0',
                        }}>
                          {isConnecting ? 'Connecting...' : 'Click to connect'}
                        </p>
                      </div>

                      {/* Arrow or Loading */}
                      {isConnecting ? (
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgb(56, 189, 248)', flexShrink: 0, animation: 'spin 1s linear infinite' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgb(100, 116, 139)', flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: 'rgb(30, 41, 59)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'rgb(100, 116, 139)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p style={{ color: 'rgb(148, 163, 184)', margin: '0 0 8px 0' }}>
                    No wallets detected
                  </p>
                  <p style={{ color: 'rgb(100, 116, 139)', fontSize: '14px', margin: '0 0 24px 0' }}>
                    Install a Solana wallet to continue
                  </p>
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      backgroundColor: 'rgb(14, 165, 233)',
                      color: 'white',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install Phantom
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid rgb(30, 41, 59)',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '0 0 16px 16px',
            }}>
              <p style={{ fontSize: '12px', color: 'rgb(100, 116, 139)', textAlign: 'center', margin: 0 }}>
                New to Solana?{' '}
                <a 
                  href="https://docs.solana.com/wallet-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'rgb(56, 189, 248)', textDecoration: 'none' }}
                >
                  Learn about wallets →
                </a>
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
