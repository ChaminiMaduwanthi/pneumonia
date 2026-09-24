"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const router = useRouter();
  const { data } = useSession();
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    role: "",
    dob: "",
    phone: "",
    total_scans: 0,
    created_at: "",
  });
  const [password, setPassword] = useState({ current_password: "", new_password: "" });

  useEffect(() => {
    const load = async () => {
      if (!data?.accessToken) return;
      const response = await fetch(`${API_BASE_URL}/user/profile.php`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const payload = await response.json();
      if (payload.success) setProfile((prev) => ({ ...prev, ...payload.data }));
    };
    void load();
  }, [data?.accessToken]);

  const updateProfile = async () => {
    if (!data?.accessToken) return;
    const response = await fetch(`${API_BASE_URL}/user/profile.php`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) return toast.error(payload.message ?? "Update failed");
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (!data?.accessToken) return;
    const response = await fetch(`${API_BASE_URL}/user/password.php`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(password),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) return toast.error(payload.message ?? "Password update failed");
    toast.success("Password changed");
    setPassword({ current_password: "", new_password: "" });
  };

  const deleteAccount = async () => {
    if (!confirm("Delete your account? This action cannot be undone.") || !data?.accessToken) return;
    const response = await fetch(`${API_BASE_URL}/user/delete.php`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) return toast.error(payload.message ?? "Delete failed");
    toast.success("Account deleted");
    router.push("/register");
  };

  return (
    <div className="container-wrap space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Full name"
              value={profile.full_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, full_name: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={profile.email}
              onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input placeholder="Role" value={profile.role} disabled />
            <Input type="date" value={profile.dob ?? ""} onChange={(e) => setProfile((prev) => ({ ...prev, dob: e.target.value }))} />
            <Input placeholder="Phone number" value={profile.phone ?? ""} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
          </div>
          <Button onClick={updateProfile}>Save Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="Current password"
            value={password.current_password}
            onChange={(e) => setPassword((prev) => ({ ...prev, current_password: e.target.value }))}
          />
          <Input
            type="password"
            placeholder="New password"
            value={password.new_password}
            onChange={(e) => setPassword((prev) => ({ ...prev, new_password: e.target.value }))}
          />
          <Button variant="outline" onClick={changePassword}>
            Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Total scans: {profile.total_scans}</p>
          <p>Member since: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</p>
          <Button variant="destructive" className="mt-4" onClick={deleteAccount}>
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
