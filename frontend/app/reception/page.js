'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The old "Reception / New Intake" workspace has been superseded by the
// Look-up page (search, register, initiate/continue visits, move, delete).
// This route is kept only so old links/bookmarks don't 404.
export default function ReceptionRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/lookup'); }, [router]);
  return null;
}
