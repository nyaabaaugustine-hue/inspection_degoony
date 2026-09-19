"use client";

import PremiumRedirect from "@/components/PremiumRedirect";

export default function WebmailButton() {
  return (
    <PremiumRedirect
      tileClass="dash-webmail"
      icon="📧"
      label="WEBMAIL"
      sub="degoonyevergreen.com business email"
      url="https://mail.omucloud.co/degoonyevergreen.com"
      overlayClass="overlay-webmail"
      loaderTitle="Loading Email Server..."
      loaderIcon="📧"
    />
  );
}
