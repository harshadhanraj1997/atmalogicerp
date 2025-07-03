"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/loginpage.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // ✅ Client-side validation before credential check
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      setLoading(false);
      return;
    }

    // ✅ Dummy credentials check
    if (username === "harsha123" && password === "google1234") {
      console.log("✅ Login successful!");
      localStorage.setItem("userId", "dummyUserId"); // Optionally store a dummy user ID
      router.push("/Orders"); // Redirect to Orders page
    } else {
      setError("Invalid username or password.");
    }

    setLoading(false);
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

            {error && <p style={{ color: "red" }}>{error}</p>}

            <button type="submit" className="btn btn-signin" disabled={loading}>
              {loading ? "Logging in..." : "Submit"}
            </button>
          </form>

          <div className="links">
            <a href="/terms-and-conditions">Terms & Conditions</a>
            <a href="/privacy-policy">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
