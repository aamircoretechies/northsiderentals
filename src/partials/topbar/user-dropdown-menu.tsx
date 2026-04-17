import { ReactNode } from 'react';
import { ChangePasswordModal } from './change-password-modal';
import { SupportIssueModal } from './support-issue-modal';
import { useAuth } from '@/auth/context/auth-context';
import { I18N_LANGUAGES } from '@/i18n/config';
import { Language } from '@/i18n/types';
import {
  BetweenHorizontalStart,
  Coffee,
  CreditCard,
  FileText,
  Globe,
  IdCard,
  LifeBuoy,
  Moon,
  Settings,
  Shield,
  SquareCode,
  UserCircle,
  PencilIcon,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router';
import { ProfileAvatarImage } from '@/components/common/profile-avatar-image';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useLanguage } from '@/providers/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { logout, auth } = useAuth();
  const isAuthed = Boolean(auth?.access_token);
  const { profile, rcmProfile } = useDashboardData();
  const { currenLanguage, changeLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const displayName = profile.displayName;
  const displayEmail = profile.email;
  const socialMethod = String(rcmProfile?.method ?? '').toLowerCase();
  // Only hide password actions for explicit Google-auth accounts.
  // Some email/password accounts can still have is_social_login=true from backend flags.
  const isGoogleUser = socialMethod.includes('google');

  const handleLanguage = (lang: Language) => {
    changeLanguage(lang);
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="size-9 shrink-0 overflow-hidden rounded-full border-2 border-green-500">
              <ProfileAvatarImage
                src={profile.avatarUrl}
                fallbackLabel={displayName}
                alt=""
                className="size-full object-cover"
                fallbackClassName="size-full"
              />
            </div>
            <div className="flex flex-col">
              <Link
                to="/account/home/user-profile"
                className="text-sm text-mono hover:text-primary font-semibold"
              >
                {displayName}
              </Link>
              {displayEmail.trim() ? (
                <a
                  href={`mailto:${displayEmail}`}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {displayEmail}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {isAuthed ? 'No email on file' : 'Browsing as guest'}
                </span>
              )}
            </div>
          </div>

        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        {/*  <DropdownMenuItem asChild>
          <Link
            to="/public-profile/profiles/default"
            className="flex items-center gap-2"
          >
            <IdCard />
            Public Profile
          </Link>
        </DropdownMenuItem> */}
        {isAuthed && (
          <>
            <DropdownMenuItem asChild>
              <Link
                to="/account/home/user-profile"
                className="flex items-center gap-2"
              >
                <UserCircle />
                My Profile
              </Link>
            </DropdownMenuItem>

            {!isGoogleUser ? (
              <ChangePasswordModal>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <PencilIcon size={16} />
                  Change Password
                </DropdownMenuItem>
              </ChangePasswordModal>
            ) : null}
          </>
        )}

        <SupportIssueModal>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="flex items-center gap-2 cursor-pointer"
          >
            <LifeBuoy size={16} />
            Contact support
          </DropdownMenuItem>
        </SupportIssueModal>

        {/* My Account Submenu */}
        {/* <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Settings />
            My Account
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem asChild>
              <Link
                to="/account/home/get-started"
                className="flex items-center gap-2"
              >
                <Coffee />
                Get Started
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/home/user-profile"
                className="flex items-center gap-2"
              >
                <FileText />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/billing/basic"
                className="flex items-center gap-2"
              >
                <CreditCard />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/security/overview"
                className="flex items-center gap-2"
              >
                <Shield />
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/members/teams"
                className="flex items-center gap-2"
              >
                <Users />
                Members & Roles
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/integrations"
                className="flex items-center gap-2"
              >
                <BetweenHorizontalStart />
                Integrations
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub> */}

        {/*  <DropdownMenuItem asChild>
          <Link
            to="https://devs.keenthemes.com"
            className="flex items-center gap-2"
          >
            <SquareCode />
            Dev Forum
          </Link>
        </DropdownMenuItem> */}

        {/* Language Submenu with Radio Group */}
        {/*  <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 [&_[data-slot=dropdown-menu-sub-trigger-indicator]]:hidden hover:[&_[data-slot=badge]]:border-input data-[state=open]:[&_[data-slot=badge]]:border-input">
            <Globe />
            <span className="flex items-center justify-between gap-2 grow relative">
              Language
              <Badge
                variant="outline"
                className="absolute end-0 top-1/2 -translate-y-1/2"
              >
                {currenLanguage.label}
                <img
                  src={currenLanguage.flag}
                  className="w-3.5 h-3.5 rounded-full"
                  alt={currenLanguage.label}
                />
              </Badge>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={currenLanguage.code}
              onValueChange={(value) => {
                const selectedLang = I18N_LANGUAGES.find(
                  (lang) => lang.code === value,
                );
                if (selectedLang) handleLanguage(selectedLang);
              }}
            >
              {I18N_LANGUAGES.map((item) => (
                <DropdownMenuRadioItem
                  key={item.code}
                  value={item.code}
                  className="flex items-center gap-2"
                >
                  <img
                    src={item.flag}
                    className="w-4 h-4 rounded-full"
                    alt={item.label}
                  />
                  <span>{item.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub> */}

        <DropdownMenuSeparator />

        {/* Footer */}
        {/* <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem> */}
        <div className="p-2 mt-1">
          {isAuthed ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={logout}
            >
              Logout
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/auth/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
