import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { Container } from '@/components/common/container';
import { ArrowLeft, Phone, Mail } from 'lucide-react';

export function SupportPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
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
            <CardTitle className="text-2xl font-bold">Support</CardTitle>
            <CardDescription className="text-base">
              Please fill out the form below to submit a support request. We'll get back to you as soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bookingNumber">Enter Booking Number</Label>
                <Input
                  id="bookingNumber"
                  placeholder="e.g. BOK-12345"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportTitle">Enter Support Title</Label>
                <Input
                  id="supportTitle"
                  placeholder="Summary of the issue"
                  className="w-full"
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
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button type="submit" className="w-full sm:w-auto">
                  Submit Support Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
