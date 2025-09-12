import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get('session')?.value;
  if (!session) redirect('/');
  return <>{children}</>;
}