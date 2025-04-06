// src/App.jsx

import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Submit from './pages/Submit';
import Signup from './pages/Signup';
import Login from './pages/Login';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/submit" element={<Submit />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
