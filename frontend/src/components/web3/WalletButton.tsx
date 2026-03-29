'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from './WalletButton.module.css';

interface WalletButtonProps {
    compact?: boolean;
}

export function WalletButton({ compact }: WalletButtonProps) {
    return (
        <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;

                return (
                    <div className={styles.wrapper} aria-hidden={!mounted} style={!mounted ? { opacity: 0, pointerEvents: 'none' } : undefined}>
                        {!connected ? (
                            <button className={styles.connectBtn} onClick={openConnectModal} type="button">
                                CONNECT WALLET
                            </button>
                        ) : chain?.unsupported ? (
                            <button className={`${styles.connectBtn} ${styles.wrong}`} onClick={openChainModal} type="button">
                                WRONG NETWORK
                            </button>
                        ) : (
                            <div className={styles.connected}>
                                {!compact && (
                                    <button className={styles.chainBtn} onClick={openChainModal} type="button">
                                        {chain?.name ?? 'CHAIN'}
                                    </button>
                                )}
                                <button className={styles.accountBtn} onClick={openAccountModal} type="button">
                                    <span className={styles.balance}>{account?.displayBalance ?? ''}</span>
                                    <span className={styles.address}>{account?.displayName ?? ''}</span>
                                </button>
                            </div>
                        )}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
