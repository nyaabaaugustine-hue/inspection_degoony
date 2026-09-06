import type { Metadata } from "next";
import "./globals.css";
import Gate from "@/components/Gate";

export const metadata: Metadata = {
  title: "Evergreen Logistics — Vehicle Inspection",
  description: "Pre & Post deployment vehicle inspection evidence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Gate>{children}</Gate>
      </body>
    </html>
  );
}
