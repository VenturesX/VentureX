import { DriverApp } from "@/components/experience/driver-app";
import Link from "next/link";

export default function DrivePage() {
  return <><div className="mx-auto max-w-lg px-4 pt-4"><Link href="/team" className="inline-flex min-h-11 items-center text-sm text-[#9ecbff]">← Team hub</Link></div><DriverApp /></>;
}
