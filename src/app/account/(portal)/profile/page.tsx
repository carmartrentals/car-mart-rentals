import { requireCustomer } from "@/lib/account";
import { ProfileForm } from "@/components/account/profile-form";

export default async function ProfilePage() {
  const customer = await requireCustomer();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="eyebrow">Account</p>
        <h1 className="heading-display mt-2 text-2xl font-bold text-white">
          Profile &amp; Settings
        </h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Update your contact details and account password.
        </p>
      </div>

      <ProfileForm
        initial={{
          first_name: customer.first_name ?? "",
          last_name: customer.last_name ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
          zip: customer.zip ?? "",
        }}
      />
    </div>
  );
}
