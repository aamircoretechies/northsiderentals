import { BlockList } from '@/pages/account/security/privacy-settings';
import { Highlights, Teams } from '@/pages/dashboards/demo1';
import { ManageData } from '@/pages/dashboards/demo2/components';
import { Integrations } from './components';

export function Demo3Content() {
  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
        </div>
        <div className="lg:col-span-1">
          <Highlights />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <Teams />
        </div>
        <div className="lg:col-span-1">
          <BlockList
            className="h-full"
            limit={3}
            text="Users on the block list are unable to send chat requests or messages to you anymore, ever, or again"
          />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <Integrations />
        </div>
        <div className="lg:col-span-1">
          <ManageData className="h-full" />
        </div>
      </div>
    </div>
  );
}
