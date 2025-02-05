"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/loginpage.css"; // ✅ Ensure your custom CSS is loaded

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // API base URL (Uses `.env.local` for flexibility)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // ✅ Client-side validation before sending request
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok && data.success) {
        console.log("✅ Login successful!", data);
        localStorage.setItem("userId", data.userId); // Store user ID if needed
        router.push("/Orders"); // Redirect user to dashboard
      } else {
        setError(data.error || "Invalid login credentials.");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="form">
        <div className="sign-in-section">
          <h1>Log in</h1>

          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-options">
              <div className="checkbox-field">
                <input id="rememberMe" type="checkbox" />
                <label htmlFor="rememberMe">Remember Me</label>
              </div>
              <a href="#">Forgot Password?</a>
            </div>

            <button type="submit" className="btn btn-signin" disabled={loading}>
              {loading ? "Logging in..." : "Submit"}
            </button>
          </form>

          {/* ✅ Terms & Conditions and Privacy Policy Links */}
          <div className="links">
            <a href="/terms-and-conditions">Terms & Conditions</a>
            <a href="/privacy-policy">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
