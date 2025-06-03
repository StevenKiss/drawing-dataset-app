import React, { useState, FormEvent, ChangeEvent } from 'react';
import { createUserWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import './Signup.css';

interface DatasetData {
  name: string;
  prompts: string[];
  outputSize: number;
  isOpen: boolean;
}

export default function Signup(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleSignup = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userCred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCred.user.uid;

      const defaultDatasetRef = doc(db, "creators", userId, "datasets", "default");
      const defaultDataset: DatasetData = {
        name: "Default Dataset",
        prompts: [],
        outputSize: 28,
        isOpen: false,
      };
      
      await setDoc(defaultDatasetRef, defaultDataset);
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setConfirmPassword(e.target.value);
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h2>Create Your Account</h2>
        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={handleEmailChange}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={handlePasswordChange}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            required
            onChange={handleConfirmPasswordChange}
          />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit">Sign Up</button>
        </form>
        <p className="redirect-text">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  );
} 