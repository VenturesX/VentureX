import { HotelDesk } from "@/components/light/hotel";

export default async function HotelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <HotelDesk token={token} />;
}
