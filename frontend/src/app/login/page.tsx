'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Email/password login has been removed. Authentication is Phantom wallet only.
// This redirect ensures old links or bookmarks to /login don't result in a 404.
export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}
