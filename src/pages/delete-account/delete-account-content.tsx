import { Mail, Shield, Trash2, Info } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';

export function DeleteAccountContent() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f8f9fa] pb-20 px-4 pt-10 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-center mb-8">
        <img
          src={toAbsoluteUrl('/media/app/logo-nsr.svg')}
          className="h-12 w-auto object-contain"
          alt="NorthSide Rentals Logo"
        />
      </div>
      <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-gray-100">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Account Deletion Request</h1>
          <p className="text-blue-600 font-semibold">App Name: NorthSide Rentals</p>
        </div>

        <div className="space-y-10">
          <section>
            <p className="text-lg text-gray-600 leading-relaxed text-center">
              If you would like to delete your NorthSide Rentals account and associated personal data, please contact our support team.
            </p>
          </section>

          <section className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              How to request account deletion:
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-gray-900">Email us at:</p>
                  <a href="mailto:support@northsiderentals.com.au" className="text-blue-600 hover:underline font-medium">support@northsiderentals.com.au</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                <p className="text-gray-700"><span className="font-semibold text-gray-900">Use the subject line:</span> Account Deletion Request</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                <p className="text-gray-700"><span className="font-semibold text-gray-900">Include the email address or mobile number</span> linked with your app account.</p>
              </li>
            </ul>
            <div className="mt-6 pt-6 border-t border-blue-100 italic text-blue-800 text-sm">
              Once we receive your request, we will verify your identity and process the account deletion request within 30 days.
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Data that will be deleted:
              </h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Account profile information
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Contact details linked with the account
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  App login/account access data
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Saved user preferences, where applicable
                </li>
              </ul>
            </section>

            <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 text-amber-600">
                <Shield className="w-5 h-5" />
                Data that may be retained:
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Some booking, payment, invoice, transaction, fraud prevention, security, or legal compliance records may be retained where required by law or legitimate business obligations.
              </p>
            </section>
          </div>

          <section className="bg-red-50 rounded-2xl p-6 border border-red-100 flex items-start gap-4">
            <Info className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <p className="text-red-900 font-medium leading-relaxed">
              After your account is deleted, you may lose access to your booking history and app-related account services.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
