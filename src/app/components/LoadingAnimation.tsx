'use client';

import { motion } from 'framer-motion';

interface LoadingAnimationProps {
  text?: string;
  fullScreen?: boolean;
}

/**
 * LoadingAnimation - Reusable branded loading component with animated logo and background
 * Used across the application for consistent loading states
 */
export default function LoadingAnimation({
  text = 'Loading...',
  fullScreen = false
}: LoadingAnimationProps) {
  const containerClass = fullScreen
    ? "flex items-center justify-center min-h-screen bg-background relative overflow-hidden"
    : "flex items-center justify-center min-h-[400px] bg-background relative overflow-hidden rounded-lg";

  return (
    <div className={containerClass}>
      {/* Animated background blobs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-primary/10 dark:bg-primary/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 dark:bg-accent/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -50, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="text-center relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated logo */}
        <motion.div
          className="mx-auto h-24 w-24 bg-card border-4 border-primary rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg className="h-12 w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </motion.div>

        {/* Animated spinner */}
        <motion.div
          className="relative h-16 w-16 mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary"></div>
        </motion.div>

        {/* Loading text */}
        <motion.h2
          className="text-2xl font-bold text-foreground mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.h2>

        <motion.div className="flex items-center justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
