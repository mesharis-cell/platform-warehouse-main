export interface PlatformDomain {
    platform_name: string;
    platform_id: string;
    company_id: string;
    company_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    currency: string;
    features?: Record<string, boolean>;
    platform_features?: Record<string, boolean>;
    company_features?: Record<string, boolean>;
    /**
     * Admin-side derived flags: a feature is true here if the platform default
     * is true OR any company on the platform has overridden it to true.
     * Mirrors the API featureValidator middleware's union check for
     * ADMIN/LOGISTICS roles.
     */
    effective_admin_features?: Record<string, boolean>;
}
