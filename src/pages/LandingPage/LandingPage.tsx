import React from "react";
import "./LandingPage.css";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import croppedLogo from "../../assets/croppedLogo.png";

export default function LandingPage(): JSX.Element {
  return (
    <div className="landing-wrapper">
      <header className="landing-hero">
        <img src={croppedLogo} alt="DoodleVault Logo" className="logo" />
        <h1>Your gateway to crowd-sourced drawing datasets</h1>
        <p>Build datasets with ease. Collect, export, and explore.</p>
        <Link to="/login" className="cta-button">Start Creating</Link>
      </header>

      <div className="landing-inner">
        <section className="features">
          <h2>🔒 Why DoodleVault?</h2>
          <ul>
            <li>Create prompt-based drawing datasets</li>
            <li>Collect responses from anyone, no login required</li>
            <li>Export in CSV, PNG, or JSON format</li>
          </ul>
        </section>

        <section className="how-it-works">
          <h2>🧩 How It Works</h2>
          <ol>
            <li>Sign in and create your dataset</li>
            <li>Share the link or QR code</li>
            <li>Collect & export your data</li>
          </ol>
        </section>

        <footer className="landing-footer">
          <p>© 2025 DoodleVault</p>
        </footer>
      </div>
    </div>
  );
} 