'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BuilderPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect /builder to root path
    router.replace('/');
  }, [router]);

  return null;
}
