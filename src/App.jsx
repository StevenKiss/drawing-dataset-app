import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth';

export default function Dashboard() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [prompts, setPrompts] = useState(['']);
  const [outputSize, setOutputSize] = useState(28);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard state from Firestore on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, 'creators', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPrompts(data.prompts || ['']);
          setOutputSize(data.outputSize || 28);
          setIsOpen(data.isOpen || false);
        } else {
          await setDoc(docRef, {
            prompts: [''],
            outputSize: 28,
            isOpen: false,
          });
        }
      }
      setLoading(false); // Move this outside of the `if (currentUser)` block
    });
  
    return () => unsubscribe();
  }, []);

  // Save updates to Firestore
  const saveToFirestore = async (newData = {}) => {
    if (!user) return;
    const docRef = doc(db, 'creators', user.uid);
    await setDoc(docRef, {
      prompts,
      outputSize,
      isOpen,
      ...newData,
    });
  };

  // Prompt handlers
  const handlePromptChange = (index, value) => {
    const updated = [...prompts];
    updated[index] = value;
    setPrompts(updated);
    saveToFirestore({ prompts: updated });
  };

  const addPrompt = () => {
    const updated = [...prompts, ''];
    setPrompts(updated);
    saveToFirestore({ prompts: updated });
  };

  const removePrompt = (index) => {
    const updated = prompts.filter((_, i) => i !== index);
    setPrompts(updated);
    saveToFirestore({ prompts: updated });
  };

  // Output size change
  const handleOutputSizeChange = (e) => {
    const size = parseInt(e.target.value);
    setOutputSize(size);
    saveToFirestore({ outputSize: size });
  };

  // Toggle link status
  const handleIsOpenToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    saveToFirestore({ isOpen: newState });
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dataset Creator Dashboard</h1>

      <h2>✏️ Drawing Prompts</h2>
      {prompts.map((prompt, index) => (
        <div key={index} style={{ marginBottom: '0.5rem' }}>
          <input
            value={prompt}
            onChange={(e) => handlePromptChange(index, e.target.value)}
            placeholder={`Prompt ${index + 1}`}
            style={{ marginRight: '0.5rem' }}
          />
          <button onClick={() => removePrompt(index)}>Remove</button>
        </div>
      ))}
      <button onClick={addPrompt}>➕ Add Prompt</button>

      <h2 style={{ marginTop: '2rem' }}>📏 Output Image Size</h2>
      <input
        type="number"
        min="1"
        value={outputSize}
        onChange={handleOutputSizeChange}
      />

      <h2 style={{ marginTop: '2rem' }}>🔗 Link Status</h2>
      <label>
        <input type="checkbox" checked={isOpen} onChange={handleIsOpenToggle} />
        {isOpen ? 'Open for Responses' : 'Closed to Responses'}
      </label>
    </div>
  );
}
