import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }} />
      <div className="fixed inset-0 bg-background/80" />
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="glass-card rounded-2xl p-8 space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold font-display">Reset Password</h1>
            <p className="text-sm text-muted-foreground">Enter your new password</p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-secondary/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors"
            />
            <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full h-12 rounded-xl">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
