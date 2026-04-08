import { DropdownMenu4 } from '@/partials/dropdown-menu/dropdown-menu-4';
import { DropdownMenu7 } from '@/partials/dropdown-menu/dropdown-menu-7';
import { EllipsisVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface IRecentUploadsItem {
  image: string;
  desc: string;
  date: string;
}
type IRecentUploadsItems = Array<IRecentUploadsItem>;

interface IRecentUploadsProps {
  title: string;
}

const RecentUploads = ({ title }: IRecentUploadsProps) => {
  const items: IRecentUploadsItems = [
    {
      image: 'doc.svg',
      desc: 'Driving License',
      date: 'uploaded on 10 Sep 2024 3:20 PM',
    },


  ];

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
