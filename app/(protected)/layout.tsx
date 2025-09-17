import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get('session')?.value;
  if (!session) redirect('/');
  return <>{children}</>;
}