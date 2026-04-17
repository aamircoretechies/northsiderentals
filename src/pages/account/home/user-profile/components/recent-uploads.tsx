import { useState } from 'react';
import { DropdownMenu7 } from '@/partials/dropdown-menu/dropdown-menu-7';
import { EllipsisVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface IRecentUploadsItem {
  id: string;
  image: string;
  desc: string;
  date: string;
  viewUrl: string;
}
type IRecentUploadsItems = Array<IRecentUploadsItem>;

interface IRecentUploadsProps {
  title: string;
}

const RecentUploads = ({ title }: IRecentUploadsProps) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<IRecentUploadsItems>([]);

  const renderItem = (item: IRecentUploadsItem, index: number) => {
    return (
      <div key={index} className="flex items-center gap-3">
        <div className="flex items-center grow gap-2.5">
          <img
            src={toAbsoluteUrl(`/media/file-types/${item.image}`)}
            alt="image"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-mono cursor-pointer hover:text-primary mb-px">
              {item.desc}
            </span>
            <span className="text-xs text-secondary-foreground">
              {item.date}
            </span>
          </div>
        </div>
        <DropdownMenu7
          viewTo={item.viewUrl}
          editTo="/account/home/user-profile?edit=1"
          onEdit={() => navigate('/account/home/user-profile?edit=1')}
          onRemove={() => {
            setItems((prev) => prev.filter((x) => x.id !== item.id));
            toast.success('File removed');
          }}
          trigger={
            <Button variant="ghost" mode="icon">
              <EllipsisVertical />
            </Button>
          }
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>

      </CardHeader>
      <CardContent>
        <div className="grid gap-2.5 lg:gap-5">
          {items.map((item, index) => {
            return renderItem(item, index);
          })}
        </div>
      </CardContent>

    </Card>
  );
};

export {
  RecentUploads,
  type IRecentUploadsItem,
  type IRecentUploadsItems,
  type IRecentUploadsProps,
};
