import { RSALaundryAsset, SchedulableProperty } from './types';

/**
 * Utility functions for property management
 */

export const ASSET_TYPES = {
  LAUNDRY_SERVICE: 'LAUNDRY_SERVICE' as const,
  MAINTENANCE_SERVICE: 'MAINTENANCE_SERVICE' as const,
  OTHER_SERVICE: 'OTHER_SERVICE' as const,
} as const;

export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES];

/**
 * Check if a property is an internal asset
 */
export function isRSALaundryAsset(property: SchedulableProperty): boolean {
  return property.property_category === 'internal_asset';
}

/**
 * Check if a property is a regular apartment
 */
export function isRegularApartment(property: SchedulableProperty): boolean {
  return property.property_category === 'apartment';
}

/**
 * Check if an RSA asset is a laundry service
 */
export function isLaundryService(asset: RSALaundryAsset): boolean {
  return asset.asset_type === ASSET_TYPES.LAUNDRY_SERVICE;
}

/**
 * Check if an RSA asset is active
 */
export function isActiveAsset(asset: RSALaundryAsset): boolean {
  return asset.is_active === true;
}

/**
 * Get the display name for a property (without "Apartment" prefix for RSA assets)
 */
export function getPropertyDisplayName(property: SchedulableProperty): string {
  if (isRSALaundryAsset(property)) {
    return property.property_name;
  }
  return `Apartment ${property.property_name}`;
}

/**
 * Get the asset type display name
 */
export function getAssetTypeDisplayName(assetType?: AssetType): string {
  switch (assetType) {
    case ASSET_TYPES.LAUNDRY_SERVICE:
      return 'Laundry Service';
    case ASSET_TYPES.MAINTENANCE_SERVICE:
      return 'Maintenance Service';
    case ASSET_TYPES.OTHER_SERVICE:
      return 'Other Service';
    default:
      return 'Unknown';
  }
}

/**
 * Get the daily payment rate for a property (for RSA assets)
 */
export function getDailyPaymentRate(property: SchedulableProperty): number {
  return property.daily_payment_rate || 0;
}

/**
 * Check if a property requires daily payment tracking
 */
export function requiresDailyPaymentTracking(property: SchedulableProperty): boolean {
  return isRSALaundryAsset(property) && property.daily_payment_rate !== undefined;
}

/**
 * Get RSA laundry assets from a list
 */
export function getRSALaundryAssets(properties: SchedulableProperty[]): SchedulableProperty[] {
  return properties.filter(isRSALaundryAsset);
}

/**
 * Get regular apartment properties from a list
 */
export function getRegularApartmentProperties(properties: SchedulableProperty[]): SchedulableProperty[] {
  return properties.filter(isRegularApartment);
}

/**
 * Get active RSA laundry assets from a list
 */
export function getActiveRSALaundryAssets(assets: RSALaundryAsset[]): RSALaundryAsset[] {
  return assets.filter(isActiveAsset);
}

/**
 * Get laundry service assets from a list
 */
export function getLaundryServiceAssets(assets: RSALaundryAsset[]): RSALaundryAsset[] {
  return assets.filter(isLaundryService);
}

/**
 * Check if a property name is "RSA Laundry Room"
 */
export function isRSALaundryRoom(propertyName: string): boolean {
  return propertyName === 'RSA Laundry Room';
}
