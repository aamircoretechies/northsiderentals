import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
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

export function SupportPage() {
  const navigate = useNavigate();
  const [bookingNumber, setBookingNumber] = useState('');
  const [supportTitle, setSupportTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (supportTitle.trim().length < 3) {
      toast.error('Subject must be at least 3 characters');
      return;
    }
    if (description.trim().length < 5) {
      toast.error('Description must be at least 5 characters');
      return;
    }
    try {
      setSubmitting(true);
      await submitSupportIssue({
        title: supportTitle.trim(),
        description: description.trim(),
        reservation_ref: bookingNumber.trim() || undefined,
      });
      toast.success('Support request sent');
      setBookingNumber('');
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
      <Helmet>
        <title>Support Request</title>
      </Helmet>
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
                <Label htmlFor="description">Enter Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe your issue in detail..."
                  className="min-h-[150px] w-full"
                  value={description}
                  disabled={submitting}
                  onChange={(e) => setDescription(e.target.value)}
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
