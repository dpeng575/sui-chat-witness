'use client';

import dynamic from 'next/dynamic';

export const SignerClientLoader = dynamic(
  () => import('./signer-client').then((m) => m.SignerClient),
  { ssr: false },
);
