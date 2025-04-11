import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCred.user.uid;
  
      // Create a default dataset document
      const defaultDatasetRef = doc(db, "creators", userId, "datasets", "default");
      await setDoc(defaultDatasetRef, {
        name: "Default Dataset",
        prompts: [],
        outputSize: 28,
        isOpen: false,
      });
  
      console.log("✅ Account created + default dataset");
      navigate("/login");
    } catch (error) {
      console.error("❌ Signup error:", error.message);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Create Dataset Creator Account</h2>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
