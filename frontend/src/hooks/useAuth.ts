import { useState } from "react";

export const useStudentAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- LOGIN FUNCTION ---
  const login = async (roll_number: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roll_number, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      
      localStorage.setItem("token", data.token);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // --- REGISTER FUNCTION (The Missing Piece) ---
  const register = async (studentData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // MUST return register here so components can see it
  return { login, register, isLoading, error };
};