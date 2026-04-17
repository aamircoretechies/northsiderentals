import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { profileService } from '@/services/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { rcmProfile } = useDashboardData();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      toast.error('Please confirm deleting account first');
      return;
    }
    try {
      setDeleting(true);
      await profileService.deleteAccount(rcmProfile?.user_id);
      toast.success('Account deleted');
      logout();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete account',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader id="delete_account">
        <CardTitle>Delete Account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col lg:py-7.5 lg:gap-7.5 gap-3">
        <div className="flex flex-col gap-5">
          <div className="text-sm text-foreground">
            We regret to see you leave. Confirm account deletion below. Your
            data will be permanently removed. Thank you for being part of our
            community. Please check our{' '}
            <Button mode="link" onClick={() => navigate('/account/home/get-started')}>
              Setup Guidelines
            </Button>{' '}
            if you still wish continue.
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={confirmDelete}
              onCheckedChange={(checked) => setConfirmDelete(Boolean(checked))}
            />
            <Label>Confirm deleting account</Label>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => navigate('/account/home/user-profile')}>
            Deactivate Instead
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={() => void handleDeleteAccount()}
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { DeleteAccount };
