import React, { useState, FormEvent, ChangeEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';

export default function Login(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in");
      navigate('/dashboard');
    } catch (error) {
      console.error("❌ Login error:", error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dataset Creator Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={handleEmailChange}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={handlePasswordChange}
        />
        <br />
        <button type="submit">Log In</button>
      </form>
    </div>
  );
} 