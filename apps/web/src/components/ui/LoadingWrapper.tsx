'use client';

import React from 'react';
import { motion, AnimatePresence } from "framer-motion";

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  className?: string;
}

// Default spinner component
const DefaultSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <span className="text-gray-600 text-sm">Loading…</span>
    </div>
  </div>
);

export function LoadingWrapper({ 
  isLoading, 
  children, 
  loadingComponent = <DefaultSpinner />,
  className = "" 
}: LoadingWrapperProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {loadingComponent}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Specialized wrapper for grid/list transitions
interface ContentTransitionProps {
  children: React.ReactNode;
  className?: string;
  transitionKey?: string;
}

export function ContentTransition({ children, className = "", transitionKey }: ContentTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey || "content"}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Individual item animation for lists/grids
interface AnimatedItemProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function AnimatedItem({ children, index = 0, className = "" }: AnimatedItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: Math.min(index * 0.05, 0.3), // Stagger with max delay
        ease: "easeOut" 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}