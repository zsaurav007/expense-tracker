import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <header className="px-6 pt-10 pb-6 flex justify-between items-center bg-slate-900 text-white rounded-b-[2rem] shadow-md z-10 relative">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>
      
      {/* Pass the session user object to the client component */}
      <SettingsClient user={session} />
    </div>
  );
}