import { useState } from "react";
import { useAuthStore } from "../../app/stores/authStore";
import { useUIStore } from "../../app/stores/uiStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import { Button } from "../../shared/components/ui/button";
import { Avatar } from "../../shared/components/ui/avatar";
import { Separator } from "../../shared/components/ui/separator";
import { Mail, User, AtSign, Info } from "lucide-react";

// ── Trang Profile ──
// Route: /profile
// Quyền: tất cả user đã đăng nhập
// Cho phép xem và chỉnh sửa thông tin cá nhân (displayName, bio)
// Email và username là read-only
export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");

  // Chưa đăng nhập → không render gì
  if (!user) return null;

  // ── Lưu thay đổi ──
  const handleSave = () => {
    setUser({ ...user, displayName, bio });
    addToast({
      type: "success",
      title: "Profile updated",
      message: "Your changes have been saved.",
    });
  };

  // ── Reset form về giá trị gốc ──
  const handleReset = () => {
    setDisplayName(user.displayName);
    setBio(user.bio || "");
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Profile</h1>
        <p className="text-sm text-on-surface-variant/70 mt-1">
          Manage your account settings and profile information
        </p>
      </div>

      {/* Card: Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar + tên + role */}
          <div className="flex items-center gap-4">
            <Avatar name={user.displayName} size="lg" />
            <div>
              <p className="text-sm font-medium text-on-surface">
                {user.displayName}
              </p>
              <p className="text-xs text-on-surface-variant/70">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          <Separator />

          {/* Form fields: Display Name, Email (disabled), Username (disabled), Bio */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                />
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                />
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <div className="relative">
                <Info
                  size={16}
                  className="absolute left-3 top-3 text-on-surface-variant/50"
                />
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full min-h-[80px] pl-9 pr-3 py-2 text-sm border border-primary bg-white text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
          </div>

          {/* Nút Reset / Save */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleReset}>
              Reset
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Card: Account Details (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2.5 border-b border-border-light/30">
            <span className="text-sm text-on-surface">Role</span>
            <span className="text-sm font-medium text-on-surface-variant/70">
              {user.role.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-border-light/30">
            <span className="text-sm text-on-surface">Member Since</span>
            <span className="text-sm text-on-surface-variant/70">
              January 2026
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-on-surface">Password</span>
            <Button variant="ghost" size="sm">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
