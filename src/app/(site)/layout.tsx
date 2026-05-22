import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { getCompanyProfile } from "@/lib/data/settings";
import { aiConfigured } from "@/lib/ai";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const company = await getCompanyProfile();
  return (
    <div className="flex min-h-screen flex-col bg-brand-950 text-slate-300">
      <Navbar phone={company.phone} phoneHref={company.phoneHref} />
      <main className="flex-1">{children}</main>
      <Footer />
      {aiConfigured() && <ChatWidget companyName={company.name} />}
    </div>
  );
}
