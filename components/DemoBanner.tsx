import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="border-b border-cyan-700/40 bg-[#061528] px-4 py-2 text-center text-sm text-cyan-100">
      DEMO ENVIRONMENT — synthetic data and scripted AI. Not a Nasdaq system.{" "}
      <Link href="/about-demo" className="underline underline-offset-2 hover:text-white">
        About this demo
      </Link>
    </div>
  );
}
