import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function SupportPage() {
  return (
    <>
      <Helmet>
        <title>Support Request</title>
      </Helmet>
      <div className="container max-w-2xl mt-8 mb-12 mx-auto">
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
                <Label htmlFor="description">Enter Description</Label>
                <Textarea
                  id="description"
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
      </div>
    </>
  );
}
