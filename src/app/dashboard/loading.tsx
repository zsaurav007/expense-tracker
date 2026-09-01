'use client';

import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 pointer-events-none">
      {/* Progress Bar Track */}
      <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
        {/* Smooth Indeterminate Animated Bar */}
        <motion.div
          className="absolute top-0 left-0 h-full bg-blue-600 rounded-full"
          initial={{ x: '-100%', width: '40%' }}
          animate={{ x: '250%', width: '40%' }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}