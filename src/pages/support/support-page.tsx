import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { Container } from '@/components/common/container';
import { Phone } from 'lucide-react';
import { submitSupportIssue } from '@/services/support';
import { getFriendlyError } from '@/utils/api-error-handler';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SupportPage() {
  const navigate = useNavigate();
  const { user, auth } = useAuth();
  const { profile, rcmProfile } = useDashboardData();
  const isAuthed = Boolean(auth?.access_token);
  const profileEmail = String(
    rcmProfile?.email ?? profile.email ?? user?.email ?? '',
  ).trim();
  const emailFromProfile = isAuthed && Boolean(profileEmail);

  const [bookingNumber, setBookingNumber] = useState('');
  const [email, setEmail] = useState('');
  const [supportTitle, setSupportTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthed) {
      setEmail(profileEmail);
    }
  }, [isAuthed, profileEmail]);

  const handleSubmit = async () => {
    const title = supportTitle.trim();
    const details = description.trim();
    const contactEmail = (isAuthed ? profileEmail || email : email).trim();
    if (!title) {
      toast.error('Support title is required.');
      return;
    }
    if (title.length < 3) {
      toast.error('Support title must be at least 3 characters.');
      return;
    }
    if (!details) {
      toast.error('Description is required.');
      return;
    }
    if (details.length < 5) {
      toast.error('Description must be at least 5 characters.');
      return;
    }
    if (!contactEmail) {
      toast.error('Email is required.');
      return;
    }
    if (!EMAIL_PATTERN.test(contactEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    try {
      setSubmitting(true);
      await submitSupportIssue({
        title,
        description: details,
        email: contactEmail,
        reservation_ref: bookingNumber.trim() || undefined,
      });
      toast.success('Support request sent');
      setBookingNumber('');
      if (!isAuthed) setEmail('');
      setSupportTitle('');
      setDescription('');
    } catch (e) {
      toast.error(getFriendlyError(e, 'Could not send support request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* <Helmet>
        <title>Support</title>
      </Helmet> */}
      <Container>

        <div className='max-w-3xl mx-auto mb-4'>
          <Button onClick={() => navigate('/help')} className="w-full bg-[#0061e0] hover:bg-[#0051ba] text-white font-semibold text-[16px] py-7 rounded-full shadow-sm mb-4 cursor-pointer">
            <div className="flex items-center justify-center gap-2">
              <div className="bg-[#ffc107] p-1 rounded-full text-[#0061e0]">
                <Phone className="w-4 h-4 fill-current text-white" />
              </div>
              Need Quick Help?
            </div>
          </Button>
        </div>

        {/* <Button className="mb-4 w-full mx-auto max-w-[]" onClick={() => navigate('/help')}>Need Quick Help?</Button> */}
        <Card>
          <CardHeader className='py-4'>
            <CardTitle className="text-2xl font-bold">Support Request</CardTitle>
            <CardDescription className="text-base">
              Please fill out the form below to submit a support request. We'll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="w-full"
                  value={email}
                  readOnly={emailFromProfile}
                  disabled={submitting || emailFromProfile}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingNumber">Enter Booking Number</Label>
                <Input
                  id="bookingNumber"
                  placeholder="e.g. BOK-12345"
                  className="w-full"
                  value={bookingNumber}
                  disabled={submitting}
                  onChange={(e) => setBookingNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportTitle">Enter Support Title</Label>
                <Input
                  id="supportTitle"
                  placeholder="Summary of the issue"
                  className="w-full"
                  value={supportTitle}
                  disabled={submitting}
                  onChange={(e) => setSupportTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description">Enter Description</Label>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {description.length}/500 characters
                  </span>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  placeholder="Please describe your issue in detail..."
                  className="min-h-[150px] w-full"
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Submit Support Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
