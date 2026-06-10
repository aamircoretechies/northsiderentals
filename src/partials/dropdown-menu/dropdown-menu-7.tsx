import { ReactNode } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DropdownMenu7Props = {
  trigger: ReactNode;
  viewTo?: string;
  editTo?: string;
  onView?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
};

export function DropdownMenu7({
  trigger,
  viewTo,
  editTo,
  onView,
  onEdit,
  onRemove,
}: DropdownMenu7Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[150px]" side="bottom" align="end">
        {viewTo ? (
          <DropdownMenuItem asChild>
            <Link to={viewTo}>
              <Search />
              <span>View</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onView}>
            <Search />
            <span>View</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        {editTo ? (
          <DropdownMenuItem asChild>
            <Link to={editTo}>
              <Pencil />
              <span>Edit</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            <span>Edit</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRemove}>
          <Trash2 />
          <span>Remove</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
