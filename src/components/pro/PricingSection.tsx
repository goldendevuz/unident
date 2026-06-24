"use client";

import { PricingTable } from "@clerk/nextjs";

export default function PricingSection() {
  const hasBilling =
    process.env.NEXT_PUBLIC_CLERK_BILLING_ENABLED === "true";

  if (!hasBilling) {
    return (
      <div className="text-center p-10 border rounded-2xl bg-muted/30">
        <h3 className="text-xl font-semibold mb-2">
          Billing is not enabled yet
        </h3>
        <p className="text-muted-foreground">
          Pricing plans will be available soon.
        </p>
      </div>
    );
  }

  return <PricingTable />;
}
