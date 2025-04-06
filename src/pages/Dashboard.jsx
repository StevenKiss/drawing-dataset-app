// src/pages/Dashboard.jsx

import { useState } from 'react';

export default function Dashboard() {
  const [prompts, setPrompts] = useState([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [imageSize, setImageSize] = useState('28'); // default size
  const [isLinkOpen, setIsLinkOpen] = useState(true);

  const handleAddPrompt = () => {
    if (newPrompt.trim() === '') return;
    setPrompts([...prompts, newPrompt]);
    setNewPrompt('');
  };

  const handleDeletePrompt = (index) => {
    const updated = [...prompts];
    updated.splice(index, 1);
    setPrompts(updated);
  };

  const handleCopyLink = () => {
    const link = `http://localhost:5173/submit`; // replace with dynamic route later
    navigator.clipboard.writeText(link);
    alert("🔗 Link copied!");
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>📋 Dataset Creator Dashboard</h1>

      {/* Prompt Management */}
      <div style={{ marginTop: '2rem' }}>
        <h2>✏️ Drawing Prompts</h2>
        <input
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="Enter a drawing prompt..."
        />
        <button onClick={handleAddPrompt}>Add Prompt</button>
        <ul>
          {prompts.map((prompt, i) => (
            <li key={i}>
              {prompt}
              <button onClick={() => handleDeletePrompt(i)}>❌</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Output Image Size */}
      <div style={{ marginTop: '2rem' }}>
        <h2>📐 Output Image Size</h2>
        <select value={imageSize} onChange={(e) => setImageSize(e.target.value)}>
          <option value="28">28 x 28</option>
          <option value="64">64 x 64</option>
          <option value="128">128 x 128</option>
        </select>
      </div>

      {/* Link Access Toggle */}
      <div style={{ marginTop: '2rem' }}>
        <h2>🔐 Access Control</h2>
        <label>
          <input
            type="checkbox"
            checked={isLinkOpen}
            onChange={() => setIsLinkOpen(!isLinkOpen)}
          />
          {' '}Allow submissions from link
        </label>
      </div>

      {/* Copy Link Button */}
      <div style={{ marginTop: '2rem' }}>
        <button onClick={handleCopyLink}>📋 Copy Submission Link</button>
      </div>

      {/* Log out */}
      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => {
          // optional: add actual logout functionality here
          alert("You’ve been logged out!");
        }}>🚪 Logout</button>
      </div>
    </div>
  );
}
