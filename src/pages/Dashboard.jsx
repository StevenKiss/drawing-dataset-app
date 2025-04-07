import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';
import QRCode from 'react-qr-code';
import { useLocation } from 'react-router-dom';

export default function Dashboard() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [prompts, setPrompts] = useState(['']);
  const [outputSize, setOutputSize] = useState(28);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  const location = useLocation();

  // Fetch dashboard state from Firestore on mount
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        // Create link for other to draw with
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/draw/${user.uid}`;
        setShareUrl(link);

        // Access database
        const docRef = doc(db, 'creators', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPrompts(data.prompts || ['']);
          setOutputSize(data.outputSize || 28);
          setIsOpen(data.isOpen || false);
        } else {
          // If no doc exists, create one with defaults
          await setDoc(docRef, {
            prompts: [''],
            outputSize: 28,
            isOpen: false,
          });
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
      {isOpen && (
        <>
            <h2 style={{ marginTop: '2rem' }}>📤 Shareable Link</h2>
            <p>
            Send this to contributors:
            <br />
            <a href={shareUrl} target="_blank" rel="noreferrer">
                {shareUrl}
            </a>
            </p>

            <h3>📱 QR Code</h3>
            <QRCode value={shareUrl} size={160} />
        </>
        )}

    </div>
  );
}
