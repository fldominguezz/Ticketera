import React, { useState, useEffect, useCallback } from 'react';
import { Form } from 'react-bootstrap';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface Props {
  onVerify: (isValid: boolean) => void;
  theme?: string;
}

const LocalSecurityCheck: React.FC<Props> = ({ onVerify, theme }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const generateChallenge = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    setIsVerified(false);
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    generateChallenge();
  }, [generateChallenge]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserAnswer(val);
    
    if (parseInt(val) === num1 + num2) {
      setIsVerified(true);
      onVerify(true);
    } else {
      setIsVerified(false);
      onVerify(false);
    }
  };

  return (
    <div className={`p-3 rounded-3 border ${isVerified ? 'border-success bg-success bg-opacity-10' : 'border-subtle bg-surface-muted'} transition-all`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="x-small fw-black text-muted-foreground uppercase tracking-widest d-flex align-items-center gap-2">
          <ShieldCheck size={14} className={isVerified ? 'text-success' : 'text-primary'} />
          Verificación Humana
        </span>
        <RefreshCw 
          size={12} 
          className="text-muted cursor-pointer hover-text-primary" 
          onClick={generateChallenge} 
        />
      </div>
      
      <div className="d-flex align-items-center gap-3">
        <div className="fw-black text-main font-monospace" style={{ fontSize: '1.2rem' }}>
          {num1} + {num2} = 
        </div>
        <Form.Control
          type="number"
          placeholder="?"
          value={userAnswer}
          onChange={handleChange}
          className={`text-center fw-bold border-0 shadow-sm ${isVerified ? 'text-success' : 'text-primary'}`}
          style={{ width: '70px', height: '40px' }}
          autoComplete="off"
        />
        {isVerified && <span className="x-small fw-black text-success animate-fade-in">✓ VALIDADO</span>}
      </div>
    </div>
  );
};

export default LocalSecurityCheck;
