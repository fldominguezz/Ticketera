import React from 'react';

const Footer: React.FC = () => {
 return (
  <footer style={{
   marginTop: 'auto',
   padding: '20px',
   textAlign: 'center',
   borderTop: '1px solid var(--border-subtle)',
   color: 'var(--text-muted)',
   fontSize: '0.875rem',
   backgroundColor: 'var(--bg-surface)'
  }}>
   Sistema creado y configurado por el Ayudante Domínguez Fernando | v2.0.0
  </footer>
 );
};

export default Footer;
