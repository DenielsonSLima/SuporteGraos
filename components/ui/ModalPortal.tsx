
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: React.ReactNode;
}

/**
 * ModalPortal renders its children into document.body using React Portals.
 * This is essential for modals to break out of parent stacking contexts (like z-index, opacity, or transform)
 * and cover the entire screen correctly, including application headers and sidebars.
 */
let activeModalsCounter = 0;

const ModalPortal: React.FC<Props> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Increment counter and lock scroll only on the first modal
    activeModalsCounter++;
    if (activeModalsCounter === 1) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      // Decrement and unlock scroll only when no modals are left
      activeModalsCounter--;
      if (activeModalsCounter <= 0) {
        activeModalsCounter = 0;
        document.body.style.overflow = '';
      }
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
};

export default ModalPortal;
