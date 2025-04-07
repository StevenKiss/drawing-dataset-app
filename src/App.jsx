// src/App.jsx
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Submit from './pages/Submit';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';         
import Signup from './pages/Signup';       
import DrawPage from './pages/DrawPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/submit" element={<Submit />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/draw/:creatorId" element={<DrawPage />} />
    </Routes>
  );
}
