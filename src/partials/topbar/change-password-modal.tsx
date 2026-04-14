import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { changePasswordApi } from '@/services/auth-password';

const passwordInputClass =
  'w-full bg-[#f2f4f8] border-0 rounded-[12px] pl-5 pr-12 py-4 text-[15px] text-[#2c3e50] placeholder:text-[#8692a6] focus:ring-1 focus:ring-[#0061e0] outline-none font-medium transition-shadow';

/** Module-level so inputs are not remounted every render (focus loss). */
function PasswordField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full shadow-sm rounded-[12px]">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className={passwordInputClass}
      />
      <button
        type="button"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5e6278] cursor-pointer hover:text-black transition-colors"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          <EyeOff className="w-5 h-5 stroke-[2]" />
        ) : (
          <Eye className="w-5 h-5 stroke-[2]" />
        )}
      </button>
    </div>
  );
}

export function ChangePasswordModal({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  const isAuthed = Boolean(auth?.access_token);
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleSubmit = async () => {
    if (!currentPassword.trim()) {
      toast.error('Enter your current password');
      return;
    }
    if (!newPassword.trim()) {
      toast.error('Enter a new password');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    try {
      setSubmitting(true);
      await changePasswordApi({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmNewPassword: confirmNewPassword.trim(),
      });
      toast.success('Password updated');
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="max-w-md w-full p-0 gap-0 overflow-hidden bg-[#f8f9fa] border-0 sm:rounded-[24px]"
        showCloseButton={false}
      >
        <div className="flex items-center p-4 pt-6 bg-[#f8f9fa]">
          <DialogClose className="p-2 -ml-2 text-black hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </DialogClose>
          <DialogTitle className="flex-1 text-center font-extrabold text-[20px] text-black pr-8">
            {isAuthed ? 'Change Password' : 'Password'}
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          {isAuthed
            ? 'Enter your current password, then your new password twice. Submit to update your account password.'
            : 'Sign in to change password from account settings, or reset password with email.'}
        </DialogDescription>

        <div className="px-5 pb-8 pt-4 overflow-y-auto max-h-[85vh] flex flex-col gap-4">
          {isAuthed ? (
            <>
              <PasswordField
                placeholder="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                disabled={submitting}
              />
              <PasswordField
                placeholder="New Password"
                value={newPassword}
                onChange={setNewPassword}
                disabled={submitting}
              />
              <PasswordField
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={setConfirmNewPassword}
                disabled={submitting}
              />

              <div className="mt-6 mb-2">
                <Button
                  type="button"
                  className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] cursor-pointer"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? 'Updating…' : 'Update'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center text-sm text-muted-foreground">
              <p className="text-foreground">
                Sign in to change your password while you are logged in, or use email
                reset if you forgot it.
              </p>
              <Button
                asChild
                className="w-full bg-[#ffc107] hover:bg-[#ffb000] text-black font-bold text-[16px] py-7 rounded-full"
              >
                <Link to="/auth/signin" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth/reset-password" onClick={() => setOpen(false)}>
                  Forgot password — reset by email
                </Link>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
