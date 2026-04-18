import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { AvatarInput } from '@/partials/common/avatar-input';
import { ProfileAvatarImage } from '@/components/common/profile-avatar-image';
import { SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { EditProfileModal } from './edit-profile-modal';
import { useAuth } from '@/auth/context/auth-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { getFriendlyError } from '@/utils/api-error-handler';

function dash(value: string | null | undefined) {
  const v = (value ?? '').trim();
  return v.length ? v : '—';
}

const PersonalInfo = () => {
  const navigate = useNavigate();
  const { user, auth } = useAuth();
  const canEditProfile = Boolean(auth?.access_token);
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
        {canEditProfile ? (
          <EditProfileModal>
            <Button variant="ghost" mode="icon">
              <SquarePen size={16} className="text-blue-500" />
            </Button>
          </EditProfileModal>
        ) : (
          <Button
            variant="ghost"
            mode="icon"
            title="Sign in to edit your profile"
            onClick={() => {
              toast.info('Sign in to edit your profile');
              navigate(
                `/auth/signin?next=${encodeURIComponent('/account/home/user-profile')}`,
              );
            }}
          >
            <SquarePen size={16} className="text-blue-500 opacity-50" />
          </Button>
        )}
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
                  {canEditProfile ? (
                    <AvatarInput
                      compact
                      remoteImageUrl={profile.avatarUrl}
                      fallbackLabel={
                        profile.displayName ||
                        user?.email?.split('@')[0] ||
                        ''
                      }
                      onPickFile={async (file) => {
                        try {
                          await uploadProfilePicture(file);
                          toast.success('Photo updated');
                        } catch (e) {
                          toast.error(getFriendlyError(e, 'Upload failed'));
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
                                  getFriendlyError(e, 'Could not remove photo'),
                                );
                              }
                            }
                          : undefined
                      }
                      busy={profileBusy}
                    />
                  ) : (
                    <div className="size-10 shrink-0 overflow-hidden rounded-full border-2 border-green-500 bg-muted aspect-square">
                      <ProfileAvatarImage
                        src={profile.avatarUrl}
                        fallbackLabel={fullName === '—' ? '' : fullName}
                        alt=""
                        className="size-full object-cover"
                        fallbackClassName="size-full"
                      />
                    </div>
                  )}
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
                <span className="text-sm font-normal text-foreground">{email}</span>
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
