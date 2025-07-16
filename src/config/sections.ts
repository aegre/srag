// Section configuration for the quinceañera invitation
// Add or remove sections here to easily manage the invitation flow

export interface SectionConfig {
  id: string;
  name: string;
  componentPath: string;
  enabled: boolean;
}

export const sectionsConfig: SectionConfig[] = [
  {
    id: 'section-main-invitation',
    name: 'Main Invitation',
    componentPath: './sections/MainInvitation.astro',
    enabled: true,
  },
  {
    id: 'section-event-location',
    name: 'Event Location',
    componentPath: './sections/EventLocation.astro',
    enabled: true,
  },
  {
    id: 'section-details-rsvp',
    name: 'Details & RSVP',
    componentPath: './sections/DetailsRSVP.astro',
    enabled: true,
  },
  {
    id: 'section-thank-you',
    name: 'Thank You',
    componentPath: './sections/ThankYou.astro',
    enabled: false, // Set to true to enable this section
  },
  // Add more sections here as needed:
  // {
  //   id: 'section-photos',
  //   name: 'Photo Gallery',
  //   componentPath: './sections/PhotoGallery.astro',
  //   enabled: false,
  // },
  // {
  //   id: 'section-music',
  //   name: 'Music & Entertainment',
  //   componentPath: './sections/Music.astro',
  //   enabled: false,
  // },
];

// Helper function to get enabled sections
export const getEnabledSections = () =>
  sectionsConfig.filter(section => section.enabled);

// Helper function to get section IDs for the scroll manager
export const getEnabledSectionIds = () =>
  getEnabledSections().map(section => section.id); 