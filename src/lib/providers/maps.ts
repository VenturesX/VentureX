export type GeoPoint = { lat: number; lng: number; label?: string };

export interface MapsProvider {
  name: string;
  navigationLinks(origin: GeoPoint | null, destination: GeoPoint): {
    google: string;
    apple: string;
    previewLabel: string;
  };
}

export class MockMapsProvider implements MapsProvider {
  name = "mock-maps";

  navigationLinks(origin: GeoPoint | null, destination: GeoPoint) {
    const dest = `${destination.lat},${destination.lng}`;
    const orig = origin ? `${origin.lat},${origin.lng}` : "";
    const google = orig
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
    const apple = `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&dirflg=d`;
    return {
      google,
      apple,
      previewLabel: destination.label ?? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`,
    };
  }
}

export function getMapsProvider(): MapsProvider {
  return new MockMapsProvider();
}
