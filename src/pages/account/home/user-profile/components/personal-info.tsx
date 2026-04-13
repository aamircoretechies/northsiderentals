import { toast } from 'sonner';
import { AvatarInput } from '@/partials/common/avatar-input';
import { SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { EditProfileModal } from './edit-profile-modal';
import { useAuth } from '@/auth/context/auth-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';

function dash(value: string | null | undefined) {
  const v = (value ?? '').trim();
  return v.length ? v : '—';
}

const PersonalInfo = () => {
  const { user } = useAuth();
  const {
    profile,
    apiProfile,
    rcmProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    profileBusy,
  } = useDashboardData();

  const fullName = dash(profile.displayName);
  const phone = dash(profile.phone || user?.phone);
  const email = dash(profile.email || user?.email);
  const localAddr = dash(
    rcmProfile?.address?.local_address || apiProfile?.local_address,
  );
  const postalAddr = dash(
    rcmProfile?.address?.postal_address || apiProfile?.postal_address,
  );

  return (
    <Card className="min-w-full">
      <CardHeader>
        <CardTitle>Personal Info</CardTitle>
        <EditProfileModal>
          <Button variant="ghost" mode="icon">
            <SquarePen size={16} className="text-blue-500" />
          </Button>
        </EditProfileModal>
      </CardHeader>
      <CardContent className="kt-scrollable-x-auto p-0 pb-3">
        <Table className="align-middle text-sm text-muted-foreground">
          <TableBody>
            <TableRow>
              <TableCell className="min-w-28 py-2 font-normal text-secondary-foreground">
                Photo
              </TableCell>
              <TableCell className="min-w-32 py-2 text-sm font-normal text-gray700">
                150x150px JPEG, PNG Image
              </TableCell>
              <TableCell className="py-2 text-center">
                <div className="flex items-center justify-center">
                  <AvatarInput
                    compact
                    remoteImageUrl={profile.avatarUrl}
                    onPickFile={async (file) => {
                      try {
                        await uploadProfilePicture(file);
                        toast.success('Photo updated');
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : 'Upload failed',
                        );
                      }
                    }}
                    onRemoveRemote={
                      profile.avatarUrl
                        ? async () => {
                            try {
                              await deleteProfilePicture();
                              toast.success('Photo removed');
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : 'Remove failed',
                              );
                            }
                          }
                        : undefined
                    }
                    busy={profileBusy}
                  />
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2 font-normal text-secondary-foreground">
                Full Name
              </TableCell>
              <TableCell className="py-2 text-sm font-normal text-foreground">{fullName}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-3 font-normal text-secondary-foreground">
                Phone Number
              </TableCell>
              <TableCell className="py-3 font-normal text-foreground">{phone}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="min-w-36 py-2 font-normal text-secondary-foreground">
                Email
              </TableCell>
              <TableCell className="min-w-60 py-2">
                {email !== '—' ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-sm font-normal text-foreground hover:text-primary-active"
                  >
                    {email}
                  </a>
                ) : (
                  <span className="text-sm font-normal text-foreground">{email}</span>
                )}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="py-3">Local address</TableCell>
              <TableCell className="py-3 text-sm font-normal text-secondary-foreground">
                {localAddr}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-3">Postal address</TableCell>
              <TableCell className="py-3 text-sm font-normal text-secondary-foreground">
                {postalAddr}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { PersonalInfo };
