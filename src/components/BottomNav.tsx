'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Users, Settings, TrendingUp, TrendingDown } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Income', href: '/dashboard/income', icon: TrendingUp },
    { name: 'Expense', href: '/dashboard/expense', icon: TrendingDown },
    { name: 'Ledger', href: '/dashboard/ledger', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="max-w-md mx-auto px-4 h-16 flex justify-between items-center">
        {navItems.map((item) => {
          // Highlight if the path matches or starts with the base path (for sub-pages)
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex-1 flex justify-center items-center h-full outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }} // Removes ugly mobile browser tap flash
            >
              {/* Framer Motion wrapper for instant touch feedback */}
              <motion.div
                whileTap={{ scale: 0.8 }} // Squishes down instantly to 80% size on tap
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={`flex flex-col items-center justify-center w-14 space-y-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {/* Active Indicator Dot (Optional but adds a premium feel) */}
                <div className="relative">
                  <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {isActive && (
                    <motion.span 
                      layoutId="activeNavDot"
                      className="absolute -top-1 -right-1 h-2 w-2 bg-blue-600 rounded-full border-2 border-white"
                    />
                  )}
                </div>

                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}