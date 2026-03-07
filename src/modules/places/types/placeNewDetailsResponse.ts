import { PlacesAddressComponent } from './placesAddressComponent';

export type PlaceNewDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  addressComponents?: PlacesAddressComponent[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
};
