import { AvatarInput } from '@/partials/common/avatar-input';
import { SquarePen } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { EditProfileModal } from './edit-profile-modal';

const PersonalInfo = () => {
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
      <CardContent className="kt-scrollable-x-auto pb-3 p-0">
        <Table className="align-middle text-sm text-muted-foreground">
          <TableBody>
            <TableRow>
              <TableCell className="py-2 min-w-28 text-secondary-foreground font-normal">
                Photo
              </TableCell>
              <TableCell className="py-2 text-gray700 font-normal min-w-32 text-sm">
                150x150px JPEG, PNG Image
              </TableCell>
              <TableCell className="py-2 text-center">
                <div className="flex justify-center items-center">
                  <AvatarInput />
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2 text-secondary-foreground font-normal">
                Full Name
              </TableCell>
              <TableCell className="py-2 text-foreground font-normaltext-sm">
                Jason Tatum
              </TableCell>

            </TableRow>
            <TableRow>
              <TableCell className="py-3 text-secondary-foreground font-normal">
                Phone Number
              </TableCell>
              <TableCell className="py-3 text-foreground font-normal">
                +1 234 567 8901
              </TableCell>

            </TableRow>
            <TableRow>
              <TableCell className="py-2 min-w-36 text-secondary-foreground font-normal">
                Email
              </TableCell>
              <TableCell className="py-2 min-w-60">
                <Link
                  to="#"
                  className="text-foreground font-normal text-sm hover:text-primary-active"
                >
                  jasontt@studio.co
                </Link>
              </TableCell>

            </TableRow>


            <TableRow>
              <TableCell className="py-3">Address</TableCell>
              <TableCell className="py-3 text-secondary-foreground text-sm font-normal">
                -
              </TableCell>

            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { PersonalInfo };
