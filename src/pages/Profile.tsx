import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Mail, Lock, Loader2, LogOut, Shield, Calendar, Camera, Save, Link2, Unlink,
} from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import { useGmailConnection } from "@/hooks/useGmailConnection";

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { profile, refetch } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gmailSectionRef = useRef<HTMLElement>(null);
  const { connection: gmailConnection, isExpired: gmailExpired, loading: gmailLoading, connecting: connectingGmail, disconnecting: disconnectingGmail, startOAuth, disconnect, refetchConnection } = useGmailConnection();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Derive display values
  const nameValue = displayName ?? profile?.display_name ?? "";
  const initials = (profile?.display_name || user?.email || "U").slice(0, 2).toUpperCase();
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const provider = user?.app_metadata?.provider === "google" ? "Google" : "Email & Password";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    const gmailError = params.get("gmail_error");
    const focus = params.get("focus");

    if (focus === "gmail") {
      window.setTimeout(() => {
        gmailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }

    if (gmail === "connected") {
      toast.success("Gmail connected");
      params.delete("gmail");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, document.title, nextUrl);
      void refetchConnection();
    }
    if (gmailError) {
      toast.error(`Gmail connection failed: ${gmailError}`);
      params.delete("gmail_error");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, [refetchConnection]);

  const handleSaveDisplayName = async () => {
    if (!user) return;
    if (displayName === null || displayName === (profile?.display_name ?? "")) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName || null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Display name updated");
      await refetch();
      setDisplayName(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update display name");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      toast.success("Avatar updated");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleConnectGmail = async () => {
    if (!user) {
      toast.error("Please sign in to connect Gmail.");
      return;
    }
    try {
      await startOAuth(window.location.href);
    } catch (e: any) {
      toast.error(e?.message || "Failed to connect Gmail");
    }
  };

  const handleDisconnectGmail = async () => {
    if (!user) {
      toast.error("Please sign in to disconnect Gmail.");
      return;
    }
    try {
      await disconnect();
      toast.success("Gmail disconnected");
    } catch (e: any) {
      toast.error(e?.message || "Failed to disconnect Gmail");
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading account...
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-6 h-14">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="font-display text-sm font-semibold text-foreground">Account</span>
          <ThemeToggle />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        {/* Profile header */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar className="h-16 w-16 border border-border">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-display font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploadingAvatar
                ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                : <Camera className="h-5 w-5 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {profile?.display_name || user.email}
            </h1>
            {profile?.display_name && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Manage your account details and preferences
            </p>
          </div>
        </div>

        <Separator />

        {/* Display name */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Display Name</h2>
          <div className="flex gap-3 max-w-sm">
            <Input
              value={nameValue}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleSaveDisplayName}
              disabled={savingName || displayName === null || displayName === (profile?.display_name ?? "")}
              className="gap-1.5"
            >
              {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </section>

        <Separator />

        {/* Gmail connection */}
        <section ref={gmailSectionRef} className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Gmail Integration</h2>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
            {gmailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking Gmail connection...
              </div>
            ) : gmailConnection && !gmailExpired ? (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Connected as {gmailConnection.google_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {gmailConnection.expires_at ? `Token expires: ${new Date(gmailConnection.expires_at).toLocaleString()}` : "Token expiry unavailable"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleConnectGmail} disabled={connectingGmail} className="gap-1.5">
                    {connectingGmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Reconnect Gmail
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDisconnectGmail} disabled={disconnectingGmail} className="gap-1.5">
                    {disconnectingGmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                    Disconnect
                  </Button>
                </div>
              </>
            ) : gmailConnection && gmailExpired ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Gmail connection expired</p>
                  <p className="text-xs text-muted-foreground">Reconnect Gmail to keep direct send working.</p>
                </div>
                <Button size="sm" onClick={handleConnectGmail} disabled={connectingGmail} className="gap-1.5">
                  {connectingGmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Reconnect Gmail
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">Connect Gmail to send emails directly from MailCraft.</p>
                <Button size="sm" onClick={handleConnectGmail} disabled={connectingGmail} className="gap-1.5">
                  {connectingGmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Connect Gmail
                </Button>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Account details */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Account Details</h2>
          <div className="grid gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Sign-in method</p>
                <p className="text-sm font-medium text-foreground">{provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="text-sm font-medium text-foreground">{createdAt}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Change password */}
        {provider === "Email & Password" && (
          <>
            <Separator />
            <section className="space-y-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Change Password</h2>
              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs text-muted-foreground">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="pl-10" required minLength={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pl-10" required minLength={6} />
                  </div>
                </div>
                <Button type="submit" size="sm" disabled={updatingPassword}>
                  {updatingPassword ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…</> : "Update password"}
                </Button>
              </form>
            </section>
          </>
        )}

        <Separator />

        {/* Sign out */}
        <section>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign back in to access your drafts and settings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
};

export default Profile;
