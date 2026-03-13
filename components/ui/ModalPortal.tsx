
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
const ModalPortal: React.FC<Props> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent scrolling on body when modal is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
};

export default ModalPortal;
