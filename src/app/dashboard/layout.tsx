import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Securely check the HTTP-only cookie
  const session = await getSession();

  if (!session) {
    redirect('/'); // Kick back to login if not authenticated
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Optional: God Mode Warning Banner */}
      {session.isGodMode && (
        <div className="bg-red-600 text-white text-xs font-bold text-center py-1.5 sticky top-0 z-50">
          ⚠️ GOD MODE ACTIVE: You are viewing {session.fullName}'s account
        </div>
      )}

      {/* 
        Main Content Wrapper 
        - max-w-md mx-auto keeps it looking like a mobile app even on desktop screens
        - pb-20 ensures the bottom content isn't hidden behind the fixed navigation bar
      */}
      <main className="max-w-md mx-auto min-h-screen bg-white shadow-sm pb-20 relative">
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}