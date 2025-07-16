# Modular Sections System

This directory contains individual section components for the quinceañera invitation. The system is designed to make it easy to add, remove, or modify sections without affecting the overall structure.

## How it Works

Each section is a separate Astro component that follows a consistent structure:

```astro
---
// Section-specific logic (if any)
---

<section class="min-h-[600px] p-8 flex flex-col justify-center snap-start relative" id="section-unique-id">
  <!-- Section content -->
</section>
```

## Adding a New Section

1. **Create a new section component** in this directory (e.g., `MyNewSection.astro`)
2. **Follow the section template** with a unique ID
3. **Import the section** in `Welcome.astro`
4. **Add it to the sections array** with an `enabled: true` flag
5. **Include it** in the render section

### Example:

```astro
// MyNewSection.astro
---
---

<section class="min-h-[600px] p-8 flex flex-col justify-center snap-start relative" id="section-my-new-section">
  <div class="relative z-10 space-y-8">
    <header class="space-y-3">
      <h2 class="font-hero text-2xl tracking-[0.2em] text-secondary-light uppercase font-medium">
        My New Section
      </h2>
      <hr class="w-20 h-px bg-gradient-to-r from-transparent via-secondary-light to-transparent mx-auto border-0" aria-hidden="true" />
    </header>
    <!-- Your content here -->
  </div>
</section>
```

Then in `Welcome.astro`:

```astro
import MyNewSection from './sections/MyNewSection.astro';

const sections = [
  // ... existing sections
  { id: 'section-my-new-section', component: MyNewSection, enabled: true },
];

// And in the render section:
<MyNewSection />
```

## Removing a Section

Simply set `enabled: false` in the sections array or remove it entirely.

## Available Sections

- **MainInvitation.astro** - Main invitation with date and time
- **EventLocation.astro** - Church and reception locations  
- **DetailsRSVP.astro** - Dress code and RSVP information
- **ThankYou.astro** - Thank you message (example new section)

## Section Guidelines

- Each section should be exactly **600px height** (`min-h-[600px]`)
- Use the **snap-start** class for smooth scrolling
- Include a **unique ID** starting with `section-`
- Follow the **existing design patterns** for consistency
- Use **semantic HTML** with proper accessibility attributes
- Include **decorative elements** sparingly to maintain visual balance

## Dynamic Features

The scroll manager automatically:
- Generates progress dots based on enabled sections
- Handles smooth scrolling between sections
- Updates active dot indicators
- Supports clicking dots to navigate
- Responds to mouse wheel for section navigation

This modular approach makes the invitation system highly maintainable and customizable! 