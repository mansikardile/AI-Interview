import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewIQ — Practice with purpose",
  description:
    "Adaptive mock interviews with answer-grounded feedback and optional session observations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Interview<span>IQ</span>
            <span className="brand-dot" />
          </Link>
          <div className="row">
            <span className="small muted">Build understanding. Practice deliberately.</span>
            <Link href="/interview/demo" className="small text-link">
              Developer fixture
            </Link>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          Open-source mock interview starter · Your practice, your controls.
        </footer>
      </body>
    </html>
  );
}
